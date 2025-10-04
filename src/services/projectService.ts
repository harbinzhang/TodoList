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

const COLLECTION_NAME = 'projects';

export const projectService = {
  // Create a new project
  async createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'taskCount'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...projectData,
      createdAt: serverTimestamp(),
      taskCount: 0,
    });
    return docRef.id;
  },

  // Update an existing project
  async updateProject(projectId: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<void> {
    const projectRef = doc(db, COLLECTION_NAME, projectId);
    await updateDoc(projectRef, updates);
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
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    } as Project));
  },

  // Subscribe to real-time updates for user projects
  subscribeToUserProjects(userId: string, callback: (projects: Project[]) => void): () => void {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const projects = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      } as Project));
      callback(projects);
    });
  },

  // Update project task count
  async updateTaskCount(projectId: string, taskCount: number): Promise<void> {
    await this.updateProject(projectId, { taskCount });
  },
};