import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { SavedFilter } from '../types';

const COLLECTION_NAME = 'savedFilters';

export const filterService = {
  // Create a new saved filter
  async createFilter(filterData: Omit<SavedFilter, 'id' | 'createdAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...filterData,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  },

  // Update an existing filter
  async updateFilter(filterId: string, updates: Partial<Omit<SavedFilter, 'id' | 'createdAt'>>): Promise<void> {
    const filterRef = doc(db, COLLECTION_NAME, filterId);
    await updateDoc(filterRef, updates);
  },

  // Delete a filter
  async deleteFilter(filterId: string): Promise<void> {
    const filterRef = doc(db, COLLECTION_NAME, filterId);
    await deleteDoc(filterRef);
  },

  // Subscribe to real-time updates for user's saved filters
  subscribeToUserFilters(userId: string, callback: (filters: SavedFilter[]) => void): () => void {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('sortOrder', 'asc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const filters = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      } as SavedFilter));
      callback(filters);
    });
  },
};
