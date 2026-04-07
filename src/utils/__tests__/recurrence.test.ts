import { describe, it, expect } from 'vitest';
import { getNextDueDate, formatRecurrenceLabel, isRecurrenceComplete } from '../recurrence';
import type { RecurrenceRule } from '../../types';

describe('getNextDueDate', () => {
  it('daily: adds interval days', () => {
    const rule: RecurrenceRule = { frequency: 'daily', interval: 1 };
    const current = new Date('2026-03-10');
    const next = getNextDueDate(current, rule);
    expect(next).toEqual(new Date('2026-03-11'));
  });

  it('daily: every 3 days', () => {
    const rule: RecurrenceRule = { frequency: 'daily', interval: 3 };
    const current = new Date('2026-03-10');
    const next = getNextDueDate(current, rule);
    expect(next).toEqual(new Date('2026-03-13'));
  });

  it('weekly: adds interval weeks', () => {
    const rule: RecurrenceRule = { frequency: 'weekly', interval: 1 };
    const current = new Date('2026-03-10'); // Tuesday
    const next = getNextDueDate(current, rule);
    expect(next).toEqual(new Date('2026-03-17'));
  });

  it('weekly: every 2 weeks', () => {
    const rule: RecurrenceRule = { frequency: 'weekly', interval: 2 };
    const current = new Date('2026-03-10');
    const next = getNextDueDate(current, rule);
    expect(next).toEqual(new Date('2026-03-24'));
  });

  it('weekly with daysOfWeek: finds next day in same week', () => {
    // current is Tuesday (2), days are [2,4] (Tue, Thu)
    // Since current is already Tue, next should be Thu
    const rule: RecurrenceRule = { frequency: 'weekly', interval: 1, daysOfWeek: [2, 4] };
    const current = new Date('2026-03-10T00:00:00'); // Tuesday
    const next = getNextDueDate(current, rule);
    // Should be Thursday March 12
    expect(next!.getDay()).toBe(4); // Thursday
  });

  it('monthly: adds interval months', () => {
    const rule: RecurrenceRule = { frequency: 'monthly', interval: 1 };
    const current = new Date('2026-03-10');
    const next = getNextDueDate(current, rule);
    expect(next).toEqual(new Date('2026-04-10'));
  });

  it('monthly with dayOfMonth: clamps to valid day', () => {
    // Feb doesn't have 31 days
    const rule: RecurrenceRule = { frequency: 'monthly', interval: 1, dayOfMonth: 31 };
    const current = new Date('2026-01-31');
    const next = getNextDueDate(current, rule);
    expect(next!.getDate()).toBe(28); // Feb 2026 has 28 days
    expect(next!.getMonth()).toBe(1); // February
  });

  it('yearly: adds interval years', () => {
    const rule: RecurrenceRule = { frequency: 'yearly', interval: 1 };
    const current = new Date('2026-03-10T00:00:00');
    const next = getNextDueDate(current, rule);
    // Compare year/month/day to avoid DST offset issues
    expect(next!.getFullYear()).toBe(2027);
    expect(next!.getMonth()).toBe(2); // March = 2
    expect(next!.getDate()).toBe(10);
  });

  it('returns null when endDate has passed', () => {
    const rule: RecurrenceRule = {
      frequency: 'daily',
      interval: 1,
      endDate: new Date('2026-03-11'),
    };
    const current = new Date('2026-03-11');
    const next = getNextDueDate(current, rule);
    expect(next).toBeNull();
  });

  it('returns next date when endDate is not yet reached', () => {
    const rule: RecurrenceRule = {
      frequency: 'daily',
      interval: 1,
      endDate: new Date('2026-03-15'),
    };
    const current = new Date('2026-03-10');
    const next = getNextDueDate(current, rule);
    expect(next).toEqual(new Date('2026-03-11'));
  });

  it('returns null when endAfterCount is reached', () => {
    const rule: RecurrenceRule = {
      frequency: 'daily',
      interval: 1,
      endAfterCount: 3,
      completedCount: 3,
    };
    const current = new Date('2026-03-10');
    const next = getNextDueDate(current, rule);
    expect(next).toBeNull();
  });
});

describe('formatRecurrenceLabel', () => {
  it('simple daily', () => {
    expect(formatRecurrenceLabel({ frequency: 'daily', interval: 1 })).toBe('Daily');
  });

  it('every 2 days', () => {
    expect(formatRecurrenceLabel({ frequency: 'daily', interval: 2 })).toBe('Every 2 days');
  });

  it('weekdays preset', () => {
    expect(
      formatRecurrenceLabel({ frequency: 'weekly', interval: 1, daysOfWeek: [1, 2, 3, 4, 5] })
    ).toBe('Every weekday');
  });

  it('weekly', () => {
    expect(formatRecurrenceLabel({ frequency: 'weekly', interval: 1 })).toBe('Weekly');
  });

  it('monthly', () => {
    expect(formatRecurrenceLabel({ frequency: 'monthly', interval: 1 })).toBe('Monthly');
  });

  it('yearly', () => {
    expect(formatRecurrenceLabel({ frequency: 'yearly', interval: 1 })).toBe('Yearly');
  });

  it('every 2 weeks on Mon & Wed', () => {
    expect(
      formatRecurrenceLabel({ frequency: 'weekly', interval: 2, daysOfWeek: [1, 3] })
    ).toBe('Every 2 weeks on Mon & Wed');
  });
});

describe('isRecurrenceComplete', () => {
  it('not complete when no end conditions', () => {
    expect(isRecurrenceComplete({ frequency: 'daily', interval: 1 })).toBe(false);
  });

  it('complete when completedCount >= endAfterCount', () => {
    expect(
      isRecurrenceComplete({ frequency: 'daily', interval: 1, endAfterCount: 3, completedCount: 3 })
    ).toBe(true);
  });

  it('not complete when completedCount < endAfterCount', () => {
    expect(
      isRecurrenceComplete({ frequency: 'daily', interval: 1, endAfterCount: 3, completedCount: 2 })
    ).toBe(false);
  });
});
