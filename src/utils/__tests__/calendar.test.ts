import { describe, it, expect } from 'vitest';
import { getMonthGrid, getWeekDays, getDaysInRange, getTasksForDate, getDensityLevel } from '../calendar';

describe('calendar utils', () => {
  describe('getMonthGrid', () => {
    it('returns a grid of 5 or 6 weeks', () => {
      // March 2026
      const grid = getMonthGrid(2026, 2); // month is 0-indexed
      expect(grid.length).toBeGreaterThanOrEqual(5);
      expect(grid.length).toBeLessThanOrEqual(6);
      // Each week has 7 days
      grid.forEach((week) => {
        expect(week).toHaveLength(7);
      });
    });

    it('starts on Sunday', () => {
      const grid = getMonthGrid(2026, 2);
      // First day of first week should be a Sunday
      expect(grid[0][0].getDay()).toBe(0);
    });

    it('contains all days of the month', () => {
      const grid = getMonthGrid(2026, 2); // March 2026
      const allDays = grid.flat();
      // March has 31 days
      const marchDays = allDays.filter(
        (d) => d.getMonth() === 2 && d.getFullYear() === 2026
      );
      expect(marchDays).toHaveLength(31);
    });

    it('handles February correctly', () => {
      // 2024 is a leap year
      const grid = getMonthGrid(2024, 1); // Feb 2024
      const allDays = grid.flat();
      const febDays = allDays.filter(
        (d) => d.getMonth() === 1 && d.getFullYear() === 2024
      );
      expect(febDays).toHaveLength(29);
    });

    it('handles non-leap year February', () => {
      const grid = getMonthGrid(2026, 1); // Feb 2026 (not leap)
      const allDays = grid.flat();
      const febDays = allDays.filter(
        (d) => d.getMonth() === 1 && d.getFullYear() === 2026
      );
      expect(febDays).toHaveLength(28);
    });
  });

  describe('getWeekDays', () => {
    it('returns exactly 7 days', () => {
      const days = getWeekDays(new Date(2026, 2, 11)); // March 11, 2026 (Wed)
      expect(days).toHaveLength(7);
    });

    it('starts on Sunday', () => {
      const days = getWeekDays(new Date(2026, 2, 11));
      expect(days[0].getDay()).toBe(0); // Sunday
    });

    it('contains the given date', () => {
      const target = new Date(2026, 2, 11);
      const days = getWeekDays(target);
      const found = days.some(
        (d) =>
          d.getFullYear() === 2026 &&
          d.getMonth() === 2 &&
          d.getDate() === 11
      );
      expect(found).toBe(true);
    });
  });

  describe('getDaysInRange', () => {
    it('returns all days inclusive', () => {
      const start = new Date(2026, 2, 1);
      const end = new Date(2026, 2, 7);
      const days = getDaysInRange(start, end);
      expect(days).toHaveLength(7);
    });

    it('returns single day for same start and end', () => {
      const date = new Date(2026, 2, 15);
      const days = getDaysInRange(date, date);
      expect(days).toHaveLength(1);
    });
  });

  describe('getTasksForDate', () => {
    it('returns tasks matching the given date', () => {
      const tasks = [
        { id: '1', dueDate: new Date(2026, 2, 11) },
        { id: '2', dueDate: new Date(2026, 2, 12) },
        { id: '3', dueDate: new Date(2026, 2, 11, 14, 30) }, // same day, different time
        { id: '4' }, // no dueDate
      ];
      const result = getTasksForDate(tasks, new Date(2026, 2, 11));
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toEqual(['1', '3']);
    });

    it('returns empty array when no tasks match', () => {
      const tasks = [{ id: '1', dueDate: new Date(2026, 2, 12) }];
      const result = getTasksForDate(tasks, new Date(2026, 2, 11));
      expect(result).toHaveLength(0);
    });
  });

  describe('getDensityLevel', () => {
    it('returns none for 0', () => {
      expect(getDensityLevel(0)).toBe('none');
    });

    it('returns low for 1-3', () => {
      expect(getDensityLevel(1)).toBe('low');
      expect(getDensityLevel(3)).toBe('low');
    });

    it('returns medium for 4-6', () => {
      expect(getDensityLevel(4)).toBe('medium');
      expect(getDensityLevel(6)).toBe('medium');
    });

    it('returns high for 7+', () => {
      expect(getDensityLevel(7)).toBe('high');
      expect(getDensityLevel(15)).toBe('high');
    });
  });
});
