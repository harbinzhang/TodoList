import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Label } from '../types';

const COLLECTION_NAME = 'labels';

export const labelService = {
  // Create a new label
  async createLabel(labelData: Omit<Label, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), labelData);
    return docRef.id;
  },

  // Update an existing label
  async updateLabel(labelId: string, updates: Partial<Omit<Label, 'id'>>): Promise<void> {
    const labelRef = doc(db, COLLECTION_NAME, labelId);
    await updateDoc(labelRef, updates);
  },

  // Delete a label
  async deleteLabel(labelId: string): Promise<void> {
    const labelRef = doc(db, COLLECTION_NAME, labelId);
    await deleteDoc(labelRef);
  },

  // Get all labels for a user
  async getUserLabels(userId: string): Promise<Label[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('name', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Label));
  },

  // Subscribe to real-time updates for user labels
  subscribeToUserLabels(userId: string, callback: (labels: Label[]) => void): () => void {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('name', 'asc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const labels = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Label));
      callback(labels);
    });
  },
};