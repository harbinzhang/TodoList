import { describe, it, expect } from 'vitest';
import { applyFilters } from '../filterEngine';
import type { Task, FilterCondition, Project, Label } from '../../types';

const now = new Date();
const yesterday = new Date(now);
yesterday.setDate(yesterday.getDate() - 1);
const nextWeek = new Date(now);
nextWeek.setDate(nextWeek.getDate() + 5);
const lastWeek = new Date(now);
lastWeek.setDate(lastWeek.getDate() - 10);

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Test Task',
    completed: false,
    priority: 4,
    createdAt: now,
    updatedAt: now,
    userId: 'user-1',
    labels: [],
    subtasks: [],
    ...overrides,
  };
}

const emptyContext = { projects: [] as Project[], labels: [] as Label[] };

describe('applyFilters', () => {
  it('returns all tasks when no conditions', () => {
    const tasks = [makeTask()];
    expect(applyFilters(tasks, [], emptyContext)).toHaveLength(1);
  });

  it('filters by priority is', () => {
    const tasks = [
      makeTask({ id: '1', priority: 1 }),
      makeTask({ id: '2', priority: 3 }),
      makeTask({ id: '3', priority: 1 }),
    ];
    const conditions: FilterCondition[] = [
      { field: 'priority', operator: 'is', value: 1 },
    ];
    const result = applyFilters(tasks, conditions, emptyContext);
    expect(result).toHaveLength(2);
    expect(result.every(t => t.priority === 1)).toBe(true);
  });

  it('filters by priority isNot', () => {
    const tasks = [
      makeTask({ id: '1', priority: 1 }),
      makeTask({ id: '2', priority: 3 }),
    ];
    const conditions: FilterCondition[] = [
      { field: 'priority', operator: 'isNot', value: 1 },
    ];
    const result = applyFilters(tasks, conditions, emptyContext);
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe(3);
  });

  it('filters by dueDate noDate', () => {
    const tasks = [
      makeTask({ id: '1', dueDate: now }),
      makeTask({ id: '2' }),
    ];
    const conditions: FilterCondition[] = [
      { field: 'dueDate', operator: 'noDate' },
    ];
    const result = applyFilters(tasks, conditions, emptyContext);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('filters by dueDate hasDate', () => {
    const tasks = [
      makeTask({ id: '1', dueDate: now }),
      makeTask({ id: '2' }),
    ];
    const conditions: FilterCondition[] = [
      { field: 'dueDate', operator: 'hasDate' },
    ];
    const result = applyFilters(tasks, conditions, emptyContext);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by dueDate overdue', () => {
    const tasks = [
      makeTask({ id: '1', dueDate: lastWeek }),
      makeTask({ id: '2', dueDate: nextWeek }),
      makeTask({ id: '3' }),
    ];
    const conditions: FilterCondition[] = [
      { field: 'dueDate', operator: 'overdue' },
    ];
    const result = applyFilters(tasks, conditions, emptyContext);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by project is', () => {
    const tasks = [
      makeTask({ id: '1', projectId: 'proj-a' }),
      makeTask({ id: '2', projectId: 'proj-b' }),
    ];
    const conditions: FilterCondition[] = [
      { field: 'project', operator: 'is', value: 'proj-a' },
    ];
    const result = applyFilters(tasks, conditions, emptyContext);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by label is', () => {
    const tasks = [
      makeTask({ id: '1', labels: ['label-a', 'label-b'] }),
      makeTask({ id: '2', labels: ['label-c'] }),
    ];
    const conditions: FilterCondition[] = [
      { field: 'label', operator: 'is', value: 'label-a' },
    ];
    const result = applyFilters(tasks, conditions, emptyContext);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by completed is', () => {
    const tasks = [
      makeTask({ id: '1', completed: true }),
      makeTask({ id: '2', completed: false }),
    ];
    const conditions: FilterCondition[] = [
      { field: 'completed', operator: 'is', value: true },
    ];
    const result = applyFilters(tasks, conditions, emptyContext);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('AND logic: multiple conditions', () => {
    const tasks = [
      makeTask({ id: '1', priority: 1, completed: false }),
      makeTask({ id: '2', priority: 1, completed: true }),
      makeTask({ id: '3', priority: 3, completed: false }),
    ];
    const conditions: FilterCondition[] = [
      { field: 'priority', operator: 'is', value: 1 },
      { field: 'completed', operator: 'is', value: false },
    ];
    const result = applyFilters(tasks, conditions, emptyContext);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });
});
