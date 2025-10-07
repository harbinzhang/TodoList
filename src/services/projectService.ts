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
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Project } from '../types';

export const projectService = {
  // Create a new project
  async createProject(userId: string, projectData: Omit<Project, 'id' | 'createdAt' | 'taskCount' | 'userId'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'users', userId, 'projects'), {
      ...projectData,
      createdAt: serverTimestamp(),
      taskCount: 0,
    });
    return docRef.id;
  },

  // Update an existing project
  async updateProject(userId: string, projectId: string, updates: Partial<Omit<Project, 'id' | 'createdAt' | 'userId'>>): Promise<void> {
    const projectRef = doc(db, 'users', userId, 'projects', projectId);
    await updateDoc(projectRef, updates);
  },

  // Delete a project
  async deleteProject(userId: string, projectId: string): Promise<void> {
    const projectRef = doc(db, 'users', userId, 'projects', projectId);
    await deleteDoc(projectRef);
  },

  // Get all projects for a user
  async getUserProjects(userId: string): Promise<Project[]> {
    const q = query(
      collection(db, 'users', userId, 'projects'),
      orderBy('createdAt', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      userId: userId, // Add userId back to the object
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    } as Project));
  },

  // Subscribe to real-time updates for user projects
  subscribeToUserProjects(userId: string, callback: (projects: Project[]) => void): () => void {
    const q = query(
      collection(db, 'users', userId, 'projects'),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const projects = querySnapshot.docs.map(doc => ({
        id: doc.id,
        userId: userId, // Add userId back to the object
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      } as Project));
      callback(projects);
    });
  },

  // Update project task count
  async updateTaskCount(userId: string, projectId: string, taskCount: number): Promise<void> {
    await this.updateProject(userId, projectId, { taskCount });
  },
};