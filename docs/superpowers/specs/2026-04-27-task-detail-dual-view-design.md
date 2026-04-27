# Task Detail Dual-View Design

**Date:** 2026-04-27  
**Status:** Approved  

## Overview

Add a dual-view (list / mindmap) experience to tasks. Each TaskItem gets an "expand" button that opens a full-screen modal showing the task's edit form at the top and its children rendered in either list or mindmap format below. The toggle between views lives at the top right of the modal. Both views read from the same underlying `Item[]` data in the `tasks` Firestore collection — no data migration, no duplication.

## Architecture

Extract a pure rendering layer `TreeRenderer` from the existing `MindmapCanvas`, separating "tree rendering" from "data source":

```
Before:
  MindmapCanvas (data + rendering tightly coupled)

After:
  TreeRenderer (pure renderer — accepts Item[])
      ↑ reused by two consumers
  MindmapCanvas  → reads from mindmapStore → passes to TreeRenderer
  TaskDetailModal → filters taskStore by parentId → passes to TreeRenderer
```

## Components

### New: `TreeRenderer.tsx`
- Extracted from `MindmapCanvas`
- Props: `items: Item[]`, `onAdd`, `onUpdate`, `onDelete` callbacks, `collapsedNodeIds`
- Retains all existing hooks: `usePanZoom`, `useDragDrop`, `useTreeLayout`, `useMindmapKeyboard`
- Has no knowledge of which Firestore collection the data came from

### Modified: `MindmapCanvas.tsx`
- Becomes a thin wrapper: reads nodes from `mindmapStore`, passes them to `TreeRenderer`
- Existing mindmap behavior unchanged

### New: `TaskDetailModal.tsx`
- Full-screen overlay triggered by the expand button on `TaskItem`
- Props: `task: Item`, `onClose: () => void`
- Top section: `TaskForm` in edit mode for the task itself
- Bottom section: `TaskDetailChildren`

### New: `TaskDetailChildren.tsx`
- Local `useState<'list' | 'mindmap'>('list')` for display mode
- Top-right: two icon toggle buttons (list icon / mindmap icon)
- Filters `taskStore.tasks` by `parentId === task.id` to get children
- **List mode:** renders filtered children as `TaskItem` list with indent
- **Mindmap mode:** passes same `Item[]` to `TreeRenderer`

### Modified: `TaskItem.tsx`
- Adds an expand icon button in the right action area
- On click: opens `TaskDetailModal` with the task as prop

## Data Flow

### Opening the modal
```
Click expand on TaskItem
  → TaskDetailModal renders with task: Item
  → Top TaskForm reads task fields; saves via itemService.update('task', ...)
  → Bottom TaskDetailChildren filters taskStore.tasks where parentId === task.id
```

### Switching views
```
Click list / mindmap toggle
  → setDisplayMode('list' | 'mindmap')
  → Same Item[] passed to different renderer
  → No data fetch, no store change
```

### Child CRUD (both modes)
```
Node add/update/delete callback
  → itemService.create/update/delete('task', ...)
  → Firestore writes to `tasks` collection
  → taskStore onSnapshot fires → store updates
  → TaskDetailChildren re-filters → both views refresh automatically
```

## Edge Cases

| Scenario | Behavior |
|---|---|
| No children | List: empty state + "Add subtask" button. Mindmap: root node only, addable. |
| Deep nesting | List: recursive indent. Mindmap: TreeRenderer already supports arbitrary depth. |
| Edit task in modal | TaskForm saves → taskStore updates → list reflects changes after close. |
| Close modal | No store cleanup needed; child data lives in taskStore, no side effects. |
| TreeRenderer receives empty array | Renders empty canvas with root placeholder, consistent with existing MindmapCanvas empty state. |
| collapsedNodeIds on close | Stored in local useState; discarded on modal close (intentional, no persistence needed). |

## Files Changed

| File | Change |
|---|---|
| `src/components/mindmap/TreeRenderer.tsx` | New — extracted from MindmapCanvas |
| `src/components/mindmap/MindmapCanvas.tsx` | Modified — thin wrapper over TreeRenderer |
| `src/components/tasks/TaskDetailModal.tsx` | New — full-screen modal |
| `src/components/tasks/TaskDetailChildren.tsx` | New — dual-view children area |
| `src/components/tasks/TaskItem.tsx` | Modified — add expand button |

No changes to: services, stores, types, Firestore collections, or firestore.rules.

## Testing

### Unit tests
- `TreeRenderer`: snapshot tests with various `Item[]` inputs; verify nodes and edges render correctly
- `TaskDetailChildren`: toggle button switches `displayMode`; both modes render with correct data

### Integration tests
- `TaskDetailModal`: mock `itemService`; verify form save calls `itemService.update('task', ...)`
- `TaskItem` expand button: clicking opens `TaskDetailModal`

### Regression
- Existing `MindmapCanvas` tests continue to pass (behavior unchanged after refactor)
- Existing `TaskItem` tests continue to pass (expand button is additive)

### Manual verification
- Switch between list and mindmap modes — child data is identical in both
- Edit task in modal → close → task list shows updated title
- Add child node in mindmap mode → switch to list mode → new child visible
