import type { Task } from '../types';
import { startOfDay, subDays, isAfter, isEqual } from 'date-fns';

/**
 * Get the number of tasks completed in the current week (Mon-Sun).
 */
export function getWeeklyCount(tasks: Task[]): number {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfWeek = startOfDay(subDays(now, mondayOffset));

  return tasks.filter(
    (t) =>
      t.completed &&
      t.completedAt &&
      (isAfter(t.completedAt, startOfWeek) || isEqual(startOfDay(t.completedAt), startOfWeek))
  ).length;
}

/**
 * Get the daily completion counts for the last N days (most recent last).
 */
export function getDailyCountsForDays(tasks: Task[], numDays: number): number[] {
  const counts: number[] = [];
  const now = new Date();

  for (let i = numDays - 1; i >= 0; i--) {
    const day = startOfDay(subDays(now, i));
    const nextDay = startOfDay(subDays(now, i - 1));
    const count = tasks.filter(
      (t) =>
        t.completed &&
        t.completedAt &&
        (isAfter(t.completedAt, day) || isEqual(startOfDay(t.completedAt), day)) &&
        !isAfter(t.completedAt, nextDay) &&
        !isEqual(startOfDay(t.completedAt), nextDay)
    ).length;
    counts.push(count);
  }

  // Fix last entry (today): count tasks completed today
  const todayStart = startOfDay(now);
  counts[counts.length - 1] = tasks.filter(
    (t) =>
      t.completed &&
      t.completedAt &&
      (isAfter(t.completedAt, todayStart) || isEqual(startOfDay(t.completedAt), todayStart))
  ).length;

  return counts;
}

/**
 * Get completion streak: consecutive days (ending today or yesterday) with at least 1 completion.
 */
export function getStreak(tasks: Task[]): number {
  if (tasks.length === 0) return 0;

  const completedTasks = tasks.filter((t) => t.completed && t.completedAt);
  if (completedTasks.length === 0) return 0;

  // Build a set of date strings for days with completions
  const completionDays = new Set<string>();
  completedTasks.forEach((t) => {
    if (t.completedAt) {
      completionDays.add(startOfDay(t.completedAt).toISOString());
    }
  });

  // Start counting from today backwards
  let streak = 0;
  let checkDate = startOfDay(new Date());

  // If today has no completions, start from yesterday
  if (!completionDays.has(checkDate.toISOString())) {
    checkDate = startOfDay(subDays(checkDate, 1));
  }

  while (completionDays.has(checkDate.toISOString())) {
    streak++;
    checkDate = startOfDay(subDays(checkDate, 1));
  }

  return streak;
}

/**
 * Get weekly trend as percentage change vs previous week.
 */
export function getWeeklyTrend(tasks: Task[]): number {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisWeekStart = startOfDay(subDays(now, mondayOffset));
  const lastWeekStart = startOfDay(subDays(thisWeekStart, 7));

  const thisWeekCount = tasks.filter(
    (t) =>
      t.completed &&
      t.completedAt &&
      (isAfter(t.completedAt, thisWeekStart) || isEqual(startOfDay(t.completedAt), thisWeekStart))
  ).length;

  const lastWeekCount = tasks.filter(
    (t) =>
      t.completed &&
      t.completedAt &&
      (isAfter(t.completedAt, lastWeekStart) || isEqual(startOfDay(t.completedAt), lastWeekStart)) &&
      !isAfter(t.completedAt, thisWeekStart) &&
      !isEqual(startOfDay(t.completedAt), thisWeekStart)
  ).length;

  if (lastWeekCount === 0) {
    return thisWeekCount > 0 ? 100 : 0;
  }

  return Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100);
}

/**
 * Get number of tasks completed today.
 */
export function getTodayCount(tasks: Task[]): number {
  const todayStart = startOfDay(new Date());
  return tasks.filter(
    (t) =>
      t.completed &&
      t.completedAt &&
      (isAfter(t.completedAt, todayStart) || isEqual(startOfDay(t.completedAt), todayStart))
  ).length;
}
