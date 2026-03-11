import type { Task, FilterCondition, Project, Label } from '../types';
import { isAfter, isBefore, startOfDay, addDays, startOfWeek } from 'date-fns';

interface FilterContext {
  projects: Project[];
  labels: Label[];
}

/**
 * Apply a set of filter conditions (AND logic) to a list of tasks.
 */
export function applyFilters(
  tasks: Task[],
  conditions: FilterCondition[],
  context: FilterContext
): Task[] {
  if (conditions.length === 0) return tasks;

  return tasks.filter((task) =>
    conditions.every((condition) => matchesCondition(task, condition, context))
  );
}

function matchesCondition(
  task: Task,
  condition: FilterCondition,
  _context: FilterContext
): boolean {
  switch (condition.field) {
    case 'priority':
      return matchPriority(task, condition);
    case 'dueDate':
      return matchDueDate(task, condition);
    case 'project':
      return matchProject(task, condition);
    case 'label':
      return matchLabel(task, condition);
    case 'completed':
      return matchCompleted(task, condition);
    default:
      return true;
  }
}

function matchPriority(task: Task, condition: FilterCondition): boolean {
  const taskPriority = task.priority;
  const value = Number(condition.value);

  switch (condition.operator) {
    case 'is':
      return taskPriority === value;
    case 'isNot':
      return taskPriority !== value;
    default:
      return true;
  }
}

function matchDueDate(task: Task, condition: FilterCondition): boolean {
  const now = new Date();
  const todayStart = startOfDay(now);

  switch (condition.operator) {
    case 'noDate':
      return !task.dueDate;
    case 'hasDate':
      return !!task.dueDate;
    case 'overdue':
      return !!task.dueDate && isBefore(task.dueDate, todayStart) && !task.completed;
    case 'thisWeek': {
      if (!task.dueDate) return false;
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 7);
      return !isBefore(task.dueDate, weekStart) && isBefore(task.dueDate, weekEnd);
    }
    case 'next7Days': {
      if (!task.dueDate) return false;
      const end = addDays(todayStart, 7);
      return !isBefore(task.dueDate, todayStart) && isBefore(task.dueDate, end);
    }
    case 'before': {
      if (!task.dueDate || !condition.value) return false;
      const target = new Date(String(condition.value));
      return isBefore(task.dueDate, target);
    }
    case 'after': {
      if (!task.dueDate || !condition.value) return false;
      const target = new Date(String(condition.value));
      return isAfter(task.dueDate, target);
    }
    default:
      return true;
  }
}

function matchProject(task: Task, condition: FilterCondition): boolean {
  switch (condition.operator) {
    case 'is':
      return task.projectId === condition.value;
    case 'isNot':
      return task.projectId !== condition.value;
    default:
      return true;
  }
}

function matchLabel(task: Task, condition: FilterCondition): boolean {
  switch (condition.operator) {
    case 'is':
      return task.labels.includes(String(condition.value));
    case 'isNot':
      return !task.labels.includes(String(condition.value));
    default:
      return true;
  }
}

function matchCompleted(task: Task, condition: FilterCondition): boolean {
  switch (condition.operator) {
    case 'is':
      return task.completed === Boolean(condition.value);
    case 'isNot':
      return task.completed !== Boolean(condition.value);
    default:
      return true;
  }
}

/**
 * Get the count of tasks matching the filter conditions.
 */
export function getFilterMatchCount(
  tasks: Task[],
  conditions: FilterCondition[],
  context: FilterContext
): number {
  return applyFilters(tasks, conditions, context).length;
}
