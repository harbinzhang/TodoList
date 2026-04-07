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
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Project } from '../types';
import { cleanFirestoreData, mapFirestoreDocument, safeToDate } from '../firebase/firestoreUtils';

const COLLECTION_NAME = 'projects';

function mapProject(id: string, data: Record<string, unknown>): Project {
  return mapFirestoreDocument<Project>(id, data, {
    createdAt: (value) => safeToDate(value) || new Date(),
  });
}

export const projectService = {
  // Create a new project
  async createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'taskCount'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...cleanFirestoreData(projectData as Record<string, unknown>),
      createdAt: serverTimestamp(),
      taskCount: 0,
    });
    return docRef.id;
  },

  // Update an existing project
  async updateProject(projectId: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<void> {
    const projectRef = doc(db, COLLECTION_NAME, projectId);
    await updateDoc(projectRef, cleanFirestoreData(updates as Record<string, unknown>));
  },

  // Delete a project
  async deleteProject(projectId: string): Promise<void> {
    const projectRef = doc(db, COLLECTION_NAME, projectId);
    await deleteDoc(projectRef);
  },

  // Get all projects for a user
  async getUserProjects(userId: string): Promise<Project[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('createdAt', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((snapshot) => mapProject(snapshot.id, snapshot.data()));
  },

  // Subscribe to real-time updates for user projects
  subscribeToUserProjects(userId: string, callback: (projects: Project[]) => void): () => void {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const projects = querySnapshot.docs.map((snapshot) =>
        mapProject(snapshot.id, snapshot.data())
      );
      callback(projects);
    });
  },

  // Update project task count
  async updateTaskCount(projectId: string, taskCount: number): Promise<void> {
    await this.updateProject(projectId, { taskCount });
  },
};
