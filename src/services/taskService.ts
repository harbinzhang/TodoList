import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Task } from '../types';

const COLLECTION_NAME = 'tasks';

export const taskService = {
  // Create a new task
  async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    // Remove undefined values — Firestore does not accept them
    const cleanedData = Object.fromEntries(
      Object.entries(taskData).filter(([, v]) => v !== undefined)
    );
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...cleanedData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  // Update an existing task
  async updateTask(taskId: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<void> {
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    await updateDoc(taskRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  },

  // Delete a task
  async deleteTask(taskId: string): Promise<void> {
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    await deleteDoc(taskRef);
  },

  // Get all tasks for a user
  async getUserTasks(userId: string): Promise<Task[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      dueDate: doc.data().dueDate?.toDate(),
    } as Task));
  },

  // Subscribe to real-time updates for user tasks
  subscribeToUserTasks(userId: string, callback: (tasks: Task[]) => void): () => void {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const tasks = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        dueDate: doc.data().dueDate?.toDate(),
      } as Task));
      callback(tasks);
    });
  },

  // Toggle task completion
  async toggleTaskCompletion(taskId: string, completed: boolean): Promise<void> {
    await this.updateTask(taskId, { completed });
  },

  // Update task priority
  async updateTaskPriority(taskId: string, priority: 1 | 2 | 3 | 4): Promise<void> {
    await this.updateTask(taskId, { priority });
  },

  // Add a subtask to a task
  async addSubtask(taskId: string, title: string): Promise<void> {
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    const taskDoc = await getDoc(taskRef);
    if (!taskDoc.exists()) return;

    const currentSubtasks = taskDoc.data().subtasks || [];
    const newSubtask = {
      id: crypto.randomUUID(),
      title,
      completed: false,
    };

    await updateDoc(taskRef, {
      subtasks: [...currentSubtasks, newSubtask],
      updatedAt: serverTimestamp(),
    });
  },

  // Toggle a subtask's completion status
  async toggleSubtask(taskId: string, subtaskId: string): Promise<void> {
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    const taskDoc = await getDoc(taskRef);
    if (!taskDoc.exists()) return;

    const currentSubtasks = taskDoc.data().subtasks || [];
    const updatedSubtasks = currentSubtasks.map((st: { id: string; completed: boolean }) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    await updateDoc(taskRef, {
      subtasks: updatedSubtasks,
      updatedAt: serverTimestamp(),
    });
  },

  // Delete a subtask from a task
  async deleteSubtask(taskId: string, subtaskId: string): Promise<void> {
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    const taskDoc = await getDoc(taskRef);
    if (!taskDoc.exists()) return;

    const currentSubtasks = taskDoc.data().subtasks || [];
    const updatedSubtasks = currentSubtasks.filter((st: { id: string }) => st.id !== subtaskId);

    await updateDoc(taskRef, {
      subtasks: updatedSubtasks,
      updatedAt: serverTimestamp(),
    });
  },

  // Batch update sort order for multiple tasks
  async batchUpdateSortOrder(updates: { taskId: string; sortOrder: number }[]): Promise<void> {
    const batch = writeBatch(db);
    updates.forEach(({ taskId, sortOrder }) => {
      const taskRef = doc(db, COLLECTION_NAME, taskId);
      batch.update(taskRef, { sortOrder, updatedAt: serverTimestamp() });
    });
    await batch.commit();
  },
};