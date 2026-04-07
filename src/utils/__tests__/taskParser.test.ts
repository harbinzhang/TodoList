import { describe, it, expect } from 'vitest';
import { parseTaskInput } from '../taskParser';

// Shared fixtures
const PROJECTS = [
  { id: 'proj-1', name: 'Work' },
  { id: 'proj-2', name: 'Personal' },
  { id: 'proj-3', name: 'My Project' },
];

const LABELS = [
  { id: 'lbl-1', name: 'email' },
  { id: 'lbl-2', name: 'urgent' },
  { id: 'lbl-3', name: 'followup' },
];

// Fixed reference date: Wednesday 2026-03-11 12:00:00
const REF_DATE = new Date(2026, 2, 11, 12, 0, 0);

describe('taskParser', () => {
  // ──────────── Basic title extraction ────────────

  describe('plain text (no metadata)', () => {
    it('returns the text as-is when no metadata is found', () => {
      const result = parseTaskInput('Buy groceries', [], [], REF_DATE);
      expect(result.cleanTitle).toBe('Buy groceries');
      expect(result.dueDate).toBeUndefined();
      expect(result.priority).toBeUndefined();
      expect(result.projectId).toBeUndefined();
      expect(result.labelIds).toBeUndefined();
      expect(result.parsedTokens).toHaveLength(0);
    });
  });

  // ──────────── Priority extraction ────────────

  describe('priority', () => {
    it.each([
      ['p1', 1],
      ['!1', 1],
      ['urgent', 1],
      ['critical', 1],
      ['p2', 2],
      ['!2', 2],
      ['high priority', 2],
      ['important', 2],
      ['p3', 3],
      ['!3', 3],
      ['medium priority', 3],
      ['p4', 4],
      ['!4', 4],
      ['low priority', 4],
    ] as const)('parses "%s" as priority %d', (keyword, expected) => {
      const result = parseTaskInput(`Buy milk ${keyword}`, [], [], REF_DATE);
      expect(result.priority).toBe(expected);
      expect(result.cleanTitle).toBe('Buy milk');
    });

    it('only extracts the first priority match', () => {
      const result = parseTaskInput('Buy milk p1 p3', [], [], REF_DATE);
      expect(result.priority).toBe(1);
    });

    it('marks the priority token', () => {
      const result = parseTaskInput('Buy milk p2', [], [], REF_DATE);
      const pToken = result.parsedTokens.find((t) => t.type === 'priority');
      expect(pToken).toBeDefined();
      expect(pToken!.text).toBe('p2');
    });
  });

  // ──────────── Project extraction ────────────

  describe('projects', () => {
    it('matches #Work against existing projects (case-insensitive)', () => {
      const result = parseTaskInput('Fix bug #work', PROJECTS, [], REF_DATE);
      expect(result.projectId).toBe('proj-1');
      expect(result.cleanTitle).toBe('Fix bug');
    });

    it('leaves unmatched #tags in the title', () => {
      const result = parseTaskInput('Fix bug #unknown', PROJECTS, [], REF_DATE);
      expect(result.projectId).toBeUndefined();
      expect(result.cleanTitle).toBe('Fix bug #unknown');
    });

    it('only assigns the first matched project', () => {
      const result = parseTaskInput('task #Work #Personal', PROJECTS, [], REF_DATE);
      expect(result.projectId).toBe('proj-1');
    });

    it('marks the project token', () => {
      const result = parseTaskInput('task #Personal', PROJECTS, [], REF_DATE);
      const pToken = result.parsedTokens.find((t) => t.type === 'project');
      expect(pToken).toBeDefined();
      expect(pToken!.text).toBe('#Personal');
    });
  });

  // ──────────── Label extraction ────────────

  describe('labels', () => {
    it('matches @email against existing labels', () => {
      const result = parseTaskInput('Reply to John @email', [], LABELS, REF_DATE);
      expect(result.labelIds).toEqual(['lbl-1']);
      expect(result.cleanTitle).toBe('Reply to John');
    });

    it('supports multiple labels', () => {
      const result = parseTaskInput('task @email @followup', [], LABELS, REF_DATE);
      expect(result.labelIds).toEqual(['lbl-1', 'lbl-3']);
    });

    it('leaves unmatched @tags in the title', () => {
      const result = parseTaskInput('task @nonexistent', [], LABELS, REF_DATE);
      expect(result.labelIds).toBeUndefined();
      expect(result.cleanTitle).toBe('task @nonexistent');
    });
  });

  // ──────────── Date extraction ────────────

  describe('dates', () => {
    it('parses "tomorrow"', () => {
      const result = parseTaskInput('Buy milk tomorrow', [], [], REF_DATE);
      expect(result.dueDate).toBeDefined();
      const expected = new Date(2026, 2, 12);
      expect(result.dueDate!.getFullYear()).toBe(expected.getFullYear());
      expect(result.dueDate!.getMonth()).toBe(expected.getMonth());
      expect(result.dueDate!.getDate()).toBe(expected.getDate());
      expect(result.cleanTitle).toBe('Buy milk');
    });

    it('parses "at 3pm" with time', () => {
      const result = parseTaskInput('Meeting at 3pm', [], [], REF_DATE);
      expect(result.dueDate).toBeDefined();
      expect(result.dueDate!.getHours()).toBe(15);
    });

    it('parses "in 3 days"', () => {
      const result = parseTaskInput('Finish report in 3 days', [], [], REF_DATE);
      expect(result.dueDate).toBeDefined();
      const expected = new Date(2026, 2, 14);
      expect(result.dueDate!.getDate()).toBe(expected.getDate());
    });

    it('uses the last date when multiple are present', () => {
      const result = parseTaskInput('Reschedule tomorrow or friday', [], [], REF_DATE);
      expect(result.dueDate).toBeDefined();
      // "friday" is last → should be the one used
      expect(result.dueDate!.getDay()).toBe(5); // Friday
    });

    it('parses "eod" as today at 5pm', () => {
      const result = parseTaskInput('Submit form eod', [], [], REF_DATE);
      expect(result.dueDate).toBeDefined();
      expect(result.dueDate!.getDate()).toBe(REF_DATE.getDate());
      expect(result.dueDate!.getHours()).toBe(17);
      expect(result.cleanTitle).toBe('Submit form');
    });

    it('parses "end of week" as friday at 5pm', () => {
      const result = parseTaskInput('Review end of week', [], [], REF_DATE);
      expect(result.dueDate).toBeDefined();
      expect(result.dueDate!.getDay()).toBe(5); // Friday
      expect(result.dueDate!.getHours()).toBe(17);
    });

    it('marks the date token', () => {
      const result = parseTaskInput('Buy milk tomorrow', [], [], REF_DATE);
      const dToken = result.parsedTokens.find((t) => t.type === 'date');
      expect(dToken).toBeDefined();
      expect(dToken!.text).toBe('tomorrow');
    });

    it('parses "tod" as today', () => {
      const result = parseTaskInput('Submit form tod', [], [], REF_DATE);
      expect(result.dueDate).toBeDefined();
      expect(result.dueDate!.getDate()).toBe(REF_DATE.getDate());
      expect(result.cleanTitle).toBe('Submit form');
    });

    it('parses "tom" as tomorrow', () => {
      const result = parseTaskInput('Buy milk tom', [], [], REF_DATE);
      expect(result.dueDate).toBeDefined();
      expect(result.dueDate!.getDate()).toBe(12); // tomorrow
      expect(result.cleanTitle).toBe('Buy milk');
    });

    it('does not match "tod" inside a word like "today"', () => {
      // "today" should be parsed by chrono, not our shorthand
      const result = parseTaskInput('Buy milk today', [], [], REF_DATE);
      expect(result.dueDate).toBeDefined();
      expect(result.dueDate!.getDate()).toBe(REF_DATE.getDate());
    });
  });

  // ──────────── Combined parsing ────────────

  describe('combined input', () => {
    it('extracts all metadata from a full sentence', () => {
      const result = parseTaskInput(
        'Buy milk tomorrow p2 #Personal @email',
        PROJECTS,
        LABELS,
        REF_DATE,
      );
      expect(result.cleanTitle).toBe('Buy milk');
      expect(result.dueDate).toBeDefined();
      expect(result.dueDate!.getDate()).toBe(12); // tomorrow
      expect(result.priority).toBe(2);
      expect(result.projectId).toBe('proj-2');
      expect(result.labelIds).toEqual(['lbl-1']);
      expect(result.parsedTokens).toHaveLength(4); // date, priority, project, label
    });

    it('handles metadata scattered throughout the input', () => {
      const result = parseTaskInput(
        'urgent Fix the #Work bug @email tomorrow',
        PROJECTS,
        LABELS,
        REF_DATE,
      );
      expect(result.cleanTitle).toBe('Fix the bug');
      expect(result.priority).toBe(1);
      expect(result.projectId).toBe('proj-1');
      expect(result.labelIds).toEqual(['lbl-1']);
      expect(result.dueDate).toBeDefined();
    });
  });

  // ──────────── Edge cases ────────────

  describe('edge cases', () => {
    it('handles metadata-only input (empty clean title)', () => {
      const result = parseTaskInput('tomorrow p1 #Work', PROJECTS, [], REF_DATE);
      expect(result.cleanTitle).toBe('');
      expect(result.dueDate).toBeDefined();
      expect(result.priority).toBe(1);
      expect(result.projectId).toBe('proj-1');
    });

    it('handles empty input', () => {
      const result = parseTaskInput('', [], [], REF_DATE);
      expect(result.cleanTitle).toBe('');
      expect(result.parsedTokens).toHaveLength(0);
    });

    it('handles whitespace-only input', () => {
      const result = parseTaskInput('   ', [], [], REF_DATE);
      expect(result.cleanTitle).toBe('');
    });

    it('does not match priority substring in a word (e.g., "up1oad")', () => {
      // "p1" should only match as a standalone word
      const result = parseTaskInput('Upload file', [], [], REF_DATE);
      expect(result.priority).toBeUndefined();
    });

    it('preserves token positions relative to the original text', () => {
      const input = 'Buy groceries tomorrow p2 #Personal';
      const result = parseTaskInput(input, PROJECTS, [], REF_DATE);

      for (const token of result.parsedTokens) {
        const slice = input.slice(token.start, token.end);
        expect(slice.toLowerCase()).toBe(token.text.toLowerCase());
      }
    });
  });
});
