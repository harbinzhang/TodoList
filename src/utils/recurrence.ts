import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  getDay,
  nextDay,
  isBefore,
  startOfDay,
} from 'date-fns';
import type { RecurrenceRule } from '../types';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Compute the next due date based on the current due date and recurrence rule.
 * Returns null if the recurrence is complete (endDate passed or endAfterCount reached).
 */
export function getNextDueDate(
  currentDue: Date,
  rule: RecurrenceRule
): Date | null {
  // Check if recurrence has ended by count
  if (isRecurrenceComplete(rule)) return null;

  let nextDate: Date;

  switch (rule.frequency) {
    case 'daily':
      nextDate = addDays(currentDue, rule.interval);
      break;

    case 'weekly':
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        nextDate = getNextWeeklyDate(currentDue, rule.daysOfWeek, rule.interval);
      } else {
        nextDate = addWeeks(currentDue, rule.interval);
      }
      break;

    case 'monthly':
      nextDate = addMonths(currentDue, rule.interval);
      if (rule.dayOfMonth) {
        // Clamp day to valid range for the month
        const maxDay = new Date(
          nextDate.getFullYear(),
          nextDate.getMonth() + 1,
          0
        ).getDate();
        const day = Math.min(rule.dayOfMonth, maxDay);
        nextDate = new Date(nextDate.getFullYear(), nextDate.getMonth(), day);
      }
      break;

    case 'yearly':
      nextDate = addYears(currentDue, rule.interval);
      break;

    default:
      return null;
  }

  // Check if the next date exceeds the end date
  if (rule.endDate && isBefore(startOfDay(rule.endDate), startOfDay(nextDate))) {
    return null;
  }

  return nextDate;
}

/**
 * For weekly recurrence with specific days of week:
 * Find the next occurrence day after currentDue.
 */
function getNextWeeklyDate(
  currentDue: Date,
  daysOfWeek: number[],
  interval: number
): Date {
  const sortedDays = [...daysOfWeek].sort((a, b) => a - b);
  const currentDay = getDay(currentDue);

  // Find the next day of week in the same week cycle
  const nextDayInCycle = sortedDays.find((d) => d > currentDay);

  if (nextDayInCycle !== undefined) {
    // There's still a day later this week
    return nextDay(currentDue, nextDayInCycle as 0 | 1 | 2 | 3 | 4 | 5 | 6);
  }

  // Move to the first day of the next interval cycle
  const weeksToAdd = interval;
  const baseDate = addWeeks(currentDue, weeksToAdd);

  // Jump to the first selected day in that week
  const firstDay = sortedDays[0];
  const baseDayOfWeek = getDay(baseDate);

  if (baseDayOfWeek === firstDay) return baseDate;

  // Calculate days to add/subtract to reach firstDay
  let diff = firstDay - baseDayOfWeek;
  if (diff < 0) diff += 7;
  // But we need to go backwards to the start of that week's first selected day
  // Use the start of the week approach
  const startOfThatWeek = addDays(baseDate, -baseDayOfWeek); // Sunday
  return addDays(startOfThatWeek, firstDay);
}

/**
 * Format a recurrence rule into a human-readable label.
 */
export function formatRecurrenceLabel(rule: RecurrenceRule): string {
  const { frequency, interval, daysOfWeek } = rule;

  // Handle weekday preset
  if (
    frequency === 'weekly' &&
    interval === 1 &&
    daysOfWeek &&
    daysOfWeek.length === 5 &&
    [1, 2, 3, 4, 5].every((d) => daysOfWeek.includes(d))
  ) {
    return 'Every weekday';
  }

  const freqLabel =
    interval === 1
      ? frequency === 'daily'
        ? 'Daily'
        : frequency === 'weekly'
          ? 'Weekly'
          : frequency === 'monthly'
            ? 'Monthly'
            : 'Yearly'
      : `Every ${interval} ${frequency === 'daily' ? 'days' : frequency === 'weekly' ? 'weeks' : frequency === 'monthly' ? 'months' : 'years'}`;

  // Add day-of-week info for weekly
  if (frequency === 'weekly' && daysOfWeek && daysOfWeek.length > 0 && !(interval === 1 && daysOfWeek.length === 1)) {
    const dayLabels = daysOfWeek
      .sort((a, b) => a - b)
      .map((d) => DAY_NAMES[d]);
    return `${freqLabel} on ${dayLabels.join(' & ')}`;
  }

  return freqLabel;
}

/**
 * Check if a recurrence rule has reached its end condition.
 */
export function isRecurrenceComplete(rule: RecurrenceRule): boolean {
  // Check count-based end
  if (
    rule.endAfterCount !== undefined &&
    rule.completedCount !== undefined &&
    rule.completedCount >= rule.endAfterCount
  ) {
    return true;
  }

  // endDate is checked in getNextDueDate against the computed next date
  return false;
}

/**
 * Create a "Weekdays" preset rule.
 */
export function createWeekdayPreset(): RecurrenceRule {
  return {
    frequency: 'weekly',
    interval: 1,
    daysOfWeek: [1, 2, 3, 4, 5],
  };
}

/**
 * Create a preset rule for a simple frequency.
 */
export function createPresetRule(
  preset: 'daily' | 'weekly' | 'monthly' | 'yearly'
): RecurrenceRule {
  return {
    frequency: preset,
    interval: 1,
  };
}
