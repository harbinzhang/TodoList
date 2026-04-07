# TodoList vs Todoist — Gap Analysis

## Overview

Comparison of your [TodoList](file:///Users/haibinzh/mine/react/TodoList) project against [Todoist.com](https://todoist.com) — the market leader with 30M+ users. Your app already has a solid foundation; the gaps below represent opportunities to level up.

---

## Feature Comparison

| Category | Feature | Your App | Todoist | Gap Severity |
|----------|---------|:--------:|:-------:|:------------:|
| **Task Capture** | Basic create/edit/delete | ✅ | ✅ | — |
| | Natural language Quick Add | ❌ | ✅ | 🔴 High |
| | Recurring due dates | ❌ | ✅ | 🔴 High |
| | Reminders / Notifications | ❌ | ✅ | 🔴 High |
| | Keyboard shortcuts | ❌ | ✅ | 🟡 Medium |
| **Organization** | Projects | ✅ | ✅ | — |
| | Labels | ✅ | ✅ | — |
| | Priority levels (P1-P4) | ✅ | ✅ | — |
| | Task descriptions | ✅ | ✅ | — |
| | Sections within projects | ❌ | ✅ | 🔴 High |
| | Subtasks (functional) | ⚠️ UI only | ✅ | 🟡 Medium |
| | Drag-and-drop reordering | ❌ | ✅ | 🔴 High |
| | Task comments | ❌ | ✅ | 🟡 Medium |
| | File attachments on tasks | ❌ | ✅ | 🟡 Medium |
| **Views** | Inbox | ✅ | ✅ | — |
| | Today | ✅ | ✅ | — |
| | Upcoming | ✅ | ✅ | — |
| | Calendar view | ❌ | ✅ | 🔴 High |
| | Board/Kanban view | ❌ | ✅ | 🔴 High |
| | Custom filters | ❌ | ✅ | 🟡 Medium |
| **Collaboration** | Shared projects | ❌ | ✅ | 🔴 High |
| | Task assignment | ❌ | ✅ | 🔴 High |
| | Comments & discussions | ❌ | ✅ | 🟡 Medium |
| | Team workspaces | ❌ | ✅ | 🟢 Low |
| | Roles & permissions | ❌ | ✅ | 🟢 Low |
| **Productivity** | Completed tasks archive | ❌ | ✅ | 🟡 Medium |
| | Productivity visualizations | ❌ | ✅ | 🟡 Medium |
| | Activity history | ❌ | ✅ | 🟢 Low |
| | Karma / gamification | ❌ | ✅ | 🟢 Low |
| | Daily/weekly goals | ❌ | ✅ | 🟢 Low |
| **Platform** | Real-time sync | ✅ | ✅ | — |
| | Auth (Email + Google) | ✅ | ✅ | — |
| | Mobile-responsive | ✅ | ✅ | — |
| | Native mobile apps | ❌ | ✅ | 🟢 Low |
| | Browser extensions | ❌ | ✅ | 🟢 Low |
| | 80+ integrations | ❌ | ✅ | 🟢 Low |
| | Offline support | ❌ | ✅ | 🟡 Medium |
| **UX Polish** | Dark mode | ❌ | ✅ | 🟡 Medium |
| | Undo complete/delete | ❌ | ✅ | 🟡 Medium |
| | Project templates | ❌ | ✅ | 🟢 Low |
| | Onboarding flow | ❌ | ✅ | 🟢 Low |

---

## Top 10 Highest-Impact Gaps

### 1. 🔴 Natural Language Quick Add
**Todoist**: Type "Buy groceries every Monday at 9am p1 #Shopping" — it parses date, recurrence, priority, and project automatically.
**Your app**: Manual field-by-field input via form controls.
**Impact**: This is Todoist's #1 differentiator. It dramatically reduces friction for power users.

### 2. 🔴 Recurring Due Dates
**Todoist**: Supports "every weekday", "every 2nd Monday", "every 3 months" with smart date parsing.
**Your app**: Single one-off dates only. No recurrence field in the [Task](file:///Users/haibinzh/mine/react/TodoList/src/types/index.ts#8-22) type.
**Impact**: Critical for habit tracking and routine tasks — one of the most-used Todoist features.

### 3. 🔴 Reminders & Notifications
**Todoist**: Push notifications, email reminders, location-based reminders.
**Your app**: No reminder system at all.
**Impact**: Without reminders, due dates are passive — users must open the app to know what's due.

### 4. 🔴 Sections Within Projects
**Todoist**: Projects can be divided into named sections to group related tasks visually.
**Your app**: Projects are flat lists with no grouping capability.
**Impact**: Essential for organizing larger projects (e.g., "To Do / In Progress / Done").

### 5. 🔴 Drag-and-Drop Reordering
**Todoist**: Drag tasks to reorder, move between projects, reschedule in calendar view.
**Your app**: Tasks are ordered by `createdAt` only — no manual reordering.
**Impact**: Users can't prioritize by position, which is the most intuitive way to manage a list.

### 6. 🔴 Calendar & Board Views
**Todoist**: Same project, three views — List, Calendar (month/week), Board (Kanban).
**Your app**: List view only.
**Impact**: Calendar view is critical for deadline-heavy workflows; Board view is essential for project management.

### 7. 🔴 Shared Projects & Task Assignment
**Todoist**: Share a project with others, assign tasks to specific people, see who's responsible.
**Your app**: Strictly single-user — `userId` on tasks locks them to one person.
**Impact**: Blocks all collaborative use cases (families, teams, couples).

### 8. 🟡 Custom Filters
**Todoist**: Create saved views like "all P1 tasks due this week in Work project".
**Your app**: Has a [TaskFilter](file:///Users/haibinzh/mine/react/TodoList/src/types/index.ts#47-58) type but no UI for saving/managing custom filter views.
**Impact**: Power users rely heavily on custom filters for workflow optimization.

### 9. 🟡 Subtasks (Full Implementation)
**Todoist**: Multi-level subtask nesting with indent/outdent, each subtask is a full task.
**Your app**: [Subtask](file:///Users/haibinzh/mine/react/TodoList/src/types/index.ts#23-28) type exists (title + completed only) but is simpler — no nesting, limited fields, UI described as "ready" but not fully functional.
**Impact**: Breaking down complex tasks is a core use case.

### 10. 🟡 Dark Mode
**Todoist**: Full dark mode with multiple theme options.
**Your app**: Light mode only (`bg-gray-50` hardcoded).
**Impact**: Expected standard feature — many users prefer dark mode, especially at night.

---

## What Your App Does Well ✅

- **Real-time sync** via Firestore subscriptions — on par with Todoist
- **Clean architecture** — clear separation (services / store / components / types)
- **Modern stack** — React 18, TypeScript, Zustand, Vite
- **Auth flexibility** — Email + Google OAuth
- **Priority system** — matches Todoist's P1-P4
- **Project + Label taxonomy** — same organizational model as Todoist

---

## Suggested Prioritization for Closing Gaps

| Phase | Features | Effort |
|-------|----------|--------|
| **Phase 1 — Core UX** | Drag-and-drop reordering, Dark mode, Sections in projects, Functional subtasks | Medium |
| **Phase 2 — Power Features** | Recurring dates, Reminders, Custom filters, Completed tasks archive | High |
| **Phase 3 — Views** | Calendar view, Board/Kanban view, Upcoming drag-to-reschedule | High |
| **Phase 4 — Collaboration** | Shared projects, Task assignment, Comments | Very High |
| **Phase 5 — Quick Add** | Natural language parsing (date, priority, project, labels) | High |
| **Phase 6 — Polish** | Keyboard shortcuts, Undo actions, Productivity stats, Onboarding | Medium |
