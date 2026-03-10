# Phase 2 — Power Features

## Context

**Prerequisite**: Phase 1 (Dark Mode, Sections, Subtasks, Drag-and-Drop) should be completed first. Phase 2 adds intelligence and workflow power on top of that foundation.

**Stack recap**: React 18 + TypeScript + Vite + Firebase (Firestore, Auth, Cloud Functions on Node 22) + Zustand + Tailwind CSS 3 + `framer-motion` + `date-fns`.

**Cloud Functions**: already set up at [functions/src/index.ts](file:///Users/haibinzh/mine/react/TodoList/functions/src/index.ts) with `firebase-functions` v6 and `firebase-admin` v12. Currently empty — ready for new functions.

---

## Feature 1: Recurring Due Dates

### Why
One-off due dates cover only half of real task management. Habits ("Exercise every Mon/Wed/Fri"), routines ("Pay rent on the 1st"), and review cycles ("Weekly report every Friday") all need recurrence. **Better than Todoist**: instead of requiring users to type natural language like "every 2 weeks", we provide a **visual recurrence picker** with presets + custom builder, making it accessible to casual users while still supporting power-user patterns.

### User Stories
- As a user, I want to set a task to repeat on a schedule
- As a user, I want common presets (Daily, Weekdays, Weekly, Monthly) for quick setup
- As a user, I want to build custom patterns like "every 2 weeks on Tue & Thu"
- As a user, when I complete a recurring task, I want the next instance to appear automatically
- As a user, I want to end recurrence after a date or after N occurrences

### UX Spec

#### Recurrence Picker (in TaskForm)
- **Trigger**: a 🔁 repeat icon button next to the date picker in [TaskForm.tsx](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskForm.tsx)
- **Popover** (not modal — keep flow uninterrupted) with:
  - **Presets row**: `Daily` | `Weekdays` | `Weekly` | `Monthly` | `Yearly` — single click to select
  - **Custom builder** (expandable): frequency dropdown (`day`/`week`/`month`/`year`) + interval input (e.g., "every **2** weeks") + day-of-week multi-select (for weekly) + end condition (`never` / `on date` / `after N times`)
- **Visual badge** on the task: "🔁 Every weekday" or "🔁 Monthly" shown in the task meta row

#### Completion Behavior
- When user completes a recurring task, the system:
  1. Marks the current instance as completed (moves to archive)
  2. Computes the **next due date** based on the recurrence rule
  3. Creates a new task with the same title, description, project, labels, priority, and the new due date
  4. Shows a brief toast: "Next: [date]"
- This logic runs **client-side** for instant feedback (no cloud function needed)

### Data Model Changes

```typescript
// Add to types/index.ts
export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;           // e.g., 2 = "every 2 weeks"
  daysOfWeek?: number[];      // 0=Sun, 1=Mon, ..., 6=Sat (for weekly)
  dayOfMonth?: number;        // 1-31 (for monthly)
  endDate?: Date;             // optional end
  endAfterCount?: number;     // optional: stop after N occurrences
  completedCount?: number;    // tracks how many have been completed
}

// Update Task interface
export interface Task {
  // ... existing fields
  recurrence?: RecurrenceRule;  // NEW
}
```

### Implementation Details

#### New Files
- `src/components/tasks/RecurrencePicker.tsx` — popover with presets + custom builder
- `src/utils/recurrence.ts` — pure functions: `getNextDueDate(currentDue, rule)`, `formatRecurrenceLabel(rule)`, `isRecurrenceComplete(rule)`

#### Files to Update
- [types/index.ts](file:///Users/haibinzh/mine/react/TodoList/src/types/index.ts) — add `RecurrenceRule`, add `recurrence?` to [Task](file:///Users/haibinzh/mine/react/TodoList/src/types/index.ts#8-22)
- [TaskForm.tsx](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskForm.tsx) — add repeat icon + `RecurrencePicker` popover, store `recurrence` state
- [TaskItem.tsx](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskItem.tsx) — show "🔁 [label]" badge in meta row; override [handleToggleComplete](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskItem.tsx#22-29) for recurring tasks to create next instance
- [taskService.ts](file:///Users/haibinzh/mine/react/TodoList/src/services/taskService.ts) — add `completeRecurringTask(task)` that marks current as done + creates next instance in a batch write

### Acceptance Criteria
- [ ] Can set recurrence via preset buttons (Daily, Weekdays, Weekly, Monthly, Yearly)
- [ ] Can build custom recurrence (e.g., "every 2 weeks on Mon & Wed")
- [ ] Recurrence badge displays on the task
- [ ] Completing a recurring task creates the next instance with the correct due date
- [ ] End conditions work: `endDate` stops creating new tasks past that date, `endAfterCount` stops after N completions
- [ ] Recurrence data persists in Firestore and syncs real-time

---

## Feature 2: Smart Reminders

### Why
Due dates are passive — users only know something is due if they open the app. Reminders turn the app from reactive to proactive. **Better than Todoist**: we offer **smart defaults** (auto-suggest a reminder at 9am on the due date if none is set) and **browser push notifications** without requiring a native app.

### User Stories
- As a user, I want to set a reminder time for any task
- As a user, I want to receive a browser notification when a reminder fires
- As a user, I want tasks with due dates to auto-suggest a default reminder
- As a user, I want to set multiple reminders per task (e.g., 1 day before + morning of)
- As a user, I want to snooze a notification for 15min / 1hr / tomorrow

### UX Spec

#### Reminder Picker (in TaskForm + TaskItem edit mode)
- **Trigger**: 🔔 bell icon button next to the date picker
- **Popover** with:
  - **Quick options**: "At time of due date" | "15 min before" | "1 hour before" | "1 day before" | "Morning of (9:00 AM)"
  - **Custom**: date + time picker
  - **Multiple reminders**: "Add another reminder" link below existing ones
- If a task has a due date but no reminder, show a subtle hint: "Add a reminder?"

#### Notification Experience
- **Browser Notification API**: request permission on first reminder set
- **Notification content**: task title, due info, and action buttons (Snooze / Complete)
- **In-app banner**: fallback if notification permission denied — a toast-style alert within the app
- **Snooze options** (in notification or in-app): 15min, 1hr, Tomorrow 9am

#### Cloud Function: Reminder Scheduler
- A **Cloud Scheduler** function runs every minute (or use Firestore TTL / Cloud Tasks for precision)
- Queries tasks where `reminders[].time <= now` and `reminders[].fired == false`
- Sends notification via **FCM** (Firebase Cloud Messaging) for web push
- Marks the reminder as `fired: true`

### Data Model Changes

```typescript
// Add to types/index.ts
export interface Reminder {
  id: string;
  time: Date;           // when to fire
  fired: boolean;       // has it been sent?
  snoozedUntil?: Date;  // if snoozed
}

// Update Task interface
export interface Task {
  // ... existing fields
  reminders?: Reminder[];   // NEW
  fcmToken?: string;        // stored on user profile, not task — see below
}

// Update User interface (for push token)
export interface User {
  // ... existing fields
  fcmToken?: string;  // NEW — browser push token
}
```

### Implementation Details

#### New Files
- `src/components/tasks/ReminderPicker.tsx` — popover with quick options + custom datetime + multi-reminder support
- `src/hooks/useNotifications.ts` — handles browser Notification API permission, FCM token registration, and in-app fallback
- `src/components/common/NotificationBanner.tsx` — in-app toast-style reminder alert with snooze/complete actions
- `functions/src/reminders.ts` — Cloud Function: scheduled function that queries due reminders and sends FCM push

#### Files to Update
- [types/index.ts](file:///Users/haibinzh/mine/react/TodoList/src/types/index.ts) — add `Reminder` interface, add `reminders?` to [Task](file:///Users/haibinzh/mine/react/TodoList/src/types/index.ts#8-22), add `fcmToken?` to [User](file:///Users/haibinzh/mine/react/TodoList/src/types/index.ts#1-7)
- [TaskForm.tsx](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskForm.tsx) — add bell icon + `ReminderPicker`
- [TaskItem.tsx](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskItem.tsx) — show 🔔 indicator when reminders exist
- [App.tsx](file:///Users/haibinzh/mine/react/TodoList/src/App.tsx) — initialize `useNotifications` hook on auth
- [functions/src/index.ts](file:///Users/haibinzh/mine/react/TodoList/functions/src/index.ts) — export the reminder scheduler function
- [firebase.json](file:///Users/haibinzh/mine/react/TodoList/firebase.json) — ensure functions are configured for deployment
- [firestore.rules](file:///Users/haibinzh/mine/react/TodoList/firestore.rules) — allow reminder fields in task documents

#### Firebase Setup Required
- Enable **Firebase Cloud Messaging** in the Firebase console
- Add a `firebase-messaging-sw.js` service worker in [public/](file:///Users/haibinzh/mine/react/TodoList/public) for background notifications
- Add FCM config to `.env` (VAPID key)

> [!WARNING]
> FCM web push requires HTTPS. Development should use `localhost` (which browsers treat as secure) or an HTTPS tunnel. The Firebase Hosting deployment already provides HTTPS.

### Acceptance Criteria
- [ ] Can set one or more reminders on any task
- [ ] Quick options (15min before, 1hr before, etc.) compute correct times relative to due date
- [ ] Browser notification fires at the set time (with permission granted)
- [ ] In-app banner fallback works when notification permission is denied
- [ ] Snooze reschedules the reminder to the selected time
- [ ] Cloud Function correctly queries and fires pending reminders
- [ ] FCM token is stored and used for web push delivery
- [ ] 🔔 indicator shows on tasks with active reminders

---

## Feature 3: Custom Saved Filters

### Why
The app has [TaskFilter](file:///Users/haibinzh/mine/react/TodoList/src/types/index.ts#47-58) in the type system and basic filtering in [TaskList.tsx](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskList.tsx), but no way to **create, save, or reuse** filter views. Power users need "all P1 tasks due this week" or "tasks labeled @waiting in Work project" as one-click shortcuts. **Better than Todoist**: we provide a **visual query builder** (no query syntax to learn) and allow pinning filters to the sidebar with custom icons and colors.

### User Stories
- As a user, I want to create a custom filter combining project, label, priority, date range, and completion status
- As a user, I want to save filters with a name and icon for quick access
- As a user, I want saved filters to appear in the sidebar
- As a user, I want to edit or delete saved filters
- As a user, I want a "recently used" section for ad-hoc filters

### UX Spec

#### Filter Builder
- **Trigger**: "Filters & Labels" section in sidebar (below Labels) with a "+" button
- **Query Builder UI** — a visual form, not a text query:
  - **Condition rows**: each row is `[field] [operator] [value]` with `AND` logic
    - Fields: [Priority](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskItem.tsx#53-62), `Due date`, [Project](file:///Users/haibinzh/mine/react/TodoList/src/types/index.ts#29-37), [Label](file:///Users/haibinzh/mine/react/TodoList/src/types/index.ts#38-44), `Status`
    - Operators vary by field: [is](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskList.tsx#7-127), `is not`, `before`, `after`, `this week`, `next 7 days`, `overdue`, `no date`
  - **Add condition** button to add more rows
  - **Preview**: live task count shown as you build ("12 tasks match")
- **Save dialog**: name + optional color + optional icon (from a preset icon grid)

#### Sidebar Integration
- New collapsible section: **"Filters"** between Labels and the bottom
- Each saved filter shows: icon + name + matching task count
- Clicking a filter applies it and shows results in [MainContent](file:///Users/haibinzh/mine/react/TodoList/src/components/layout/MainContent.tsx#7-67)
- Right-click or "..." menu on each filter: Edit, Duplicate, Delete

#### ViewType Extension
- Add `'filter'` to the [ViewType](file:///Users/haibinzh/mine/react/TodoList/src/types/index.ts#45-46) union
- When `currentView === 'filter'`, pass the saved filter's conditions to [TaskList](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskList.tsx#7-127) for filtering

### Data Model Changes

```typescript
// Add to types/index.ts
export interface FilterCondition {
  field: 'priority' | 'dueDate' | 'project' | 'label' | 'completed';
  operator: 'is' | 'isNot' | 'before' | 'after' | 'thisWeek' |
            'next7Days' | 'overdue' | 'noDate' | 'hasDate';
  value?: string | number | boolean;  // projectId, labelId, priority #, etc.
}

export interface SavedFilter {
  id: string;
  name: string;
  color?: string;
  icon?: string;           // heroicon name or emoji
  conditions: FilterCondition[];
  userId: string;
  createdAt: Date;
  sortOrder: number;
}

// Update ViewType
export type ViewType = 'inbox' | 'today' | 'upcoming' | 'project' | 'label' | 'filter';
```

### Implementation Details

#### New Files
- `src/services/filterService.ts` — CRUD for `savedFilters` Firestore collection
- `src/components/filters/FilterBuilder.tsx` — visual query builder with condition rows
- `src/components/filters/FilterForm.tsx` — modal wrapping the builder + name/color/icon inputs
- `src/components/filters/FilterConditionRow.tsx` — single condition row component
- `src/utils/filterEngine.ts` — pure function: `applyFilters(tasks, conditions, { projects, labels })` → filtered `Task[]`

#### Files to Update
- [types/index.ts](file:///Users/haibinzh/mine/react/TodoList/src/types/index.ts) — add `FilterCondition`, `SavedFilter`, extend [ViewType](file:///Users/haibinzh/mine/react/TodoList/src/types/index.ts#45-46)
- [taskStore.ts](file:///Users/haibinzh/mine/react/TodoList/src/store/taskStore.ts) — add `savedFilters`, `currentFilterId`, subscribe actions
- [Sidebar.tsx](file:///Users/haibinzh/mine/react/TodoList/src/components/layout/Sidebar.tsx) — add "Filters" collapsible section with saved filter list + "+" button
- [TaskList.tsx](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskList.tsx) — when `currentView === 'filter'`, use `applyFilters()` instead of the switch-case
- [MainContent.tsx](file:///Users/haibinzh/mine/react/TodoList/src/components/layout/MainContent.tsx) — handle `'filter'` in [getViewTitle()](file:///Users/haibinzh/mine/react/TodoList/src/components/layout/MainContent.tsx#10-28)
- [App.tsx](file:///Users/haibinzh/mine/react/TodoList/src/App.tsx) — subscribe to saved filters on auth
- [firestore.rules](file:///Users/haibinzh/mine/react/TodoList/firestore.rules) — add rules for `savedFilters` collection
- [firestore.indexes.json](file:///Users/haibinzh/mine/react/TodoList/firestore.indexes.json) — add index for `savedFilters` (`userId` + `sortOrder`)

### Acceptance Criteria
- [ ] Can create a filter with 1+ conditions using the visual builder
- [ ] Live preview shows matching task count while building
- [ ] Saved filters appear in the sidebar under "Filters" section
- [ ] Clicking a saved filter displays matching tasks in the main content
- [ ] Can edit, duplicate, and delete saved filters
- [ ] Filter conditions correctly handle: priority, due date ranges, project, label, completion status
- [ ] Filters persist in Firestore and sync real-time across sessions

---

## Feature 4: Completed Tasks Archive

### Why
Currently, completed tasks just fade to 60% opacity and stay in the list. There's no way to review accomplishments, search past work, or undo accidental completions. **Better than Todoist**: we add an **undo system** with a 5-second toast (Todoist has undo but no archive view with stats), a **searchable archive** view, and **completion stats** (tasks per day/week chart) to gamify productivity.

### User Stories
- As a user, I want completed tasks to disappear from the active list after a brief delay
- As a user, I want a 5-second "Undo" toast after completing a task
- As a user, I want to view all completed tasks in a dedicated Archive view
- As a user, I want to search and filter the archive by date range and project
- As a user, I want to see basic productivity stats (tasks completed per day/week)
- As a user, I want to restore a completed task to active status

### UX Spec

#### Completion Flow
1. User clicks checkbox → task immediately shows strikethrough + completion animation (green check ripple via `framer-motion`)
2. **5-second undo toast** slides in from the bottom: "Task completed ✓ — **Undo**"
3. After 5 seconds (if not undone), the task fades out of the active list
4. Task's `completed` is set to `true` and `completedAt` timestamp is saved

#### Archive View
- **Sidebar entry**: "Completed" item below Upcoming (with archive icon + total count)
- **Archive page** layout:
  - **Stats bar** at top: "✅ 47 this week · 🔥 12-day streak · 📈 +15% vs last week"
  - **Date-grouped list**: tasks grouped by completion date (Today, Yesterday, This Week, Earlier)
  - **Search bar** within archive
  - **Filter chips**: by project, label, or date range
  - **Restore button**: on each task → moves back to active (sets `completed: false`, clears `completedAt`)

#### Mini Stats Widget
- Small card in the sidebar footer showing: "✅ [N] today" with a sparkline of the last 7 days
- Uses completion timestamps from Firestore — computed client-side

### Data Model Changes

```typescript
// Update Task interface
export interface Task {
  // ... existing fields
  completedAt?: Date;    // NEW — timestamp of completion
}

// Update ViewType
export type ViewType = 'inbox' | 'today' | 'upcoming' | 'project' | 'label'
                     | 'filter' | 'completed';  // NEW
```

### Implementation Details

#### New Files
- `src/components/common/UndoToast.tsx` — bottom toast with timer bar + undo button, auto-dismiss after 5s
- `src/components/archive/CompletedList.tsx` — archive view with date-grouped tasks, search, filter chips
- `src/components/archive/ArchiveStats.tsx` — stats bar (tasks this week, streak, trend)
- `src/components/common/CompletionSpark.tsx` — sidebar mini widget with sparkline
- `src/hooks/useUndoQueue.ts` — manages undo state: delay Firestore write for 5s, cancel on undo
- `src/utils/stats.ts` — pure functions: `getStreak(tasks)`, `getWeeklyCount(tasks)`, `getWeeklyTrend(tasks)`

#### Files to Update
- [types/index.ts](file:///Users/haibinzh/mine/react/TodoList/src/types/index.ts) — add `completedAt?` to [Task](file:///Users/haibinzh/mine/react/TodoList/src/types/index.ts#8-22), add `'completed'` to [ViewType](file:///Users/haibinzh/mine/react/TodoList/src/types/index.ts#45-46)
- [TaskItem.tsx](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskItem.tsx) — override completion handler to use `useUndoQueue` instead of immediate Firestore write; add framer-motion completion animation
- [TaskList.tsx](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskList.tsx) — hide completed tasks from active views (after undo window); add case for `currentView === 'completed'`
- [Sidebar.tsx](file:///Users/haibinzh/mine/react/TodoList/src/components/layout/Sidebar.tsx) — add "Completed" nav item; add `CompletionSpark` widget in sidebar footer
- [MainContent.tsx](file:///Users/haibinzh/mine/react/TodoList/src/components/layout/MainContent.tsx) — handle `'completed'` in [getViewTitle()](file:///Users/haibinzh/mine/react/TodoList/src/components/layout/MainContent.tsx#10-28), render `CompletedList` + `ArchiveStats`
- [taskService.ts](file:///Users/haibinzh/mine/react/TodoList/src/services/taskService.ts) — update [toggleTaskCompletion](file:///Users/haibinzh/mine/react/TodoList/src/services/taskService.ts#83-87) to set/clear `completedAt`; add `restoreTask(taskId)`
- [App.tsx](file:///Users/haibinzh/mine/react/TodoList/src/App.tsx) — render `UndoToast` at the app root level

---

## Implementation Order

> [!IMPORTANT]
> Build in this order to minimize dependencies:

1. **Recurring Due Dates** — self-contained data model addition. Only touches [TaskForm](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskForm.tsx#7-139), [TaskItem](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskItem.tsx#18-225), and `taskService`. No new collections needed.
2. **Completed Tasks Archive** — depends on completion flow change but no external services. Sets up `completedAt` field that later features can use.
3. **Custom Saved Filters** — adds new Firestore collection + sidebar section. Depends on stable task data model (recurrence + completedAt fields should exist).
4. **Smart Reminders** — most complex. Requires Firebase Cloud Messaging setup, a Cloud Function, service worker, and notification permissions. Do last so all other features are stable.

---

## Firestore Updates Summary

### New Collections
| Collection | Fields | Used By |
|-----------|--------|---------|
| `savedFilters` | `name`, `color`, `icon`, `conditions[]`, `userId`, `sortOrder`, `createdAt` | Custom Filters |

### Updated Collections
| Collection | New Fields | Used By |
|-----------|-----------|---------|
| `tasks` | `recurrence`, `reminders[]`, `completedAt` | Recurring, Reminders, Archive |
| `users` (profile doc) | `fcmToken` | Reminders |

### New Firestore Rules
```
// Add to firestore.rules
match /savedFilters/{filterId} {
  allow read, update, delete: if request.auth != null
    && request.auth.uid == resource.data.userId;
  allow create: if request.auth != null
    && request.auth.uid == request.resource.data.userId;
}
```

### New Indexes
```json
{
  "collectionGroup": "savedFilters",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "sortOrder", "order": "ASCENDING" }
  ]
}
```

---

## Verification Plan

### Unit Tests (Vitest)

Run with:
```bash
cd /Users/haibinzh/mine/react/TodoList && npm test
```

| Test File | What It Verifies |
|-----------|-----------------|
| `src/utils/__tests__/recurrence.test.ts` | `getNextDueDate()` for all frequency types, interval math, day-of-week patterns, end conditions |
| `src/utils/__tests__/filterEngine.test.ts` | Each operator type, multi-condition AND logic, edge cases (no date, overdue) |
| `src/utils/__tests__/stats.test.ts` | Streak calculation, weekly counts, trend percentage |
| `src/hooks/__tests__/useUndoQueue.test.ts` | Undo cancels within 5s, auto-commits after 5s, multiple queued items |

### Manual Testing

After implementation, verify these flows in dev (`npm run dev`):

1. **Recurring dates**: Create task "Water plants" with Weekly recurrence on Mon → complete it → verify new task appears with next Monday's date → verify badge shows "🔁 Weekly" → set "end after 3" → complete 3 times → verify no more instances.

2. **Reminders**: Create task due tomorrow → set reminder "1 hour before" → grant notification permission → verify browser notification fires at the correct time (use a near-future time for testing). Deny permission → verify in-app banner fallback works. Test snooze → verify rescheduled correctly.

3. **Custom filters**: Create filter "Urgent this week" with conditions: Priority is P1, Due date is This Week → save → verify it appears in sidebar → click → verify only matching tasks show → edit filter → add condition → verify updated results. Delete filter → verify removed from sidebar.

4. **Completed archive**: Complete 3 tasks → verify undo toast appears for 5s → undo one → verify it returns to active → wait 5s on another → verify it disappears from active list → click "Completed" in sidebar → verify all completed tasks appear grouped by date → verify stats bar shows correct count → restore a task → verify it moves back to active.
