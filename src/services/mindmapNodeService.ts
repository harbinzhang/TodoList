import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { MindmapNode } from '../types';

const COLLECTION_NAME = 'mindmapNodes';

export const mindmapNodeService = {
  async createNode(
    data: Omit<MindmapNode, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async updateNode(
    nodeId: string,
    updates: Partial<Omit<MindmapNode, 'id' | 'createdAt'>>
  ): Promise<void> {
    const ref = doc(db, COLLECTION_NAME, nodeId);
    await updateDoc(ref, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  },

  async deleteNode(
    nodeId: string,
    allNodes: MindmapNode[],
    strategy: 'reparent' | 'cascade' = 'cascade'
  ): Promise<void> {
    const node = allNodes.find((n) => n.id === nodeId);
    if (!node) return;

    const batch = writeBatch(db);

    if (strategy === 'reparent') {
      const children = allNodes.filter((n) => n.parentId === nodeId);
      children.forEach((child) => {
        batch.update(doc(db, COLLECTION_NAME, child.id), {
          parentId: node.parentId,
          updatedAt: serverTimestamp(),
        });
      });
      batch.delete(doc(db, COLLECTION_NAME, nodeId));
    } else {
      const idsToDelete = this.getDescendantIds(nodeId, allNodes);
      idsToDelete.push(nodeId);
      idsToDelete.forEach((id) => {
        batch.delete(doc(db, COLLECTION_NAME, id));
      });
    }

    await batch.commit();
  },

  getDescendantIds(nodeId: string, allNodes: MindmapNode[]): string[] {
    const children = allNodes.filter((n) => n.parentId === nodeId);
    const ids: string[] = [];
    for (const child of children) {
      ids.push(child.id);
      ids.push(...this.getDescendantIds(child.id, allNodes));
    }
    return ids;
  },

  async toggleNodeCompletion(
    nodeId: string,
    completed: boolean
  ): Promise<void> {
    await this.updateNode(nodeId, { completed });
  },

  async moveNode(
    nodeId: string,
    newParentId: string | null,
    newSortOrder: number,
    affectedSiblings: Array<{ id: string; sortOrder: number }>
  ): Promise<void> {
    const batch = writeBatch(db);
    batch.update(doc(db, COLLECTION_NAME, nodeId), {
      parentId: newParentId,
      sortOrder: newSortOrder,
      updatedAt: serverTimestamp(),
    });
    affectedSiblings.forEach(({ id, sortOrder }) => {
      batch.update(doc(db, COLLECTION_NAME, id), {
        sortOrder,
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  },

  async getMindmapNodes(mindmapId: string, userId: string): Promise<MindmapNode[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('mindmapId', '==', mindmapId),
      where('userId', '==', userId),
      orderBy('sortOrder', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate() || new Date(),
      updatedAt: d.data().updatedAt?.toDate() || new Date(),
    })) as MindmapNode[];
  },

  subscribeToMindmapNodes(
    mindmapId: string,
    userId: string,
    callback: (nodes: MindmapNode[]) => void
  ): () => void {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('mindmapId', '==', mindmapId),
      where('userId', '==', userId),
      orderBy('sortOrder', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
      const nodes = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate() || new Date(),
        updatedAt: d.data().updatedAt?.toDate() || new Date(),
      })) as MindmapNode[];
      callback(nodes);
    });
  },
};
