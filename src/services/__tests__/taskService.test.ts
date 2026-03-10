import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addDoc, updateDoc, deleteDoc, getDocs, onSnapshot } from 'firebase/firestore';
import { taskService } from '../taskService';

vi.mock('../taskService', async () => {
  const actual = await vi.importActual('../taskService');
  return actual;
});

describe('taskService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTask', () => {
    it('calls addDoc with task data and server timestamps', async () => {
      const mockDocRef = { id: 'new-task-id' };
      vi.mocked(addDoc).mockResolvedValue(mockDocRef as never);

      const taskData = {
        title: 'Test Task',
        completed: false,
        priority: 1 as const,
        userId: 'user1',
        labels: [],
        subtasks: [],
      };

      const result = await taskService.createTask(taskData);

      expect(addDoc).toHaveBeenCalledOnce();
      expect(result).toBe('new-task-id');

      const callArgs = vi.mocked(addDoc).mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs.title).toBe('Test Task');
      expect(callArgs.createdAt).toBeDefined();
      expect(callArgs.updatedAt).toBeDefined();
    });
  });

  describe('updateTask', () => {
    it('calls updateDoc with updates and server timestamp', async () => {
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      await taskService.updateTask('task-1', { title: 'Updated' });

      expect(updateDoc).toHaveBeenCalledOnce();
    });
  });

  describe('deleteTask', () => {
    it('calls deleteDoc with the correct task ref', async () => {
      vi.mocked(deleteDoc).mockResolvedValue(undefined);

      await taskService.deleteTask('task-1');

      expect(deleteDoc).toHaveBeenCalledOnce();
    });
  });

  describe('getUserTasks', () => {
    it('returns tasks with Date objects for timestamps', async () => {
      const mockDate = new Date('2025-01-01');
      const mockDocs = [
        {
          id: 'task-1',
          data: () => ({
            title: 'Task 1',
            completed: false,
            priority: 1,
            userId: 'user1',
            labels: [],
            subtasks: [],
            createdAt: { toDate: () => mockDate },
            updatedAt: { toDate: () => mockDate },
            dueDate: { toDate: () => mockDate },
          }),
        },
      ];
      vi.mocked(getDocs).mockResolvedValue({ docs: mockDocs } as never);

      const tasks = await taskService.getUserTasks('user1');

      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('task-1');
      expect(tasks[0].createdAt).toEqual(mockDate);
      expect(tasks[0].updatedAt).toEqual(mockDate);
      expect(tasks[0].dueDate).toEqual(mockDate);
    });

    it('uses fallback dates when timestamps are null', async () => {
      const mockDocs = [
        {
          id: 'task-1',
          data: () => ({
            title: 'Task 1',
            completed: false,
            priority: 1,
            userId: 'user1',
            labels: [],
            subtasks: [],
            createdAt: null,
            updatedAt: null,
            dueDate: null,
          }),
        },
      ];
      vi.mocked(getDocs).mockResolvedValue({ docs: mockDocs } as never);

      const tasks = await taskService.getUserTasks('user1');

      expect(tasks[0].createdAt).toBeInstanceOf(Date);
      expect(tasks[0].updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('subscribeToUserTasks', () => {
    it('calls onSnapshot and returns an unsubscribe function', () => {
      const mockUnsubscribe = vi.fn();
      vi.mocked(onSnapshot).mockReturnValue(mockUnsubscribe as never);

      const callback = vi.fn();
      const unsub = taskService.subscribeToUserTasks('user1', callback);

      expect(onSnapshot).toHaveBeenCalledOnce();
      expect(unsub).toBe(mockUnsubscribe);
    });
  });

  describe('toggleTaskCompletion', () => {
    it('calls updateTask with completed status', async () => {
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      await taskService.toggleTaskCompletion('task-1', true);

      expect(updateDoc).toHaveBeenCalledOnce();
    });
  });
});
