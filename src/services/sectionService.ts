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
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Section } from '../types';
import { taskService } from './taskService';

const COLLECTION_NAME = 'sections';

export const sectionService = {
  // Create a new section
  async createSection(sectionData: Omit<Section, 'id' | 'createdAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...sectionData,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  },

  // Update section name or sortOrder
  async updateSection(sectionId: string, updates: Partial<Pick<Section, 'name' | 'sortOrder'>>): Promise<void> {
    const sectionRef = doc(db, COLLECTION_NAME, sectionId);
    await updateDoc(sectionRef, updates);
  },

  // Delete a section and clear sectionId from its tasks
  async deleteSection(sectionId: string, _projectId: string, userId: string): Promise<void> {
    // Find all tasks in this section and clear their sectionId
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('userId', '==', userId),
      where('sectionId', '==', sectionId)
    );
    const tasksSnapshot = await getDocs(tasksQuery);
    const clearPromises = tasksSnapshot.docs.map(taskDoc =>
      taskService.updateTask(taskDoc.id, { sectionId: undefined } as any)
    );
    await Promise.all(clearPromises);

    // Delete the section
    const sectionRef = doc(db, COLLECTION_NAME, sectionId);
    await deleteDoc(sectionRef);
  },

  // Subscribe to real-time sections for a user (all projects)
  subscribeToUserSections(userId: string, callback: (sections: Section[]) => void): () => void {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('sortOrder', 'asc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const sections = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      } as Section));
      callback(sections);
    });
  },
};
