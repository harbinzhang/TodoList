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
import { cleanFirestoreData, mapFirestoreDocument, safeToDate } from '../firebase/firestoreUtils';

const COLLECTION_NAME = 'tasks';
type TaskWrite = Partial<Omit<Task, 'id' | 'createdAt'>> & Record<string, unknown>;

function mapTask(id: string, data: Record<string, unknown>): Task {
  return mapFirestoreDocument<Task>(id, data, {
    createdAt: (value) => safeToDate(value) || new Date(),
    updatedAt: (value) => safeToDate(value) || new Date(),
    dueDate: safeToDate,
    completedAt: safeToDate,
    recurrence: (value) => {
      if (!value || typeof value !== 'object') return undefined;

      const recurrence = value as Record<string, unknown>;
      return cleanFirestoreData({
        ...recurrence,
        endDate: safeToDate(recurrence.endDate) || recurrence.endDate,
      });
    },
  });
}

export const taskService = {
  // Create a new task
  async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const cleanedData = cleanFirestoreData(taskData as Record<string, unknown>);
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...cleanedData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  // Update an existing task
  async updateTask(taskId: string, updates: TaskWrite): Promise<void> {
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    const sanitized = cleanFirestoreData(updates as Record<string, unknown>);
    await updateDoc(taskRef, {
      ...sanitized,
      updatedAt: serverTimestamp(),
    });
  },

  async clearTaskRecurrence(taskId: string): Promise<void> {
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    await updateDoc(taskRef, {
      recurrence: deleteField(),
      updatedAt: serverTimestamp(),
    });
  },

  async clearTaskSection(taskId: string): Promise<void> {
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    await updateDoc(taskRef, {
      sectionId: deleteField(),
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
    return querySnapshot.docs.map((snapshot) => mapTask(snapshot.id, snapshot.data()));
  },

  // Subscribe to real-time updates for user tasks
  subscribeToUserTasks(userId: string, callback: (tasks: Task[]) => void): () => void {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const tasks = querySnapshot.docs.map((snapshot) =>
        mapTask(snapshot.id, snapshot.data({ serverTimestamps: 'estimate' }))
      );
      // Deduplicate by ID (can happen briefly during batch writes)
      const seen = new Set<string>();
      const uniqueTasks = tasks.filter((task) => {
        if (seen.has(task.id)) return false;
        seen.add(task.id);
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

    const updatedRule = cleanFirestoreData({
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
