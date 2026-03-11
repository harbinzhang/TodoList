import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addDays,
  isSameDay,
} from 'date-fns';

/**
 * Returns a 2D array of Date objects representing a month calendar grid.
 * Always starts on Sunday. Includes trailing/leading days from adjacent months.
 */
export function getMonthGrid(year: number, month: number): Date[][] {
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = endOfMonth(firstOfMonth);

  const gridStart = startOfWeek(firstOfMonth, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(lastOfMonth, { weekStartsOn: 0 });

  const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  // Chunk into weeks (rows of 7)
  const weeks: Date[][] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }

  return weeks;
}

/**
 * Returns the 7 days of the week containing the given date.
 * Week starts on Sunday.
 */
export function getWeekDays(date: Date): Date[] {
  const weekStart = startOfWeek(date, { weekStartsOn: 0 });
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/**
 * Returns an array of Dates for each day in the [start, end] range (inclusive).
 */
export function getDaysInRange(start: Date, end: Date): Date[] {
  return eachDayOfInterval({ start, end });
}

/**
 * Groups tasks by their due date (YYYY-MM-DD key).
 * Returns a Map where keys are date strings and values are arrays of task IDs.
 */
export function getTasksForDate<T extends { dueDate?: Date }>(
  tasks: T[],
  date: Date
): T[] {
  return tasks.filter((task) => {
    if (!task.dueDate) return false;
    return isSameDay(task.dueDate, date);
  });
}

/**
 * Returns a density level for a given task count.
 */
export function getDensityLevel(count: number): 'none' | 'low' | 'medium' | 'high' {
  if (count === 0) return 'none';
  if (count <= 3) return 'low';
  if (count <= 6) return 'medium';
  return 'high';
}

export { isSameDay, startOfMonth, endOfMonth };
