import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Item } from '../types';

const COLLECTIONS = {
  task: 'tasks',
  mindmap: 'mindmapNodes',
} as const;

export type ItemContext = keyof typeof COLLECTIONS;

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export const itemService = {
  async create(
    ctx: ItemContext,
    data: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS[ctx]), {
      ...stripUndefined(data as Record<string, unknown>),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async createWithId(
    ctx: ItemContext,
    id: string,
    data: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    await setDoc(doc(db, COLLECTIONS[ctx], id), {
      ...stripUndefined(data as Record<string, unknown>),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  async update(
    ctx: ItemContext,
    itemId: string,
    updates: Partial<Omit<Item, 'id' | 'createdAt'>>
  ): Promise<void> {
    const ref = doc(db, COLLECTIONS[ctx], itemId);
    await updateDoc(ref, {
      ...stripUndefined(updates as Record<string, unknown>),
      updatedAt: serverTimestamp(),
    });
  },

  async delete(ctx: ItemContext, itemId: string): Promise<void> {
    const ref = doc(db, COLLECTIONS[ctx], itemId);
    await deleteDoc(ref);
  },

  async toggleCompletion(
    ctx: ItemContext,
    itemId: string,
    completed: boolean
  ): Promise<void> {
    await this.update(ctx, itemId, { completed });
  },

  async updatePriority(
    ctx: ItemContext,
    itemId: string,
    priority: 1 | 2 | 3 | 4
  ): Promise<void> {
    await this.update(ctx, itemId, { priority });
  },

  // Task-specific queries
  subscribeToUserTasks(
    userId: string,
    callback: (items: Item[]) => void
  ): () => void {
    const q = query(
      collection(db, COLLECTIONS.task),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate() || new Date(),
        updatedAt: d.data().updatedAt?.toDate() || new Date(),
        dueDate: d.data().dueDate?.toDate(),
      })) as Item[];
      callback(items);
    });
  },

  async getUserTasks(userId: string): Promise<Item[]> {
    const q = query(
      collection(db, COLLECTIONS.task),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate() || new Date(),
      updatedAt: d.data().updatedAt?.toDate() || new Date(),
      dueDate: d.data().dueDate?.toDate(),
    })) as Item[];
  },

  // Mindmap-specific queries
  subscribeToMindmapNodes(
    mindmapId: string,
    userId: string,
    callback: (items: Item[]) => void
  ): () => void {
    const q = query(
      collection(db, COLLECTIONS.mindmap),
      where('mindmapId', '==', mindmapId),
      where('userId', '==', userId),
      orderBy('sortOrder', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate() || new Date(),
        updatedAt: d.data().updatedAt?.toDate() || new Date(),
      })) as Item[];
      callback(items);
    });
  },

  async getMindmapNodes(mindmapId: string, userId: string): Promise<Item[]> {
    const q = query(
      collection(db, COLLECTIONS.mindmap),
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
    })) as Item[];
  },
};
