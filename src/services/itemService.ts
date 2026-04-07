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
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));
}

function mapItem(id: string, data: Record<string, unknown>): Item {
  return {
    id,
    ...data,
    createdAt:
      data.createdAt && typeof (data.createdAt as { toDate?: () => Date }).toDate === 'function'
        ? (data.createdAt as { toDate: () => Date }).toDate()
        : new Date(),
    updatedAt:
      data.updatedAt && typeof (data.updatedAt as { toDate?: () => Date }).toDate === 'function'
        ? (data.updatedAt as { toDate: () => Date }).toDate()
        : new Date(),
  } as Item;
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
    await updateDoc(doc(db, COLLECTIONS[ctx], itemId), {
      ...stripUndefined(updates as Record<string, unknown>),
      updatedAt: serverTimestamp(),
    });
  },

  async delete(ctx: ItemContext, itemId: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS[ctx], itemId));
  },

  async toggleCompletion(ctx: ItemContext, itemId: string, completed: boolean): Promise<void> {
    await this.update(ctx, itemId, { completed });
  },

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
      callback(snapshot.docs.map((docSnapshot) => mapItem(docSnapshot.id, docSnapshot.data())));
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
    return snapshot.docs.map((docSnapshot) => mapItem(docSnapshot.id, docSnapshot.data()));
  },
};
