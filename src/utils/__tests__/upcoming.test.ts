import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { groupTasksByDay, getOverdueTasks, getUndatedTasks, getDateRange } from '../upcoming';
import type { Task } from '../../types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: Math.random().toString(36).slice(2),
    title: 'Test task',
    completed: false,
    priority: 4 as const,
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
    userId: 'user1',
    labels: [],
    subtasks: [],
    ...overrides,
  };
}

describe('upcoming utils', () => {
  // Fix "today" so tests are deterministic
  const realNow = new Date(2026, 2, 11, 12, 0, 0); // March 11, 2026 noon

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(realNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getDateRange', () => {
    it('returns 7-day range', () => {
      const { start, end } = getDateRange(7);
      expect(start.getDate()).toBe(11);
      expect(end.getDate()).toBe(17);
    });

    it('returns 14-day range', () => {
      const { start, end } = getDateRange(14);
      expect(start.getDate()).toBe(11);
      expect(end.getDate()).toBe(24);
    });

    it('returns 30-day range', () => {
      const { start, end } = getDateRange(30);
      expect(start.getDate()).toBe(11);
      // 30 days from March 11 = April 9
      expect(end.getMonth()).toBe(3); // April
      expect(end.getDate()).toBe(9);
    });
  });

  describe('getOverdueTasks', () => {
    it('finds overdue tasks', () => {
      const tasks = [
        makeTask({ dueDate: new Date(2026, 2, 9), completed: false }), // overdue
        makeTask({ dueDate: new Date(2026, 2, 12), completed: false }), // future
        makeTask({ dueDate: new Date(2026, 2, 9), completed: true }), // overdue but completed
      ];
      const result = getOverdueTasks(tasks);
      expect(result).toHaveLength(1);
    });

    it('returns empty when no overdue tasks', () => {
      const tasks = [
        makeTask({ dueDate: new Date(2026, 2, 12), completed: false }),
      ];
      expect(getOverdueTasks(tasks)).toHaveLength(0);
    });

    it('sorts most overdue first', () => {
      const tasks = [
        makeTask({ id: 'recent', dueDate: new Date(2026, 2, 10) }),
        makeTask({ id: 'oldest', dueDate: new Date(2026, 2, 5) }),
        makeTask({ id: 'middle', dueDate: new Date(2026, 2, 8) }),
      ];
      const result = getOverdueTasks(tasks);
      expect(result.map((t) => t.id)).toEqual(['oldest', 'middle', 'recent']);
    });
  });

  describe('getUndatedTasks', () => {
    it('returns tasks with no dueDate', () => {
      const tasks = [
        makeTask({ dueDate: undefined }),
        makeTask({ dueDate: new Date(2026, 2, 12) }),
        makeTask({ dueDate: undefined, completed: true }), // completed
      ];
      const result = getUndatedTasks(tasks);
      expect(result).toHaveLength(1);
    });
  });

  describe('groupTasksByDay', () => {
    it('creates correct number of day groups for 7-day scope', () => {
      const result = groupTasksByDay([], 7);
      expect(result).toHaveLength(7);
    });

    it('includes today as the first group', () => {
      const result = groupTasksByDay([], 7);
      expect(result[0].isToday).toBe(true);
      expect(result[0].dateKey).toBe('2026-03-11');
    });

    it('groups tasks into correct days', () => {
      const tasks = [
        makeTask({ dueDate: new Date(2026, 2, 11, 10, 0) }),
        makeTask({ dueDate: new Date(2026, 2, 11, 15, 0) }),
        makeTask({ dueDate: new Date(2026, 2, 13, 9, 0) }),
      ];
      const result = groupTasksByDay(tasks, 7);
      const todayGroup = result.find((g) => g.dateKey === '2026-03-11');
      expect(todayGroup?.tasks).toHaveLength(2);

      const laterGroup = result.find((g) => g.dateKey === '2026-03-13');
      expect(laterGroup?.tasks).toHaveLength(1);
    });

    it('empty days have zero tasks', () => {
      const result = groupTasksByDay([], 7);
      result.forEach((group) => {
        expect(group.tasks).toHaveLength(0);
      });
    });

    it('excludes completed tasks', () => {
      const tasks = [
        makeTask({ dueDate: new Date(2026, 2, 11), completed: true }),
        makeTask({ dueDate: new Date(2026, 2, 11), completed: false }),
      ];
      const result = groupTasksByDay(tasks, 7);
      const todayGroup = result.find((g) => g.dateKey === '2026-03-11');
      expect(todayGroup?.tasks).toHaveLength(1);
    });
  });
});
