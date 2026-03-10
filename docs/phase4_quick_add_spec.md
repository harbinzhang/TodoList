# Quick Add — Product Spec

## Problem Statement

Adding a task in the current app requires expanding a form, then manually filling 4 separate fields (title, description, date picker, priority dropdown). This high-friction flow discourages users from capturing tasks in the moment — exactly when they're most likely to forget them.

**Goal**: Let users type a single natural sentence and have the app intelligently extract all task metadata, turning 4 interactions into 1.

---

## Design Philosophy

> **Don't copy Todoist. Be smarter about it.**

Todoist uses inline syntax markers (`p1`, `#Project`, `@label`). This works for power users who memorize the syntax, but creates a learning curve. Our approach:

1. **Smart parsing with visual feedback** — parse as the user types, show extracted metadata as live preview chips below the input
2. **Chips are editable** — user can click any chip to override what was parsed
3. **Zero syntax to memorize** — natural phrases like "tomorrow", "next friday", "high priority" just work
4. **Graceful degradation** — if parsing fails, it's just a normal task title. Nothing breaks.

---

## User Experience

### Entry Points

| Trigger | Behavior |
|---------|----------|
| Click "Add task" button (sidebar or main area) | Opens Quick Add inline |
| Press `Q` anywhere (global hotkey) | Opens Quick Add as a floating modal overlay |
| Press `Enter` while Quick Add is focused | Submits the task |
| Press `Escape` | Dismisses Quick Add |

### The Input Flow

```
┌─────────────────────────────────────────────────────────┐
│ 💬  Buy groceries tomorrow at 5pm high priority #Work   │
│                                                         │
│  📅 Tomorrow, 5:00 PM   🔴 P1   📁 Work                │
│                          ↑ click any chip to change     │
│                                                         │
│                              [Cancel]  [Add task]       │
└─────────────────────────────────────────────────────────┘
```

**As the user types**, the bottom chip bar updates in real-time:

1. User types: `Buy groceries` → Title: "Buy groceries", no chips yet
2. User types: `tomorrow` → 📅 chip appears: "Tomorrow"
3. User types: `at 5pm` → 📅 chip updates: "Tomorrow, 5:00 PM"
4. User types: `high priority` → 🔴 chip appears: "P1"
5. User types: `#Work` → 📁 chip appears: "Work"

**The parsed tokens are visually dimmed** in the input text (lighter color) so the user can see what's being treated as the title vs. metadata. The clean title shown after submission would be: "Buy groceries".

### Chip Interaction

- **Click a chip** → opens a small inline editor (date picker for dates, dropdown for priority/project/label)
- **Click ✕ on a chip** → removes that metadata; the parsed text remains in the input but stops being dimmed
- **Manually add chip** → small `+` button at end of chip bar opens a menu: Date, Priority, Project, Label

---

## Natural Language Parsing Rules

### Dates & Times

| User types | Parsed as |
|------------|-----------|
| `today` | Today's date |
| `tomorrow` / `tmr` | Tomorrow |
| `monday` / `mon` / `next monday` | Next occurrence of that weekday |
| `jan 15` / `january 15` / `1/15` | January 15 (current or next year) |
| `next week` | Next Monday |
| `in 3 days` | 3 days from now |
| `at 3pm` / `at 15:00` | Time (attached to date, or today if no date) |
| `end of day` / `eod` | Today at 5:00 PM |
| `end of week` / `eow` | Friday at 5:00 PM |

> [!IMPORTANT]
> Date parsing should use the `chrono-node` library — a mature, battle-tested NLP date parser that handles edge cases we shouldn't reinvent.

### Priority

| User types | Parsed as |
|------------|-----------|
| `p1` / `!1` / `urgent` / `critical` | Priority 1 (🔴) |
| `p2` / `!2` / `high priority` / `important` | Priority 2 (🟠) |
| `p3` / `!3` / `medium priority` | Priority 3 (🔵) |
| `p4` / `!4` / `low priority` | Priority 4 (default, no chip shown) |

### Projects

| User types | Parsed as |
|------------|-----------|
| `#Work` / `#work` | Matched against existing project names (case-insensitive) |
| `#My Project` | Multi-word: matches "My Project" if it exists |

> [!NOTE]
> Only match against the user's **existing** projects. Unknown project names stay as part of the title.

### Labels

| User types | Parsed as |
|------------|-----------|
| `@email` / `@urgent` | Matched against existing labels (case-insensitive) |
| Multiple labels allowed: `@email @followup` | Both labels applied |

---

## Architecture

### New Files

| File | Purpose |
|------|---------|
| `src/utils/taskParser.ts` | Pure function: `parseTaskInput(text, projects, labels) → ParsedTask` |
| `src/utils/__tests__/taskParser.test.ts` | Comprehensive unit tests for the parser |
| `src/components/tasks/QuickAdd.tsx` | The Quick Add component with live preview |
| `src/components/tasks/MetadataChip.tsx` | Reusable chip component for parsed metadata |
| `src/hooks/useQuickAdd.ts` | Hook managing Quick Add state, global hotkey, and parsing |

### Modified Files

| File | Change |
|------|--------|
| [src/components/tasks/TaskForm.tsx](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskForm.tsx) | Integrate Quick Add as the primary input mode; keep manual form as a "detailed" fallback via a toggle |
| [src/components/layout/MainContent.tsx](file:///Users/haibinzh/mine/react/TodoList/src/components/layout/MainContent.tsx) | Add global `Q` hotkey listener for floating Quick Add |
| [package.json](file:///Users/haibinzh/mine/react/TodoList/package.json) | Add `chrono-node` dependency |

### Core Data Flow

```
User types text
       │
       ▼
useQuickAdd hook (debounced 150ms)
       │
       ▼
taskParser.parseTaskInput(text, projects, labels)
       │
       ▼
Returns: {
  cleanTitle: string        // text with parsed tokens removed
  dueDate?: Date
  priority?: 1|2|3|4
  projectId?: string
  labelIds?: string[]
  parsedTokens: {           // for visual highlighting
    text: string
    start: number
    end: number
    type: 'date'|'priority'|'project'|'label'
  }[]
}
       │
       ▼
QuickAdd renders chips + dimmed tokens in input
       │
       ▼
On submit → taskService.createTask({ ...parsedResult })
```

### Parser Design Principles

1. **Pure function** — no side effects, easy to test
2. **Parse from right to left** — metadata tends to be at the end of input
3. **Priority: explicit > implicit** — `#Work` always wins over a fuzzy match. Clicking a chip always overrides parsing.
4. **User overrides are final** — if user clicks a chip and changes the date, further typing won't overwrite it

---

## Interaction Details

### Quick Add Modal (global `Q` hotkey)

- Centered overlay with backdrop blur
- Animated entrance with `framer-motion` (already a dependency)
- Auto-focuses the input field
- Shows project/label context if invoked from a project or label view
- `Escape` to dismiss, `Cmd+Enter` to submit

### Inline Quick Add (replaces current TaskForm expand)

- Same parsing behavior as the modal
- Appears in-place where the "Add task" button was
- After submission, stays open for rapid multi-task entry (unlike current behavior which collapses)
- `Escape` to collapse back to button

### Empty State Guidance

When the input is focused but empty, show a subtle hint:

```
Try: "Buy groceries tomorrow p2 #Personal"
```

This teaches the syntax through example rather than documentation.

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Text contains "tomorrow" as part of a title (e.g., "Read Tomorrow Never Dies") | If the word is in quotes, treat as title. Otherwise, parse as date — user can click ✕ on the date chip to remove |
| Multiple dates in text | Use the **last** date found (most likely intentional) |
| Project name doesn't exist | Treat `#unknown` as part of the title |
| User manually sets date via chip, then types a date word | Manual override wins — don't re-parse the date |
| Empty title after removing parsed tokens | Disable submit button, show "Task name required" hint |
| Very long input | Truncate chip bar with `+N more` if needed |

---

## Verification Plan

### Automated Tests

The parser is a pure function — this is where most test coverage should live:

**Run**: `npm test -- --run src/utils/__tests__/taskParser.test.ts`

Test cases to cover:
- Plain text (no metadata) → returns title only
- Date extraction: "tomorrow", "next friday", "jan 15", "in 3 days"
- Time extraction: "at 3pm", "at 15:00"
- Priority extraction: "p1", "high priority", "urgent"
- Project matching: "#Work" against `[{name: "Work", id: "1"}]`
- Label matching: "@email" against `[{name: "email", id: "2"}]`
- Combined: "Buy milk tomorrow p2 #Personal @errands"
- Edge: no metadata at all
- Edge: metadata only (should result in empty title → validation catches this)
- Edge: unmatched project/label stays in title
- Token positions are correct for highlighting

**Run**: `npm test -- --run src/components/tasks/__tests__/TaskForm.test.tsx`

Existing 7 TaskForm tests must still pass after refactor.

### Manual Verification

1. Start the dev server with `npm run dev`
2. Log in and navigate to Inbox
3. Click "Add task" — should see the new Quick Add input with hint text
4. Type "Buy groceries tomorrow p2 #Personal" — verify chips appear live
5. Press Enter — verify task is created with correct date, priority, project
6. Press `Q` from any view — verify floating modal appears
7. Press `Escape` — verify modal dismisses
8. Type a title with no metadata — verify it works like a normal task creation
