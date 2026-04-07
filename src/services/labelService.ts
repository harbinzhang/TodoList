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
import { cleanFirestoreData, mapFirestoreDocument } from '../firebase/firestoreUtils';

const COLLECTION_NAME = 'labels';

function mapLabel(id: string, data: Record<string, unknown>): Label {
  return mapFirestoreDocument<Label>(id, data);
}

export const labelService = {
  // Create a new label
  async createLabel(labelData: Omit<Label, 'id'>): Promise<string> {
    const docRef = await addDoc(
      collection(db, COLLECTION_NAME),
      cleanFirestoreData(labelData as Record<string, unknown>)
    );
    return docRef.id;
  },

  // Update an existing label
  async updateLabel(labelId: string, updates: Partial<Omit<Label, 'id'>>): Promise<void> {
    const labelRef = doc(db, COLLECTION_NAME, labelId);
    await updateDoc(labelRef, cleanFirestoreData(updates as Record<string, unknown>));
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
    return querySnapshot.docs.map((snapshot) => mapLabel(snapshot.id, snapshot.data()));
  },

  // Subscribe to real-time updates for user labels
  subscribeToUserLabels(userId: string, callback: (labels: Label[]) => void): () => void {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('name', 'asc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const labels = querySnapshot.docs.map((snapshot) =>
        mapLabel(snapshot.id, snapshot.data())
      );
      callback(labels);
    });
  },
};
