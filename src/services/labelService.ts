import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Label } from '../types';

export const labelService = {
  // Create a new label
  async createLabel(userId: string, labelData: Omit<Label, 'id' | 'userId'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'users', userId, 'labels'), labelData);
    return docRef.id;
  },

  // Update an existing label
  async updateLabel(userId: string, labelId: string, updates: Partial<Omit<Label, 'id' | 'userId'>>): Promise<void> {
    const labelRef = doc(db, 'users', userId, 'labels', labelId);
    await updateDoc(labelRef, updates);
  },

  // Delete a label
  async deleteLabel(userId: string, labelId: string): Promise<void> {
    const labelRef = doc(db, 'users', userId, 'labels', labelId);
    await deleteDoc(labelRef);
  },

  // Get all labels for a user
  async getUserLabels(userId: string): Promise<Label[]> {
    const q = query(
      collection(db, 'users', userId, 'labels'),
      orderBy('name', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      userId: userId, // Add userId back to the object
      ...doc.data(),
    } as Label));
  },

  // Subscribe to real-time updates for user labels
  subscribeToUserLabels(userId: string, callback: (labels: Label[]) => void): () => void {
    const q = query(
      collection(db, 'users', userId, 'labels'),
      orderBy('name', 'asc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const labels = querySnapshot.docs.map(doc => ({
        id: doc.id,
        userId: userId, // Add userId back to the object
        ...doc.data(),
      } as Label));
      callback(labels);
    });
  },
};