import {
  doc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Item } from '../types';

const COLLECTION_NAME = 'mindmapNodes';

export const treeService = {
  getDescendantIds(nodeId: string, allNodes: Item[]): string[] {
    const children = allNodes.filter((n) => n.parentId === nodeId);
    const ids: string[] = [];
    for (const child of children) {
      ids.push(child.id);
      ids.push(...this.getDescendantIds(child.id, allNodes));
    }
    return ids;
  },

  async deleteNode(
    nodeId: string,
    allNodes: Item[],
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
};
