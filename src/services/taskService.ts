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
  deleteField,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Task } from '../types';
import { getNextDueDate, isRecurrenceComplete } from '../utils/recurrence';

// Strip undefined values from an object (Firestore rejects them)
// Only recurses into plain objects — skips Date, Array, FieldValue sentinels, etc.
function cleanObject<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [
        k,
        v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype
          ? cleanObject(v as Record<string, unknown>)
          : v,
      ])
  ) as T;
}

// Safely convert any Firestore timestamp-like value to a Date
// Handles: Firestore Timestamp, corrupted objects with seconds, Date, string, number
function safeToDate(val: unknown): Date | undefined {
  if (!val) return undefined;
  if (val instanceof Date) return val;
  if (typeof val === 'object' && 'toDate' in val && typeof (val as { toDate: unknown }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate();
  }
  // Handle corrupted Timestamp objects (plain objects with seconds field)
  if (typeof val === 'object' && ('seconds' in val || '_seconds' in val)) {
    const seconds = (val as Record<string, number>).seconds ?? (val as Record<string, number>)._seconds;
    return new Date(seconds * 1000);
  }
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return undefined;
}

const COLLECTION_NAME = 'tasks';

export const taskService = {
  // Create a new task
  async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const cleanedData = cleanObject(taskData as Record<string, unknown>);
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
    // Sanitize: strip undefined values (Firestore rejects them)
    const sanitized = cleanObject(updates as Record<string, unknown>);
    await updateDoc(taskRef, {
      ...sanitized,
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
      const tasks = querySnapshot.docs.map(doc => {
        const data = doc.data({ serverTimestamps: 'estimate' });
        return {
          id: doc.id,
          ...data,
          createdAt: safeToDate(data.createdAt) || new Date(),
          updatedAt: safeToDate(data.updatedAt) || new Date(),
          dueDate: safeToDate(data.dueDate),
          completedAt: safeToDate(data.completedAt),
          recurrence: data.recurrence ? {
            ...data.recurrence,
            endDate: safeToDate(data.recurrence.endDate) || data.recurrence.endDate,
          } : undefined,
        } as Task;
      });
      // Deduplicate by ID (can happen briefly during batch writes)
      const seen = new Set<string>();
      const uniqueTasks = tasks.filter(t => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });
      callback(uniqueTasks);
    });
  },

  // Toggle task completion
  async toggleTaskCompletion(taskId: string, completed: boolean): Promise<void> {
    await this.updateTask(taskId, {
      completed,
      completedAt: completed ? new Date() : deleteField(),
    } as Partial<Omit<Task, 'id' | 'createdAt'>>);
  },

  // Complete a recurring task: shift due date to next occurrence (Todoist pattern)
  async completeRecurringTask(task: Task): Promise<void> {
    if (!task.recurrence || !task.dueDate) {
      await this.toggleTaskCompletion(task.id, true);
      return;
    }

    const updatedRule = cleanObject({
      ...task.recurrence,
      completedCount: (task.recurrence.completedCount || 0) + 1,
    });

    // Check if recurrence is done
    if (isRecurrenceComplete(updatedRule)) {
      // No more recurrences — mark as permanently completed
      await this.updateTask(task.id, {
        completed: true,
        completedAt: new Date(),
        recurrence: updatedRule,
      } as Partial<Omit<Task, 'id' | 'createdAt'>>);
      return;
    }

    // Shift to next due date on the same document
    const nextDue = getNextDueDate(task.dueDate, task.recurrence);
    if (!nextDue) {
      await this.toggleTaskCompletion(task.id, true);
      return;
    }

    await this.updateTask(task.id, {
      dueDate: nextDue,
      completed: false,
      recurrence: updatedRule,
      subtasks: task.subtasks.map(st => ({ ...st, completed: false })),
    } as Partial<Omit<Task, 'id' | 'createdAt'>>);
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