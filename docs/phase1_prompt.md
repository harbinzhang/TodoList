# Phase 1 — Core UX Improvements

## Context

The TodoList app (React 18 + TypeScript + Vite + Firebase + Zustand + Tailwind CSS) has a solid foundation but lacks core UX features that modern task managers provide. This spec covers four features that dramatically improve daily usability **without** touching collaboration or backend complexity.

**Already installed & available**: `framer-motion`, `@heroicons/react`, `date-fns`, `react-hook-form`, `zustand`, Tailwind CSS 3.

---

## Feature 1: Dark Mode (with System Detection)

### Why
Dark mode is the #1 most requested cosmetic feature in productivity apps. **Better than Todoist**: we auto-detect system preference and allow manual override, while Todoist requires a manual toggle buried in settings.

### User Stories
- As a user, I want the app to respect my OS dark/light preference by default
- As a user, I want to manually toggle between Light / Dark / System modes
- As a user, I want my preference persisted across sessions

### UX Spec
- **Theme toggle** in the top-right header (next to `ProfileDropdown`), using a Sun/Moon/Monitor icon trio
- **3 modes**: `light`, `dark`, `system` — stored in `localStorage`
- On `system` mode, listen to `prefers-color-scheme` media query changes in real-time
- Smooth CSS transition on theme switch (200ms on `background-color` and `color`)
- **No flash of wrong theme on page load** — read localStorage synchronously before React mounts (in [index.html](file:///Users/haibinzh/mine/react/TodoList/index.html) or a `<script>` tag)

### Implementation Details

#### Tailwind Config
- Enable `darkMode: 'class'` in [tailwind.config.js](file:///Users/haibinzh/mine/react/TodoList/tailwind.config.js)
- Add dark palette tokens under `theme.extend.colors`

#### New Component
- `src/components/common/ThemeToggle.tsx` — icon button cycling through `light` → `dark` → `system`

#### Theme Hook
- `src/hooks/useTheme.ts` — manages `localStorage`, applies `.dark` class to `<html>`, listens to `matchMedia`

#### Files to Update
- [index.html](file:///Users/haibinzh/mine/react/TodoList/index.html) — add inline `<script>` to prevent flash
- [tailwind.config.js](file:///Users/haibinzh/mine/react/TodoList/tailwind.config.js) — enable `darkMode: 'class'`
- [MainContent.tsx](file:///Users/haibinzh/mine/react/TodoList/src/components/layout/MainContent.tsx) — add `ThemeToggle` next to `ProfileDropdown`
- [Sidebar.tsx](file:///Users/haibinzh/mine/react/TodoList/src/components/layout/Sidebar.tsx) — add `dark:` classes
- [TaskItem.tsx](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskItem.tsx) — add `dark:` classes
- [TaskForm.tsx](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskForm.tsx) — add `dark:` classes
- [SearchBar.tsx](file:///Users/haibinzh/mine/react/TodoList/src/components/common/SearchBar.tsx) — add `dark:` classes
- [ProjectForm.tsx](file:///Users/haibinzh/mine/react/TodoList/src/components/projects/ProjectForm.tsx) — add `dark:` classes
- [App.tsx](file:///Users/haibinzh/mine/react/TodoList/src/App.tsx) — add `dark:` to root div and loading state
- [AuthForm.tsx](file:///Users/haibinzh/mine/react/TodoList/src/components/auth/AuthForm.tsx) — add `dark:` classes

### Acceptance Criteria
- [ ] System preference is detected on first visit (no localStorage yet)
- [ ] Manual toggle cycles: light → dark → system
- [ ] No theme flash on page reload
- [ ] All components are readable in dark mode (contrast ratio ≥ 4.5:1)
- [ ] Preference persists in localStorage across sessions
- [ ] Smooth 200ms color transition

---

## Feature 2: Project Sections

### Why
Flat task lists become unmanageable past ~15 tasks. Sections let users group tasks logically within a project (e.g., "To Research / In Progress / Done" or "Frontend / Backend / DevOps"). **Better than Todoist**: we make sections collapsible by default and show a progress bar per section.

### User Stories
- As a user, I want to create named sections inside a project
- As a user, I want to drag tasks between sections
- As a user, I want to collapse/expand sections to focus on what matters
- As a user, I want to see how many tasks are done per section (progress indicator)

### UX Spec
- **"Add section" button** appears below the last task in a project view — subtle text link style ("+ Add section")
- Sections render as **collapsible headers** with a chevron, section name, and a task count badge (e.g., "3/7")
- Tasks without a section appear under an implicit **"(No section)"** group at the top
- Sections can be **renamed inline** (click to edit) and **deleted** (with confirmation)
- Sections have a **sort order** field to allow reordering
- **Progress indicator**: a thin colored bar under the section header (% of completed tasks)

### Data Model Changes

```typescript
// Add to types/index.ts
export interface Section {
  id: string;
  name: string;
  projectId: string;
  userId: string;
  sortOrder: number;
  createdAt: Date;
}

// Update Task interface — add optional sectionId
export interface Task {
  // ... existing fields
  sectionId?: string;  // NEW
}
```

### Implementation Details

#### New Files
- [src/types/index.ts](file:///Users/haibinzh/mine/react/TodoList/src/types/index.ts) — add `Section` interface, add `sectionId` to [Task](file:///Users/haibinzh/mine/react/TodoList/src/types/index.ts#8-22)
- `src/services/sectionService.ts` — CRUD for sections (Firestore collection: `sections`, scoped by `projectId` + `userId`)
- `src/components/sections/SectionHeader.tsx` — collapsible header with inline rename, progress bar, task count
- `src/components/sections/SectionForm.tsx` — inline "Add section" input (not a modal — keep it lightweight)

#### Files to Update
- [taskStore.ts](file:///Users/haibinzh/mine/react/TodoList/src/store/taskStore.ts) — add `sections` state, `setSections`, section CRUD actions
- [App.tsx](file:///Users/haibinzh/mine/react/TodoList/src/App.tsx) — subscribe to sections when user logs in
- [TaskList.tsx](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskList.tsx) — when `currentView === 'project'`, group tasks by `sectionId`, render `SectionHeader` + tasks per group
- [TaskForm.tsx](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskForm.tsx) — when inside a section context, auto-assign `sectionId` to new tasks

#### Firestore
- New collection: `sections` with fields: `name`, `projectId`, `userId`, `sortOrder`, `createdAt`
- Update [firestore.rules](file:///Users/haibinzh/mine/react/TodoList/firestore.rules) to allow section reads/writes for the owning user

### Acceptance Criteria
- [ ] Can create sections inside any project view
- [ ] Tasks are grouped under their section (and "No section" group for unassigned tasks)
- [ ] Sections are collapsible with a chevron toggle
- [ ] Section shows "completed/total" count and progress bar
- [ ] Can rename a section inline (click to edit, Enter to save, Escape to cancel)
- [ ] Can delete a section (its tasks move to "No section")
- [ ] New tasks created within a section auto-inherit `sectionId`

---

## Feature 3: Functional Subtasks

### Why
The app already renders subtasks in [TaskItem.tsx](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskItem.tsx) but they're display-only — the toggle buttons and creation UI don't work. **Better than Todoist**: we support inline creation (press Enter to keep adding) and show a mini progress bar on the parent task.

### User Stories
- As a user, I want to add subtasks to any task
- As a user, I want to mark subtasks as complete/incomplete
- As a user, I want to delete individual subtasks
- As a user, I want to see subtask progress on the parent task

### UX Spec
- **Subtask progress pill** on the parent task (e.g., "2/5" with a mini ring indicator) — shown in the task meta row
- **"+ Add subtask" button** below existing subtasks (visible on task hover or when expanded)
- **Inline creation**: clicking "Add subtask" shows a text input; Enter creates and focuses a new input, Escape closes
- **Subtask toggle**: clicking the checkbox toggles completion in Firestore
- **Subtask delete**: small × icon on subtask hover
- Subtasks stored as an **array on the parent task document** (already the case in the data model)

### Implementation Details

#### Files to Update
- [TaskItem.tsx](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskItem.tsx):
  - Wire up subtask checkbox to actually call `taskService.updateTask(task.id, { subtasks: updatedSubtasks })`
  - Add "Add subtask" inline input below existing subtasks
  - Add delete button on each subtask (hover-visible)
  - Add subtask progress pill in the task meta row (next to labels/priority/date)
- [taskService.ts](file:///Users/haibinzh/mine/react/TodoList/src/services/taskService.ts):
  - Add `addSubtask(taskId, subtask)`, `toggleSubtask(taskId, subtaskId)`, `deleteSubtask(taskId, subtaskId)` methods
  - These read the current subtask array, modify it, and write back
- [types/index.ts](file:///Users/haibinzh/mine/react/TodoList/src/types/index.ts): No changes needed — [Subtask](file:///Users/haibinzh/mine/react/TodoList/src/types/index.ts#23-28) interface already exists

### Acceptance Criteria
- [ ] Can add subtasks inline (Enter to create, Escape to close)
- [ ] Clicking subtask checkbox toggles its `completed` state in Firestore
- [ ] Can delete individual subtasks
- [ ] Parent task shows subtask progress (e.g., "2/5") when subtasks exist
- [ ] Changes sync in real-time via Firestore `onSnapshot`
- [ ] Subtask input supports continuous creation (Enter creates and opens new input)

---

## Feature 4: Drag-and-Drop Reordering

### Why
Tasks currently sort by priority → due date → created date with no manual override. Users need to arrange tasks by personal importance, which is often different from algorithmic sorting. **Better than Todoist**: we add a satisfying `framer-motion` spring animation (already installed) and a "grip" handle that only appears on hover, keeping the UI clean.

### User Stories
- As a user, I want to drag tasks to reorder them within a list
- As a user, I want my custom order to persist across sessions
- As a user, I want visual feedback (lift, shadow, insertion indicator) while dragging

### UX Spec
- **Drag handle**: grip dots icon (⋮⋮) appears on task hover, left of the checkbox
- **Drag preview**: task lifts with a subtle shadow and scales to 1.02×
- **Drop indicator**: a colored line between tasks shows where the item will land
- Custom order is stored as a `sortOrder` numeric field on tasks
- When `sortOrder` exists on tasks, it takes **priority** over the current algorithmic sort
- **Scope**: reordering works within the current view (Inbox, Today, Project, etc.)

### Data Model Changes

```typescript
// Update Task interface in types/index.ts
export interface Task {
  // ... existing fields
  sortOrder?: number;  // NEW — lower = higher in list
}
```

### Implementation Details

#### New Dependencies
- `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` — the React DnD library that works best with `framer-motion`. Lightweight, accessible, and well-maintained.

> [!NOTE]
> We chose `@dnd-kit` over `react-beautiful-dnd` (no longer maintained) and native HTML5 drag (poor mobile support). `@dnd-kit` supports keyboard-based reordering for accessibility.

#### New File
- `src/components/tasks/SortableTaskItem.tsx` — wraps [TaskItem](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskItem.tsx#18-225) with `useSortable` from `@dnd-kit`

#### Files to Update
- [TaskList.tsx](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskList.tsx):
  - Wrap task list in `DndContext` + `SortableContext`
  - Handle `onDragEnd` to compute new `sortOrder` values and batch-update in Firestore
  - Update [getFilteredTasks()](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskList.tsx#17-89) to prefer `sortOrder` when present
- [TaskItem.tsx](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskItem.tsx):
  - Add drag handle (grip dots icon) visible on hover
  - Accept `dragHandleProps` from `SortableTaskItem`
- [taskService.ts](file:///Users/haibinzh/mine/react/TodoList/src/services/taskService.ts):
  - Add `batchUpdateSortOrder(updates: { taskId: string; sortOrder: number }[])` using Firestore `writeBatch`
- [types/index.ts](file:///Users/haibinzh/mine/react/TodoList/src/types/index.ts) — add `sortOrder?: number` to [Task](file:///Users/haibinzh/mine/react/TodoList/src/types/index.ts#8-22)

### Acceptance Criteria
- [ ] Drag handle appears on task hover
- [ ] Tasks can be dragged to reorder within the current view
- [ ] Drop position is indicated by a colored line between tasks
- [ ] Reorder persists across page reloads (saved to Firestore)
- [ ] `framer-motion` spring animation on drag lift/drop
- [ ] Keyboard accessible (Tab to handle, Space to grab, Arrow keys to move)

---

## Implementation Order

> [!IMPORTANT]
> Build in this order to minimize conflicts between features:

1. **Dark Mode** — touches every component's styling but no logic. Do this first so all subsequent features inherit dark mode support from the start.
2. **Subtasks** — isolated to [TaskItem](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskItem.tsx#18-225) and `taskService`. No cross-component dependencies.
3. **Sections** — adds a new data model and changes [TaskList](file:///Users/haibinzh/mine/react/TodoList/src/components/tasks/TaskList.tsx#7-127) grouping logic. Needs subtasks done first so sections render correctly.
4. **Drag-and-Drop** — most complex. Needs sections done first so reordering works within sections.

---

## Verification Plan

### Unit Tests (via Vitest — already configured)

Run with:
```bash
cd /Users/haibinzh/mine/react/TodoList && npm test
```

Tests to write in `src/test/` or co-located `__tests__/` directories:

| Test | What It Verifies |
|------|-----------------|
| `useTheme.test.ts` | localStorage read/write, system detection mock, class toggling |
| `subtask-operations.test.ts` | Add/toggle/delete subtask array manipulation logic |
| `task-sorting.test.ts` | `sortOrder` takes priority over algorithmic sort |
| `section-grouping.test.ts` | Tasks correctly group by `sectionId`, "No section" group works |

### Manual Testing

After implementation, verify these user flows in the dev server (`npm run dev`):

1. **Dark mode**: Toggle the theme 3×, reload the page — theme should persist. Switch OS preference while on "System" — app should follow.
2. **Subtasks**: Create a task → add 3 subtasks → complete 2 → verify progress shows "2/3" → delete 1 → verify progress updates → reload → verify persistence.
3. **Sections**: Open a project → add 2 sections → create tasks in each → collapse one → verify tasks hide → rename a section → delete a section → verify tasks move to "No section".
4. **Drag-and-drop**: Create 5 tasks → drag the 5th to position 1 → reload → verify order persists → try keyboard reorder (Tab → Space → Arrow → Space).
