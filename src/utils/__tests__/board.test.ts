import { describe, it, expect } from 'vitest';
import { getColumnDefs, groupTasksBySource, getDropFieldUpdate } from '../board';
import type { Task, Section } from '../../types';

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

const mockSections: Section[] = [
  { id: 's1', name: 'To Do', projectId: 'p1', userId: 'u1', sortOrder: 1, createdAt: new Date() },
  { id: 's2', name: 'In Progress', projectId: 'p1', userId: 'u1', sortOrder: 2, createdAt: new Date() },
  { id: 's3', name: 'Done', projectId: 'p1', userId: 'u1', sortOrder: 3, createdAt: new Date() },
];

describe('board utils', () => {
  describe('getColumnDefs', () => {
    it('returns section columns with "No section" first', () => {
      const defs = getColumnDefs('section', mockSections);
      expect(defs).toHaveLength(4); // No section + 3 sections
      expect(defs[0].id).toBe('__no_section__');
      expect(defs[0].title).toBe('No section');
      expect(defs[1].title).toBe('To Do');
    });

    it('returns 4 priority columns', () => {
      const defs = getColumnDefs('priority');
      expect(defs).toHaveLength(4);
      expect(defs[0].title).toBe('Priority 1');
      expect(defs[3].title).toBe('Priority 4');
    });

    it('returns 2 status columns', () => {
      const defs = getColumnDefs('status');
      expect(defs).toHaveLength(2);
      expect(defs[0].id).toBe('active');
      expect(defs[1].id).toBe('completed');
    });

    it('returns empty sections when no sections provided', () => {
      const defs = getColumnDefs('section');
      expect(defs).toHaveLength(1); // just "No section"
    });
  });

  describe('groupTasksBySource', () => {
    it('groups by section correctly', () => {
      const tasks = [
        makeTask({ sectionId: 's1' }),
        makeTask({ sectionId: 's2' }),
        makeTask({ sectionId: 's1' }),
        makeTask({}), // no section
      ];
      const columns = groupTasksBySource(tasks, 'section', mockSections);
      expect(columns).toHaveLength(4);
      expect(columns[0].tasks).toHaveLength(1); // No section
      expect(columns[1].tasks).toHaveLength(2); // To Do (s1)
      expect(columns[2].tasks).toHaveLength(1); // In Progress (s2)
      expect(columns[3].tasks).toHaveLength(0); // Done (s3)
    });

    it('groups by priority correctly', () => {
      const tasks = [
        makeTask({ priority: 1 }),
        makeTask({ priority: 1 }),
        makeTask({ priority: 3 }),
        makeTask({ priority: 4 }),
      ];
      const columns = groupTasksBySource(tasks, 'priority');
      expect(columns[0].tasks).toHaveLength(2); // P1
      expect(columns[1].tasks).toHaveLength(0); // P2
      expect(columns[2].tasks).toHaveLength(1); // P3
      expect(columns[3].tasks).toHaveLength(1); // P4
    });

    it('groups by status correctly', () => {
      const tasks = [
        makeTask({ completed: false }),
        makeTask({ completed: true }),
        makeTask({ completed: false }),
      ];
      const columns = groupTasksBySource(tasks, 'status');
      expect(columns[0].tasks).toHaveLength(2); // Active
      expect(columns[1].tasks).toHaveLength(1); // Completed
    });
  });

  describe('getDropFieldUpdate', () => {
    it('returns sectionId for section source', () => {
      expect(getDropFieldUpdate('section', 's1')).toEqual({ sectionId: 's1' });
      expect(getDropFieldUpdate('section', '__no_section__')).toEqual({ sectionId: undefined });
    });

    it('returns priority for priority source', () => {
      expect(getDropFieldUpdate('priority', 'p1')).toEqual({ priority: 1 });
      expect(getDropFieldUpdate('priority', 'p3')).toEqual({ priority: 3 });
    });

    it('returns completed for status source', () => {
      expect(getDropFieldUpdate('status', 'active')).toEqual({ completed: false });
      expect(getDropFieldUpdate('status', 'completed')).toEqual({ completed: true });
    });
  });
});
