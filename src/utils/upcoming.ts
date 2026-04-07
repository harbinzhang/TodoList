import {
  startOfDay,
  addDays,
  eachDayOfInterval,
  isBefore,
  isSameDay,
  format,
} from 'date-fns';
import type { Task } from '../types';

export type UpcomingScope = 7 | 14 | 30;

export interface DayGroup {
  date: Date;
  dateKey: string; // YYYY-MM-DD
  label: string;   // "Monday, March 10"
  isToday: boolean;
  tasks: Task[];
}

/**
 * Returns { start, end } for the given scope from today.
 */
export function getDateRange(scope: UpcomingScope): { start: Date; end: Date } {
  const start = startOfDay(new Date());
  const end = startOfDay(addDays(start, scope - 1));
  return { start, end };
}

/**
 * Returns overdue tasks (dueDate < today, not completed).
 * Sorted by how late they are (most overdue first).
 */
export function getOverdueTasks(tasks: Task[]): Task[] {
  const today = startOfDay(new Date());
  return tasks
    .filter((task) => {
      if (task.completed || !task.dueDate) return false;
      return isBefore(startOfDay(task.dueDate), today);
    })
    .sort((a, b) => {
      // Most overdue first
      return (a.dueDate!.getTime()) - (b.dueDate!.getTime());
    });
}

/**
 * Returns tasks without a dueDate (undated), not completed.
 */
export function getUndatedTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) => !task.completed && !task.dueDate);
}

/**
 * Groups tasks into day groups for the given scope.
 * Includes empty days within the range so the user sees gaps.
 */
export function groupTasksByDay(tasks: Task[], scope: UpcomingScope): DayGroup[] {
  const { start, end } = getDateRange(scope);
  const today = startOfDay(new Date());
  const days = eachDayOfInterval({ start, end });

  return days.map((date) => {
    const dayStart = startOfDay(date);
    const dayTasks = tasks.filter((task) => {
      if (task.completed || !task.dueDate) return false;
      return isSameDay(task.dueDate, dayStart);
    });

    // Sort: by sortOrder, then priority, then createdAt
    dayTasks.sort((a, b) => {
      if (a.sortOrder != null && b.sortOrder != null) return a.sortOrder - b.sortOrder;
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return {
      date: dayStart,
      dateKey: format(dayStart, 'yyyy-MM-dd'),
      label: format(dayStart, 'EEEE, MMMM d'),
      isToday: isSameDay(dayStart, today),
      tasks: dayTasks,
    };
  });
}
