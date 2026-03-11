import * as chrono from 'chrono-node';
import type { Project, Label } from '../types';

// --- Public types ---

export interface ParsedToken {
  text: string;
  start: number;
  end: number;
  type: 'date' | 'priority' | 'project' | 'label';
}

export interface ParsedTask {
  cleanTitle: string;
  dueDate?: Date;
  priority?: 1 | 2 | 3 | 4;
  projectId?: string;
  labelIds?: string[];
  parsedTokens: ParsedToken[];
}

// --- Priority patterns (order matters — longer phrases first) ---

const PRIORITY_PATTERNS: { pattern: RegExp; value: 1 | 2 | 3 | 4 }[] = [
  // P1
  { pattern: /(?:^|\s)(?:p1|!1|urgent|critical)(?:\s|$)/i, value: 1 },
  // P2
  { pattern: /(?:^|\s)(?:p2|!2|high\s+priority|important)(?:\s|$)/i, value: 2 },
  // P3
  { pattern: /(?:^|\s)(?:p3|!3|medium\s+priority)(?:\s|$)/i, value: 3 },
  // P4
  { pattern: /(?:^|\s)(?:p4|!4|low\s+priority)(?:\s|$)/i, value: 4 },
];

// --- Shorthand date keywords chrono may not handle ---

const DATE_SHORTHANDS: { pattern: RegExp; resolve: (now: Date) => Date }[] = [
  {
    pattern: /\btod\b/i,
    resolve: (now) => {
      const d = new Date(now);
      d.setHours(23, 59, 0, 0);
      return d;
    },
  },
  {
    pattern: /\btom\b/i,
    resolve: (now) => {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      d.setHours(23, 59, 0, 0);
      return d;
    },
  },
  {
    pattern: /\b(?:eod|end\s+of\s+day)\b/i,
    resolve: (now) => {
      const d = new Date(now);
      d.setHours(17, 0, 0, 0);
      return d;
    },
  },
  {
    pattern: /\b(?:eow|end\s+of\s+week)\b/i,
    resolve: (now) => {
      const d = new Date(now);
      const dayOfWeek = d.getDay();
      const daysToFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 6; // 0=Sun
      d.setDate(d.getDate() + daysToFriday);
      d.setHours(17, 0, 0, 0);
      return d;
    },
  },
];

// --- Core parser ---

/**
 * Parse a natural language task input string into structured task metadata.
 * Pure function — no side effects. Extracts priority, projects, labels, and
 * dates from the text and returns a clean title with all parsed tokens removed.
 */
export function parseTaskInput(
  text: string,
  projects: Pick<Project, 'id' | 'name'>[],
  labels: Pick<Label, 'id' | 'name'>[],
  referenceDate?: Date,
): ParsedTask {
  const tokens: ParsedToken[] = [];
  let remaining = text;
  let priority: 1 | 2 | 3 | 4 | undefined;
  let projectId: string | undefined;
  const labelIds: string[] = [];
  let dueDate: Date | undefined;

  const now = referenceDate ?? new Date();

  // 1. Extract priority keywords
  for (const { pattern, value } of PRIORITY_PATTERNS) {
    const match = pattern.exec(remaining);
    if (match) {
      priority = value;
      // Trim surrounding whitespace from the matched text
      const matchedText = match[0].trim();
      const leadingSpaces = match[0].length - match[0].trimStart().length;
      const tokenStart = match.index + leadingSpaces;
      tokens.push({
        text: matchedText,
        start: tokenStart,
        end: tokenStart + matchedText.length,
        type: 'priority',
      });
      remaining = remaining.slice(0, match.index) + remaining.slice(match.index + match[0].length);
      break; // first match wins
    }
  }

  // 2. Extract project tags — #ProjectName (case-insensitive match against existing projects)
  const projectPattern = /#(\S+)/g;
  let projectMatch: RegExpExecArray | null;
  const projectRemovals: { start: number; end: number }[] = [];
  // Reset lastIndex
  projectPattern.lastIndex = 0;
  while ((projectMatch = projectPattern.exec(remaining)) !== null) {
    const tagName = projectMatch[1];
    const matched = projects.find(
      (p) => p.name.toLowerCase() === tagName.toLowerCase(),
    );
    if (matched && !projectId) {
      projectId = matched.id;
      tokens.push({
        text: projectMatch[0],
        start: projectMatch.index,
        end: projectMatch.index + projectMatch[0].length,
        type: 'project',
      });
      projectRemovals.push({
        start: projectMatch.index,
        end: projectMatch.index + projectMatch[0].length,
      });
    }
    // Unmatched #tags stay in the title
  }
  // Remove matched project tags from remaining (reverse order to preserve indices)
  for (const removal of projectRemovals.reverse()) {
    remaining = remaining.slice(0, removal.start) + remaining.slice(removal.end);
  }

  // 3. Extract label tags — @labelName
  const labelPattern = /@(\S+)/g;
  let labelMatch: RegExpExecArray | null;
  const labelRemovals: { start: number; end: number }[] = [];
  labelPattern.lastIndex = 0;
  while ((labelMatch = labelPattern.exec(remaining)) !== null) {
    const tagName = labelMatch[1];
    const matched = labels.find(
      (l) => l.name.toLowerCase() === tagName.toLowerCase(),
    );
    if (matched) {
      labelIds.push(matched.id);
      tokens.push({
        text: labelMatch[0],
        start: labelMatch.index,
        end: labelMatch.index + labelMatch[0].length,
        type: 'label',
      });
      labelRemovals.push({
        start: labelMatch.index,
        end: labelMatch.index + labelMatch[0].length,
      });
    }
    // Unmatched @tags stay in the title
  }
  for (const removal of labelRemovals.reverse()) {
    remaining = remaining.slice(0, removal.start) + remaining.slice(removal.end);
  }

  // 4. Extract dates — first check shorthands, then chrono
  for (const { pattern, resolve } of DATE_SHORTHANDS) {
    const match = pattern.exec(remaining);
    if (match) {
      dueDate = resolve(now);
      tokens.push({
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
        type: 'date',
      });
      remaining = remaining.slice(0, match.index) + remaining.slice(match.index + match[0].length);
      break;
    }
  }

  if (!dueDate) {
    const chronoResults = chrono.parse(remaining, now, { forwardDate: true });
    if (chronoResults.length > 0) {
      // Use the LAST date found (spec: most likely intentional)
      const lastResult = chronoResults[chronoResults.length - 1];
      dueDate = lastResult.start.date();
      tokens.push({
        text: lastResult.text,
        start: lastResult.index,
        end: lastResult.index + lastResult.text.length,
        type: 'date',
      });
      remaining =
        remaining.slice(0, lastResult.index) +
        remaining.slice(lastResult.index + lastResult.text.length);
    }
  }

  // 5. Build clean title — collapse whitespace, trim
  const cleanTitle = remaining.replace(/\s+/g, ' ').trim();

  // 6. Recalculate token positions relative to the ORIGINAL text
  //    (tokens were recorded at their position in intermediate strings,
  //     but the UI needs positions in the original input)
  const originalTokens = recalculateTokenPositions(text, tokens);

  return {
    cleanTitle,
    dueDate,
    priority,
    projectId,
    labelIds: labelIds.length > 0 ? labelIds : undefined,
    parsedTokens: originalTokens,
  };
}

/**
 * Re-derive token positions by finding each token's text in the original input.
 * We search from the end to avoid false-positive matches when the same word
 * appears multiple times (metadata tends to be at the end).
 */
function recalculateTokenPositions(
  originalText: string,
  tokens: ParsedToken[],
): ParsedToken[] {
  const lowerOriginal = originalText.toLowerCase();
  const used = new Set<number>(); // track used start positions to avoid overlap

  return tokens.map((token) => {
    const lowerToken = token.text.toLowerCase();
    // Search for the token in the original text, preferring later occurrences
    let searchFrom = lowerOriginal.length;
    let bestStart = -1;

    while (searchFrom > 0) {
      const idx = lowerOriginal.lastIndexOf(lowerToken, searchFrom - 1);
      if (idx === -1) break;
      if (!used.has(idx)) {
        bestStart = idx;
        break;
      }
      searchFrom = idx;
    }

    if (bestStart === -1) {
      // Fallback: just use what we had
      return token;
    }

    used.add(bestStart);
    return {
      ...token,
      start: bestStart,
      end: bestStart + token.text.length,
    };
  });
}
