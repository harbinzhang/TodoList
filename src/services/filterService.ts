import {
  collection,
  doc,
  addDoc,
  getDocs,
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
import { cleanFirestoreData, mapFirestoreDocument, safeToDate } from '../firebase/firestoreUtils';

const COLLECTION_NAME = 'savedFilters';

function mapSavedFilter(id: string, data: Record<string, unknown>): SavedFilter {
  return mapFirestoreDocument<SavedFilter>(id, data, {
    createdAt: (value) => safeToDate(value) || new Date(),
  });
}

export const filterService = {
  // Create a new saved filter
  async createFilter(filterData: Omit<SavedFilter, 'id' | 'createdAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...cleanFirestoreData(filterData as Record<string, unknown>),
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  },

  // Update an existing filter
  async updateFilter(filterId: string, updates: Partial<Omit<SavedFilter, 'id' | 'createdAt'>>): Promise<void> {
    const filterRef = doc(db, COLLECTION_NAME, filterId);
    await updateDoc(filterRef, cleanFirestoreData(updates as Record<string, unknown>));
  },

  // Delete a filter
  async deleteFilter(filterId: string): Promise<void> {
    const filterRef = doc(db, COLLECTION_NAME, filterId);
    await deleteDoc(filterRef);
  },

  async getUserFilters(userId: string): Promise<SavedFilter[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('sortOrder', 'asc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((snapshot) => mapSavedFilter(snapshot.id, snapshot.data()));
  },

  // Subscribe to real-time updates for user's saved filters
  subscribeToUserFilters(userId: string, callback: (filters: SavedFilter[]) => void): () => void {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('sortOrder', 'asc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const filters = querySnapshot.docs.map((snapshot) =>
        mapSavedFilter(snapshot.id, snapshot.data())
      );
      callback(filters);
    });
  },
};
