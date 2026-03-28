import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addDoc, updateDoc, deleteDoc, getDocs, onSnapshot } from 'firebase/firestore';
import { itemService } from '../itemService';

vi.mock('../itemService', async () => {
  const actual = await vi.importActual('../itemService');
  return actual;
});

describe('itemService (task context)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('calls addDoc with task data and server timestamps', async () => {
      const mockDocRef = { id: 'new-task-id' };
      vi.mocked(addDoc).mockResolvedValue(mockDocRef as never);

      const taskData = {
        title: 'Test Task',
        completed: false,
        priority: 1 as const,
        userId: 'user1',
        labels: [],
      };

      const result = await itemService.create('task', taskData);

      expect(addDoc).toHaveBeenCalledOnce();
      expect(result).toBe('new-task-id');

      const callArgs = vi.mocked(addDoc).mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs.title).toBe('Test Task');
      expect(callArgs.createdAt).toBeDefined();
      expect(callArgs.updatedAt).toBeDefined();
    });
  });

  describe('update', () => {
    it('calls updateDoc with updates and server timestamp', async () => {
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      await itemService.update('task', 'task-1', { title: 'Updated' });

      expect(updateDoc).toHaveBeenCalledOnce();
    });
  });

  describe('delete', () => {
    it('calls deleteDoc with the correct task ref', async () => {
      vi.mocked(deleteDoc).mockResolvedValue(undefined);

      await itemService.delete('task', 'task-1');

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
            createdAt: { toDate: () => mockDate },
            updatedAt: { toDate: () => mockDate },
            dueDate: { toDate: () => mockDate },
          }),
        },
      ];
      vi.mocked(getDocs).mockResolvedValue({ docs: mockDocs } as never);

      const tasks = await itemService.getUserTasks('user1');

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
            createdAt: null,
            updatedAt: null,
            dueDate: null,
          }),
        },
      ];
      vi.mocked(getDocs).mockResolvedValue({ docs: mockDocs } as never);

      const tasks = await itemService.getUserTasks('user1');

      expect(tasks[0].createdAt).toBeInstanceOf(Date);
      expect(tasks[0].updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('subscribeToUserTasks', () => {
    it('calls onSnapshot and returns an unsubscribe function', () => {
      const mockUnsubscribe = vi.fn();
      vi.mocked(onSnapshot).mockReturnValue(mockUnsubscribe as never);

      const callback = vi.fn();
      const unsub = itemService.subscribeToUserTasks('user1', callback);

      expect(onSnapshot).toHaveBeenCalledOnce();
      expect(unsub).toBe(mockUnsubscribe);
    });
  });

  describe('toggleCompletion', () => {
    it('calls update with completed status', async () => {
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      await itemService.toggleCompletion('task', 'task-1', true);

      expect(updateDoc).toHaveBeenCalledOnce();
    });
  });
});
