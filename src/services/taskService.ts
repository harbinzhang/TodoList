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
import type { Task } from '../types';

export const taskService = {
  // Create a new task
  async createTask(userId: string, taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<string> {
    // Remove undefined values to prevent Firebase errors
    const sanitizedData = Object.fromEntries(
      Object.entries(taskData).filter(([_, value]) => value !== undefined)
    );
    
    const docRef = await addDoc(collection(db, 'users', userId, 'tasks'), {
      ...sanitizedData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  // Update an existing task
  async updateTask(userId: string, taskId: string, updates: Partial<Omit<Task, 'id' | 'createdAt' | 'userId'>>): Promise<void> {
    const taskRef = doc(db, 'users', userId, 'tasks', taskId);
    // Remove undefined values to prevent Firebase errors
    const sanitizedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    
    await updateDoc(taskRef, {
      ...sanitizedUpdates,
      updatedAt: serverTimestamp(),
    });
  },

  // Delete a task
  async deleteTask(userId: string, taskId: string): Promise<void> {
    const taskRef = doc(db, 'users', userId, 'tasks', taskId);
    await deleteDoc(taskRef);
  },

  // Get all tasks for a user
  async getUserTasks(userId: string): Promise<Task[]> {
    const q = query(
      collection(db, 'users', userId, 'tasks'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      userId: userId, // Add userId back to the object
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      dueDate: doc.data().dueDate?.toDate(),
    } as Task));
  },

  // Subscribe to real-time updates for user tasks
  subscribeToUserTasks(userId: string, callback: (tasks: Task[]) => void): () => void {
    const q = query(
      collection(db, 'users', userId, 'tasks'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const tasks = querySnapshot.docs.map(doc => ({
        id: doc.id,
        userId: userId, // Add userId back to the object
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        dueDate: doc.data().dueDate?.toDate(),
      } as Task));
      callback(tasks);
    });
  },

  // Toggle task completion
  async toggleTaskCompletion(userId: string, taskId: string, completed: boolean): Promise<void> {
    await this.updateTask(userId, taskId, { completed });
  },

  // Update task priority
  async updateTaskPriority(userId: string, taskId: string, priority: 1 | 2 | 3 | 4): Promise<void> {
    await this.updateTask(userId, taskId, { priority });
  },
};