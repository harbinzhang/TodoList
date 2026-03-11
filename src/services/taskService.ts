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
import { getNextDueDate, isRecurrenceComplete } from '../utils/recurrence';

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
        completedAt: doc.data().completedAt?.toDate(),
        recurrence: doc.data().recurrence ? {
          ...doc.data().recurrence,
          endDate: doc.data().recurrence.endDate?.toDate?.() || doc.data().recurrence.endDate,
        } : undefined,
      } as Task));
      callback(tasks);
    });
  },

  // Toggle task completion
  async toggleTaskCompletion(taskId: string, completed: boolean): Promise<void> {
    await this.updateTask(taskId, {
      completed,
      completedAt: completed ? new Date() : undefined,
    } as Partial<Omit<Task, 'id' | 'createdAt'>>);
  },

  // Complete a recurring task: mark current done + create next instance
  async completeRecurringTask(task: Task): Promise<void> {
    if (!task.recurrence || !task.dueDate) {
      // Fallback: just toggle
      await this.toggleTaskCompletion(task.id, true);
      return;
    }

    const updatedRule = {
      ...task.recurrence,
      completedCount: (task.recurrence.completedCount || 0) + 1,
    };

    const batch = writeBatch(db);

    // 1. Mark current task as completed
    const currentRef = doc(db, COLLECTION_NAME, task.id);
    batch.update(currentRef, {
      completed: true,
      completedAt: new Date(),
      recurrence: updatedRule,
      updatedAt: serverTimestamp(),
    });

    // 2. Check if recurrence should continue
    const ruleForCheck = { ...updatedRule };
    if (!isRecurrenceComplete(ruleForCheck)) {
      const nextDue = getNextDueDate(task.dueDate, task.recurrence);
      if (nextDue) {
        // Create the next instance
        const nextTaskData: Record<string, unknown> = {
          title: task.title,
          description: task.description || null,
          completed: false,
          priority: task.priority,
          dueDate: nextDue,
          userId: task.userId,
          projectId: task.projectId || null,
          sectionId: task.sectionId || null,
          labels: task.labels,
          subtasks: task.subtasks.map(st => ({ ...st, completed: false })),
          recurrence: updatedRule,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        // Remove null/undefined values
        const cleanedData = Object.fromEntries(
          Object.entries(nextTaskData).filter(([, v]) => v !== undefined && v !== null)
        );
        const nextRef = doc(collection(db, COLLECTION_NAME));
        batch.set(nextRef, cleanedData);
      }
    }

    await batch.commit();
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