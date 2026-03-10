# Phase 3 — Views

## Context

**Prerequisites**: Phase 1 (Dark Mode, Sections, Subtasks, Drag-and-Drop) and Phase 2 (Recurring Dates, Reminders, Filters, Archive) should be completed first. Phase 3 transforms the single list view into a multi-view system, leveraging the `@dnd-kit` drag infrastructure from Phase 1, sections from Phase 1, and `completedAt` / `recurrence` fields from Phase 2.

**Stack recap**: React 18 + TypeScript + Vite + Firebase + Zustand + Tailwind CSS 3 + `framer-motion` + `date-fns` + `@dnd-kit` (installed in Phase 1).

---

## Architecture: View Switching System

Before building individual views, we need a **view switcher** that all three features share.

### UX Spec
- **View toggle bar** in the [MainContent](file:///Users/haibinzh/mine/react/TodoList/src/components/layout/MainContent.tsx#7-67) header (right side, next to search): icon buttons for [List](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskList.tsx#7-127) | `Board` | `Calendar`
- Available views depend on context:
  - **Inbox / Project / Label / Filter views**: List + Board
  - **Today view**: List only (single day doesn't benefit from calendar/board)
  - **Upcoming view**: List + Calendar (special enhanced timeline)
- Active view icon is highlighted; inactive ones are muted
- View preference is **per-navigation-context** and persisted in `localStorage` (e.g., "Project X → Board" stays Board next time you visit Project X)
- **Smooth transition** between views using `framer-motion` `AnimatePresence` (fade + slight slide)

### Data Model

```typescript
// Add to types/index.ts
export type TaskViewMode = 'list' | 'board' | 'calendar';
```

### Implementation

#### New Files
- `src/components/layout/ViewSwitcher.tsx` — toggle bar component with List/Board/Calendar icons
- `src/hooks/useViewPreference.ts` — reads/writes per-context view preference to `localStorage`

#### Files to Update
- [types/index.ts](file:///Users/haibinzh/mine/react/TodoList/src/types/index.ts) — add `TaskViewMode`
- [taskStore.ts](file:///Users/haibinzh/mine/react/TodoList/src/store/taskStore.ts) — add `currentViewMode: TaskViewMode` state + `setCurrentViewMode` action
- [MainContent.tsx](file:///Users/haibinzh/mine/react/TodoList/src/components/layout/MainContent.tsx) — render `ViewSwitcher` in header; conditionally render [TaskList](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskList.tsx#7-127) / `BoardView` / `CalendarView` based on `currentViewMode`

---

## Feature 1: Calendar View

### Why
Due dates are the backbone of task management, but list views show them as tiny text labels. A calendar view gives users **spatial awareness** of their schedule — clusters of tasks on certain days become immediately visible. **Better than Todoist**: we support **inline task creation** by clicking on any empty day cell (Todoist requires navigating away to add), and we show **task density dots** on the month overview for at-a-glance load balancing.

### User Stories
- As a user, I want to see my tasks laid out on a monthly calendar grid
- As a user, I want to switch between month and week views
- As a user, I want to click an empty day to create a task with that due date pre-filled
- As a user, I want to drag a task from one day to another to reschedule it
- As a user, I want to see task density at a glance (dots/count on each day)
- As a user, I want to navigate between months/weeks with prev/next arrows

### UX Spec

#### Month View
- Standard 7-column grid (Sun–Sat or Mon–Sun based on locale)
- Each **day cell** shows:
  - Date number (bold if today, muted if outside current month)
  - Up to **3 task pills** (truncated title, color-coded by priority)
  - "+N more" link if > 3 tasks
  - **Density dot** in the date number area: green (1-3 tasks), yellow (4-6), red (7+)
- Clicking a task pill opens inline edit (same as list view)
- Clicking **empty space** in a day cell opens a mini [TaskForm](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskForm.tsx#7-139) with that date pre-filled
- **Today** is highlighted with a colored border or background

#### Week View
- 7-column grid but with full vertical space per day
- Shows **all tasks** in each day (scrollable if many)
- Tasks show title, priority stripe, and subtask count
- More room for detail than month view

#### Drag-to-Reschedule
- Drag a task pill from one day cell to another → updates `dueDate` in Firestore
- Uses `@dnd-kit` with each day cell as a `useDroppable` target
- Drop zone highlights with a subtle border color on hover
- Animated return if dropped outside any day cell

#### Navigation
- **Header**: `< March 2026 >` with prev/next arrows
- **Today button**: jumps back to current month/week
- **Month/Week toggle**: segmented control in corner

### Implementation Details

#### New Files
- `src/components/views/CalendarView.tsx` — main calendar container, handles month/week toggle and navigation
- `src/components/views/calendar/MonthGrid.tsx` — 7×5/6 grid with day cells
- `src/components/views/calendar/WeekGrid.tsx` — 7-column expanded day view
- `src/components/views/calendar/DayCell.tsx` — individual day: renders task pills, density dot, droppable target
- `src/components/views/calendar/TaskPill.tsx` — compact draggable task representation for calendar
- `src/components/views/calendar/InlineDateTaskForm.tsx` — mini task creation form pinned to a day cell
- `src/utils/calendar.ts` — pure helpers: `getMonthGrid(year, month)`, `getWeekDays(date)`, `getDayTasks(tasks, date)`

#### Files to Update
- [MainContent.tsx](file:///Users/haibinzh/mine/react/TodoList/src/components/layout/MainContent.tsx) — render `CalendarView` when `currentViewMode === 'calendar'`
- [taskService.ts](file:///Users/haibinzh/mine/react/TodoList/src/services/taskService.ts) — use existing [updateTask](file:///Users/haibinzh/mine/react/TodoList/src/store/taskStore.ts#45-50) for rescheduling (update `dueDate`)

### Acceptance Criteria
- [ ] Month grid renders correctly with weeks aligned to the calendar
- [ ] Tasks appear as colored pills on their due dates
- [ ] Density dots show on days with tasks (green/yellow/red)
- [ ] "+N more" shown when a day has > 3 tasks in month view
- [ ] Clicking empty day space opens inline task form with that date pre-filled
- [ ] Dragging a task pill to another day updates `dueDate` in Firestore
- [ ] Month/Week toggle switches layout smoothly
- [ ] Prev/Next navigation and "Today" button work correctly
- [ ] Today is visually highlighted
- [ ] Dark mode support from the start

---

## Feature 2: Board / Kanban View

### Why
Kanban boards are the standard for project management workflows. They turn a linear task list into a spatial workflow where progress is visible at a glance. **Better than Todoist**: we support **configurable column sources** (group by section, priority, or status — Todoist only supports sections), **WIP limits** (highlight columns with too many tasks), and **swimlanes** by priority within each column.

### User Stories
- As a user, I want to see my tasks in a Kanban board layout
- As a user, I want to choose what defines columns (sections, priority levels, or status)
- As a user, I want to drag tasks between columns to change their grouping
- As a user, I want to set WIP limits on columns and see warnings when exceeded
- As a user, I want to create tasks directly in a column
- As a user, I want to collapse/expand columns

### UX Spec

#### Board Layout
- **Horizontal scrolling** container with columns
- Each **column** has:
  - Header: column title + task count badge + collapse toggle + "..." menu
  - Task cards stacked vertically (same info as [TaskItem](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskItem.tsx#18-225) but card layout)
  - "Add task" button at the bottom of each column
- Columns are **scrollable vertically** when they overflow

#### Column Sources (configurable via dropdown in the view header)
| Source | Columns | Drag Effect |
|--------|---------|------------|
| **Sections** (default for projects) | One per section + "No section" | Moving a task changes its `sectionId` |
| **Priority** | P1, P2, P3, P4 | Moving a task changes its `priority` |
| **Status** | Active, Completed | Moving a task toggles `completed` |

#### WIP Limits
- Configurable per column via "..." menu → "Set WIP limit"
- When column exceeds limit: header turns amber, a warning icon appears
- Visual only — doesn't block adding tasks

#### Drag Between Columns
- Uses `@dnd-kit` `DndContext` with horizontal + vertical axes
- Drag a task card → it lifts with shadow → drop into another column → updates the relevant field
- Within a column, drag to reorder (uses `sortOrder` from Phase 1)
- Cross-column drop inserts at the drop position

#### Column Collapse
- Click the collapse toggle → column shrinks to just its header (rotated 90° title)
- Collapsed columns still show the task count badge
- Collapsed state persisted in `localStorage`

### Implementation Details

#### New Files
- `src/components/views/BoardView.tsx` — main board container, handles column source selection, horizontal scroll
- `src/components/views/board/BoardColumn.tsx` — single column: header, task list, add button, droppable container
- `src/components/views/board/BoardCard.tsx` — task card (compact layout adapted from [TaskItem](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskItem.tsx#18-225))
- `src/components/views/board/ColumnHeader.tsx` — title, count badge, WIP indicator, collapse toggle, "..." menu
- `src/components/views/board/ColumnSourcePicker.tsx` — dropdown to switch between sections/priority/status grouping
- `src/components/views/board/WipLimitDialog.tsx` — popover to set WIP limit for a column
- `src/utils/board.ts` — pure helpers: `groupTasksBySource(tasks, source, sections)`, `getColumnDef(source)`

#### Files to Update
- [MainContent.tsx](file:///Users/haibinzh/mine/react/TodoList/src/components/layout/MainContent.tsx) — render `BoardView` when `currentViewMode === 'board'`
- [taskService.ts](file:///Users/haibinzh/mine/react/TodoList/src/services/taskService.ts) — use existing [updateTask](file:///Users/haibinzh/mine/react/TodoList/src/store/taskStore.ts#45-50) for field changes on cross-column drag
- [taskStore.ts](file:///Users/haibinzh/mine/react/TodoList/src/store/taskStore.ts) — add `boardColumnSource` state + `setBoardColumnSource` action

### Acceptance Criteria
- [ ] Board renders with horizontal-scrolling columns
- [ ] Default column source is "Sections" when in a project view
- [ ] Can switch column source between Sections / Priority / Status
- [ ] Dragging a task between columns updates the correct field (`sectionId`, `priority`, or `completed`)
- [ ] Dragging within a column reorders tasks (updates `sortOrder`)
- [ ] WIP limit can be set per column; amber warning shows when exceeded
- [ ] Columns can be collapsed/expanded; state persists in localStorage
- [ ] "Add task" at bottom of each column creates a task in that column's context
- [ ] Task cards show title, priority stripe, due date, subtask count
- [ ] Dark mode support from the start

---

## Feature 3: Enhanced Upcoming View

### Why
The current Upcoming view is a flat list of all future-dated tasks. It's useful but doesn't help with **scheduling** — seeing what's due on which day and rebalancing load. **Better than Todoist**: we build a **scrollable timeline** with day headers, a **drag-to-reschedule** mechanism between day groups, an **overdue tasks** pinned section at the top, and a **scope toggle** (7 days / 2 weeks / month).

### User Stories
- As a user, I want to see upcoming tasks grouped by day with clear date headers
- As a user, I want to drag a task from one day to another to reschedule it
- As a user, I want overdue tasks highlighted at the top of the view
- As a user, I want to toggle the time scope (7 days, 14 days, 30 days)
- As a user, I want to see empty days so I know when I have free capacity
- As a user, I want tasks without dates to appear in a "No date" section at the bottom

### UX Spec

#### Timeline Layout
- **Vertical scrollable** container
- **Overdue section** (pinned at top, red header): tasks with `dueDate < today`, sorted by how late they are
- **Day groups**: one section per day for the selected scope
  - **Day header**: "Monday, March 10" (bold, sticky within scroll), task count badge
  - Tasks listed below in `sortOrder` (or priority if no custom sort)
  - **Empty days** still render with a muted "No tasks" placeholder — important for seeing gaps
- **No date section** (at bottom, gray header): tasks with no `dueDate`
- **Today** header gets a special highlight (colored bar, "Today" label)

#### Scope Toggle
- **Segmented control** in the view header: `7 days` | `2 weeks` | `1 month`
- Default: 7 days
- Preference persists in `localStorage`

#### Drag-to-Reschedule
- Drag a task from any day group → drop onto another day's header or task area → updates `dueDate`
- Can drag **from** the Overdue section to reschedule overdue tasks
- Can drag **from** "No date" section to assign a due date
- Each day group is a `useDroppable` target
- Drop indicator: colored bar at the insertion point

#### Day Header Actions
- Click on a day header → expands/collapses that day (to reduce visual noise)
- "+" button on each day header → creates a task with that date pre-filled

### Implementation Details

#### New Files
- `src/components/views/UpcomingView.tsx` — main container: scope toggle, scroll container, day groups
- `src/components/views/upcoming/DayGroup.tsx` — sticky header + task list + droppable target + add button
- `src/components/views/upcoming/OverdueSection.tsx` — pinned section for overdue tasks with warning styling
- `src/components/views/upcoming/NoDateSection.tsx` — bottom section for undated tasks
- `src/components/views/upcoming/ScopeToggle.tsx` — 7d/14d/30d segmented control
- `src/utils/upcoming.ts` — pure helpers: `groupTasksByDay(tasks, scope)`, `getOverdueTasks(tasks)`, `getDateRange(scope)`

#### Files to Update
- [MainContent.tsx](file:///Users/haibinzh/mine/react/TodoList/src/components/layout/MainContent.tsx) — render `UpcomingView` instead of [TaskList](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskList.tsx#7-127) when `currentView === 'upcoming'`
- [TaskList.tsx](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskList.tsx) — remove the `'upcoming'` case from the existing filter switch (moved to its own component)
- [Sidebar.tsx](file:///Users/haibinzh/mine/react/TodoList/src/components/layout/Sidebar.tsx) — upcoming count should include overdue tasks (update [getTaskCount('upcoming')](file:///Users/haibinzh/mine/react/TodoList/src/components/layout/Sidebar.tsx#22-51))

### Acceptance Criteria
- [ ] Tasks are grouped by day with sticky date headers
- [ ] Overdue section appears at the top with red styling when overdue tasks exist
- [ ] Empty days render with "No tasks" placeholder within the scope
- [ ] Today's group has a special visual highlight
- [ ] "No date" section appears at bottom for undated tasks
- [ ] Scope toggle switches between 7 / 14 / 30 days; default is 7
- [ ] Dragging a task between day groups updates `dueDate` in Firestore
- [ ] Dragging from "No date" to a day assigns a `dueDate`
- [ ] Dragging from "Overdue" to a future day reschedules the task
- [ ] "+" button on each day header creates a task with that date pre-filled
- [ ] Dark mode support from the start

---

## Implementation Order

> [!IMPORTANT]
> Build in this order:

1. **View Switcher System** — the shared infrastructure. Without this, no view can be rendered. Small scope: just the toggle bar, `TaskViewMode` type, and conditional rendering in [MainContent](file:///Users/haibinzh/mine/react/TodoList/src/components/layout/MainContent.tsx#7-67).
2. **Enhanced Upcoming View** — replaces the existing basic Upcoming. Lower complexity since it's a vertical list (not a grid). Builds the day-grouping and drag-to-reschedule patterns that Calendar reuses.
3. **Calendar View** — reuses day-grouping utils from Upcoming. Month grid is the most visual component. Week view shares the same data layer.
4. **Board/Kanban View** — most complex. Requires column source logic, cross-column drag, WIP limits. Build last so all drag infrastructure is battle-tested.

---

## Shared Utilities

Several pure-function utilities are shared across views. Create these in `src/utils/`:

| File | Functions | Used By |
|------|-----------|---------|
| `calendar.ts` | `getMonthGrid()`, `getWeekDays()`, `isSameDay()`, `getDaysInRange()` | Calendar, Upcoming |
| `upcoming.ts` | `groupTasksByDay()`, `getOverdueTasks()`, `getDateRange()` | Upcoming, Calendar |
| `board.ts` | `groupTasksBySource()`, `getColumnDef()` | Board |

> [!TIP]
> `date-fns` (already installed) provides most date utilities. Prefer its functions (`startOfDay`, `eachDayOfInterval`, `isSameDay`, [format](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskItem.tsx#73-78)) over custom implementations to reduce bugs and bundle size.

---

## Verification Plan

### Unit Tests (Vitest)

Run with:
```bash
cd /Users/haibinzh/mine/react/TodoList && npm test
```

| Test File | What It Verifies |
|-----------|-----------------|
| `src/utils/__tests__/calendar.test.ts` | `getMonthGrid()` returns correct 5-6 week grids, handles month boundaries, first-day-of-week config |
| `src/utils/__tests__/upcoming.test.ts` | `groupTasksByDay()` groups correctly, `getOverdueTasks()` identifies past-due tasks, empty days included |
| `src/utils/__tests__/board.test.ts` | `groupTasksBySource()` for sections/priority/status, handles tasks with missing fields |
| `src/hooks/__tests__/useViewPreference.test.ts` | localStorage read/write per context, fallback to default |

### Manual Testing

After implementation, verify these flows in dev (`npm run dev`):

1. **View Switcher**: Open a project → click Board icon → verify board renders → click List → verify list renders → refresh page → verify Board is remembered for that project. Open Inbox → verify only List/Board are available (no Calendar).

2. **Calendar (Month)**: Switch to Calendar → verify current month grid → click prev/next → verify month changes → click "Today" → verify jumps back. Create a task with a due date → verify it appears as a pill on that day. Drag the pill to next week → verify date updates. Click an empty day → verify task form opens with that date. Check "+N more" on a day with 4+ tasks.

3. **Calendar (Week)**: Toggle to Week → verify 7-day layout with full task cards. Navigate weeks. Drag between days.

4. **Board**: Open a project with sections → verify columns match sections. Drag a task from "To Do" column to "Done" → verify `sectionId` updates. Switch column source to Priority → verify 4 columns (P1-P4) appear. Set WIP limit of 3 on P2 column → add 4 tasks → verify amber warning. Collapse a column → refresh → verify it stays collapsed.

5. **Upcoming**: Open Upcoming → verify day groups with sticky headers. Create past-due task → verify it appears in red "Overdue" section. Drag it to tomorrow → verify date updates and it moves to tomorrow's group. Toggle scope to 30 days → verify more days appear. Create a task with no date → verify it appears in "No date" section. Drag it to a day → verify `dueDate` is assigned.
