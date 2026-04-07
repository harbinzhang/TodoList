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
import type { Mindmap } from '../types';

const COLLECTION_NAME = 'mindmaps';
const NODES_COLLECTION = 'mindmapNodes';

export const mindmapService = {
  async createMindmap(
    data: Omit<Mindmap, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Auto-create root node
    await addDoc(collection(db, NODES_COLLECTION), {
      mindmapId: docRef.id,
      userId: data.userId,
      parentId: null,
      sortOrder: 0,
      title: data.name,
      completed: false,
      priority: 4,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  },

  async updateMindmap(
    mindmapId: string,
    updates: Partial<Omit<Mindmap, 'id' | 'createdAt'>>
  ): Promise<void> {
    const ref = doc(db, COLLECTION_NAME, mindmapId);
    await updateDoc(ref, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  },

  async deleteMindmap(mindmapId: string): Promise<void> {
    const batch = writeBatch(db);
    batch.delete(doc(db, COLLECTION_NAME, mindmapId));

    const nodesQuery = query(
      collection(db, NODES_COLLECTION),
      where('mindmapId', '==', mindmapId)
    );
    const snapshot = await getDocs(nodesQuery);
    snapshot.docs.forEach((d) => batch.delete(d.ref));

    await batch.commit();
  },

  async getUserMindmaps(userId: string): Promise<Mindmap[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate() || new Date(),
      updatedAt: d.data().updatedAt?.toDate() || new Date(),
    })) as Mindmap[];
  },

  subscribeToUserMindmaps(
    userId: string,
    callback: (mindmaps: Mindmap[]) => void
  ): () => void {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const mindmaps = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate() || new Date(),
        updatedAt: d.data().updatedAt?.toDate() || new Date(),
      })) as Mindmap[];
      callback(mindmaps);
    });
  },
};
