# Task Detail Dual-View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dual-view (list / mindmap canvas) experience to tasks via a full-screen detail modal — each TaskItem gets an expand button that opens an edit form at the top and the task's children rendered in either list or mindmap format below.

**Architecture:** Extract a `TreeRenderer` component from `MindmapCanvas` that accepts `items: Item[]` and renders the SVG canvas. `MindmapCanvas` uses `TreeRenderer` in controlled mode (bridging mindmapStore); `TaskDetailChildren` uses `TreeRenderer` in uncontrolled mode (local state). A `TreeContext` decouples `MindmapNodeComponent` from hardcoded `mindmapStore` references so it works in both contexts.

**Tech Stack:** React 18, TypeScript, Zustand, Firestore via `itemService`, Framer Motion, Heroicons, Tailwind CSS, Vitest + React Testing Library.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/mindmap/TreeContext.tsx` | Create | Shared React context carrying selection state, itemContext, and CRUD callbacks |
| `src/components/mindmap/TreeRenderer.tsx` | Create | Pure SVG canvas renderer — pan/zoom, nodes, edges; controlled or uncontrolled state |
| `src/components/mindmap/MindmapCanvas.tsx` | Modify | Thin wrapper: bridges mindmapStore → TreeRenderer controlled props; keeps keyboard hook |
| `src/components/mindmap/MindmapNodeComponent.tsx` | Modify | Replace `useMindmapStore()` reads with `useTreeContext()`; use `ctx.itemContext` in service calls |
| `src/components/tasks/TaskDetailChildren.tsx` | Create | Toggle bar (list/mindmap) + renders children in chosen format |
| `src/components/tasks/TaskDetailModal.tsx` | Create | Full-screen overlay: task edit form (top) + `TaskDetailChildren` (bottom) |
| `src/components/tasks/TaskItem.tsx` | Modify | Add expand icon button that opens `TaskDetailModal` |

---

## Task 1: Create TreeContext

**Files:**
- Create: `src/components/mindmap/TreeContext.tsx`
- Create: `src/components/mindmap/__tests__/TreeContext.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/mindmap/__tests__/TreeContext.test.tsx
import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useTreeContext } from '../TreeContext';

describe('useTreeContext', () => {
  it('throws when used outside a TreeContext.Provider', () => {
    expect(() => renderHook(() => useTreeContext())).toThrow(
      'useTreeContext must be used within TreeContext.Provider'
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/mindmap/__tests__/TreeContext.test.tsx
```
Expected: FAIL — module not found.

- [ ] **Step 3: Create TreeContext**

```typescript
// src/components/mindmap/TreeContext.tsx
import { createContext, useContext } from 'react';
import type { Item } from '../../types';
import type { ItemContext } from '../../services/itemService';

export interface TreeContextValue {
  selectedNodeId: string | null;
  editingNodeId: string | null;
  collapsedNodeIds: Set<string>;
  nodes: Item[];
  setSelectedNodeId: (id: string | null) => void;
  setEditingNodeId: (id: string | null) => void;
  toggleNodeExpanded: (id: string) => void;
  itemContext: ItemContext;
  contextId: string | null;
  userId: string;
  onAddChild: (parentId: string) => Promise<void>;
}

const TreeContext = createContext<TreeContextValue | null>(null);

export function useTreeContext(): TreeContextValue {
  const ctx = useContext(TreeContext);
  if (!ctx) throw new Error('useTreeContext must be used within TreeContext.Provider');
  return ctx;
}

export default TreeContext;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/components/mindmap/__tests__/TreeContext.test.tsx
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/mindmap/TreeContext.tsx src/components/mindmap/__tests__/TreeContext.test.tsx
git commit -m "feat: add TreeContext for shared tree rendering state"
```

---

## Task 2: Create TreeRenderer

**Files:**
- Create: `src/components/mindmap/TreeRenderer.tsx`

`TreeRenderer` is the SVG canvas — pan/zoom, drag/drop, node/edge rendering. It supports two modes:
- **Uncontrolled** (no `selectedNodeId` prop): manages its own `useState` for selection, editing, and collapsed nodes.
- **Controlled** (`selectedNodeId` prop provided): delegates state to the caller (MindmapCanvas bridging mindmapStore).

- [ ] **Step 1: Create TreeRenderer**

```typescript
// src/components/mindmap/TreeRenderer.tsx
import { useState, useRef, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { buildTree } from '../../utils/mindmapTree';
import { useTreeLayout } from './hooks/useTreeLayout';
import { usePanZoom } from './hooks/usePanZoom';
import { useDragDrop } from './hooks/useDragDrop';
import MindmapEdge from './MindmapEdge';
import MindmapNodeComponent from './MindmapNodeComponent';
import MindmapToolbar from './MindmapToolbar';
import TreeContext, { type TreeContextValue } from './TreeContext';
import { itemService } from '../../services/itemService';
import { treeService } from '../../services/treeService';
import type { Item } from '../../types';
import type { ItemContext } from '../../services/itemService';

export interface TreeRendererProps {
  items: Item[];
  itemContext: ItemContext;
  contextId: string | null;
  userId: string;
  autoFitKey?: string;
  // Controlled-mode props — provide all or none
  selectedNodeId?: string | null;
  editingNodeId?: string | null;
  collapsedNodeIds?: Set<string>;
  onSelectNode?: (id: string | null) => void;
  onEditNode?: (id: string | null) => void;
  onToggleExpand?: (id: string) => void;
}

const TreeRenderer = ({
  items,
  itemContext,
  contextId,
  userId,
  autoFitKey,
  selectedNodeId: extSelected,
  editingNodeId: extEditing,
  collapsedNodeIds: extCollapsed,
  onSelectNode,
  onEditNode,
  onToggleExpand,
}: TreeRendererProps) => {
  const isControlled = extSelected !== undefined;

  const [localSelected, setLocalSelected] = useState<string | null>(null);
  const [localEditing, setLocalEditing] = useState<string | null>(null);
  const [localCollapsed, setLocalCollapsed] = useState(new Set<string>());

  const handleLocalToggle = useCallback((id: string) => {
    setLocalCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectedNodeId = isControlled ? (extSelected ?? null) : localSelected;
  const editingNodeId = isControlled ? (extEditing ?? null) : localEditing;
  const collapsedNodeIds = isControlled ? (extCollapsed ?? new Set<string>()) : localCollapsed;
  const setSelectedNodeId = isControlled ? (onSelectNode ?? (() => {})) : setLocalSelected;
  const setEditingNodeId = isControlled ? (onEditNode ?? (() => {})) : setLocalEditing;
  const toggleNodeExpanded = isControlled ? (onToggleExpand ?? (() => {})) : handleLocalToggle;

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const lastAutoFitKeyRef = useRef<string | null | undefined>(undefined);

  const handleAddChild = useCallback(async (parentId: string) => {
    const siblings = items.filter((n) => n.parentId === parentId);
    const maxSort = siblings.length > 0 ? Math.max(...siblings.map((s) => s.sortOrder ?? 0)) : -1;
    const newNodeData = {
      ...(itemContext === 'mindmap' && contextId ? { mindmapId: contextId } : {}),
      userId,
      parentId,
      sortOrder: maxSort + 1,
      title: 'New node',
      completed: false as const,
      priority: 4 as const,
    };
    const newId = await itemService.create(itemContext, newNodeData);
    if (collapsedNodeIds.has(parentId)) toggleNodeExpanded(parentId);
    setTimeout(() => {
      setSelectedNodeId(newId);
      setEditingNodeId(newId);
    }, 300);
  }, [items, itemContext, contextId, userId, collapsedNodeIds, toggleNodeExpanded, setSelectedNodeId, setEditingNodeId]);

  const tree = buildTree(items);
  const { nodes: layoutNodes, edges } = useTreeLayout(tree, collapsedNodeIds);
  const { panX, panY, zoom, handleWheel, handlePointerDown, handlePointerMove, handlePointerUp, zoomIn, zoomOut, fitView } = usePanZoom();
  const { dragState, dropIndicator, handleNodePointerDown, handleCanvasPointerMove, handleCanvasPointerUp } = useDragDrop({
    layoutNodes, panX, panY, zoom, svgRef, nodes: items,
  });

  const handleFitView = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    fitView(layoutNodes, rect.width, rect.height);
  }, [layoutNodes, fitView]);

  // Auto-fit when autoFitKey changes (new mindmap selected) or on first mount for tasks
  useEffect(() => {
    if (layoutNodes.length === 0 || !containerRef.current) return;
    if (lastAutoFitKeyRef.current === autoFitKey) return;
    lastAutoFitKeyRef.current = autoFitKey;
    requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      fitView(layoutNodes, rect.width, rect.height, 1.0);
    });
  }, [autoFitKey, layoutNodes, fitView]);

  // Refocus container after editing ends (for keyboard shortcuts)
  useEffect(() => {
    if (!editingNodeId && containerRef.current) containerRef.current.focus();
  }, [editingNodeId]);

  const contextValue: TreeContextValue = {
    selectedNodeId,
    editingNodeId,
    collapsedNodeIds,
    nodes: items,
    setSelectedNodeId,
    setEditingNodeId,
    toggleNodeExpanded,
    itemContext,
    contextId,
    userId,
    onAddChild: handleAddChild,
  };

  if (!tree) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <p>No nodes yet. Add one to get started.</p>
      </div>
    );
  }

  return (
    <TreeContext.Provider value={contextValue}>
      <div ref={containerRef} className="flex-1 overflow-hidden bg-gray-50 relative outline-none" tabIndex={0}>
        <MindmapToolbar zoom={zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onFitView={handleFitView} />
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          className="select-none"
          style={{ cursor: dragState?.isDragging ? 'grabbing' : 'grab' }}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={(e) => { handleCanvasPointerMove(e); handlePointerMove(e); }}
          onPointerUp={(e) => { handleCanvasPointerUp(e); handlePointerUp(); }}
        >
          <g transform={`translate(${panX}, ${panY}) scale(${zoom})`}>
            {edges.map((edge) => <MindmapEdge key={edge.id} edge={edge} />)}
            <AnimatePresence>
              {layoutNodes.map((ln) => (
                <motion.g
                  key={ln.id}
                  initial={{ opacity: 0, x: ln.x, y: ln.y }}
                  animate={{ opacity: 1, x: ln.x, y: ln.y }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                  <foreignObject x={0} y={0} width={ln.width} height={ln.height} overflow="visible">
                    <MindmapNodeComponent
                      layoutNode={ln}
                      onAddChild={handleAddChild}
                      isDropTarget={dropIndicator?.targetNodeId === ln.id && dropIndicator.zone === 'child'}
                      onDragStart={handleNodePointerDown}
                    />
                  </foreignObject>
                </motion.g>
              ))}
            </AnimatePresence>
            {dropIndicator && dropIndicator.zone !== 'child' && (
              <motion.line
                x1={dropIndicator.insertionX} y1={dropIndicator.insertionY}
                x2={dropIndicator.insertionX + dropIndicator.insertionWidth} y2={dropIndicator.insertionY}
                stroke="#22c55e" strokeWidth={2} strokeDasharray="6,3"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}
              />
            )}
          </g>
        </svg>
        {dragState?.isDragging && (
          <div className="fixed pointer-events-none z-50" style={{ left: dragState.ghostX + 12, top: dragState.ghostY - 10 }}>
            <div className="px-3 py-2 bg-white/80 border border-blue-300 rounded-lg shadow-lg text-sm text-gray-700 max-w-[280px] truncate backdrop-blur-sm">
              {dragState.ghostTitle}
            </div>
          </div>
        )}
      </div>
    </TreeContext.Provider>
  );
};

export default TreeRenderer;
```

- [ ] **Step 2: Run existing tests to confirm nothing is broken yet**

```bash
npx vitest run
```
Expected: all existing tests PASS (TreeRenderer is new and unused so far).

- [ ] **Step 3: Commit**

```bash
git add src/components/mindmap/TreeRenderer.tsx
git commit -m "feat: add TreeRenderer — shared SVG canvas for tasks and mindmaps"
```

---

## Task 3: Refactor MindmapCanvas to use TreeRenderer

**Files:**
- Modify: `src/components/mindmap/MindmapCanvas.tsx`

`MindmapCanvas` becomes a thin wrapper: it reads state from `mindmapStore`, passes it as controlled props to `TreeRenderer`, and keeps the keyboard hook.

- [ ] **Step 1: Replace MindmapCanvas body**

Replace the full content of `src/components/mindmap/MindmapCanvas.tsx` with:

```typescript
import { useRef } from 'react';
import { useMindmapStore } from '../../store/mindmapStore';
import { useAuthStore } from '../../store/authStore';
import { useMindmapKeyboard } from './hooks/useMindmapKeyboard';
import TreeRenderer from './TreeRenderer';

const MindmapCanvas = () => {
  const {
    nodes, collapsedNodeIds, currentMindmapId,
    selectedNodeId, editingNodeId,
    setSelectedNodeId, setEditingNode, toggleNodeExpanded,
  } = useMindmapStore();
  const { user } = useAuthStore();
  const containerRef = useRef<HTMLDivElement>(null);
  useMindmapKeyboard(containerRef);

  if (!currentMindmapId || !user) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <p>No nodes yet. Loading...</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 flex flex-col overflow-hidden outline-none" tabIndex={-1}>
      <TreeRenderer
        items={nodes}
        itemContext="mindmap"
        contextId={currentMindmapId}
        userId={user.uid}
        autoFitKey={currentMindmapId}
        selectedNodeId={selectedNodeId}
        editingNodeId={editingNodeId}
        collapsedNodeIds={collapsedNodeIds}
        onSelectNode={setSelectedNodeId}
        onEditNode={setEditingNode}
        onToggleExpand={toggleNodeExpanded}
      />
    </div>
  );
};

export default MindmapCanvas;
```

Note: `setEditingNode` in `mindmapStore` is the setter — it matches `onEditNode?: (id: string | null) => void` signature.

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```
Expected: all tests PASS. (MindmapNodeComponent still reads mindmapStore — that changes in Task 4.)

- [ ] **Step 3: Start dev server and manually verify mindmap still works**

```bash
npm run dev
```
Open a mindmap: verify nodes render, pan/zoom works, adding child nodes works, auto-fit triggers on mindmap switch.

- [ ] **Step 4: Commit**

```bash
git add src/components/mindmap/MindmapCanvas.tsx
git commit -m "refactor: MindmapCanvas delegates SVG rendering to TreeRenderer"
```

---

## Task 4: Refactor MindmapNodeComponent to use TreeContext

**Files:**
- Modify: `src/components/mindmap/MindmapNodeComponent.tsx`
- Create: `src/components/mindmap/__tests__/MindmapNodeComponent.test.tsx`

Replace all `useMindmapStore()` reads with `useTreeContext()`. Replace hardcoded `'mindmap'` strings with `ctx.itemContext`. Wrap undo pushes in `if (ctx.itemContext === 'mindmap')`. Handle cascade delete for task context using `itemService.delete` directly.

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/mindmap/__tests__/MindmapNodeComponent.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MindmapNodeComponent from '../MindmapNodeComponent';
import TreeContext, { type TreeContextValue } from '../TreeContext';
import type { LayoutNode } from '../hooks/useTreeLayout';
import type { Item } from '../../../types';

const mockNode: Item = {
  id: 'node-1',
  title: 'Test Node',
  completed: false,
  priority: 4,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 'user-1',
  parentId: 'root-1',
  sortOrder: 0,
};

const mockLayoutNode: LayoutNode = {
  id: 'node-1',
  x: 0,
  y: 0,
  width: 200,
  height: 44,
  depth: 1,
  node: { ...mockNode, children: [] },
  children: [],
};

const makeContext = (overrides: Partial<TreeContextValue> = {}): TreeContextValue => ({
  selectedNodeId: null,
  editingNodeId: null,
  collapsedNodeIds: new Set(),
  nodes: [mockNode],
  setSelectedNodeId: vi.fn(),
  setEditingNodeId: vi.fn(),
  toggleNodeExpanded: vi.fn(),
  itemContext: 'task',
  contextId: null,
  userId: 'user-1',
  onAddChild: vi.fn(),
  ...overrides,
});

const renderWithCtx = (ctx: TreeContextValue) =>
  render(
    <TreeContext.Provider value={ctx}>
      <MindmapNodeComponent layoutNode={mockLayoutNode} onAddChild={vi.fn()} />
    </TreeContext.Provider>
  );

describe('MindmapNodeComponent', () => {
  it('renders node title', () => {
    renderWithCtx(makeContext());
    expect(screen.getByText('Test Node')).toBeInTheDocument();
  });

  it('calls setSelectedNodeId on click', () => {
    const ctx = makeContext();
    renderWithCtx(ctx);
    fireEvent.click(screen.getByText('Test Node'));
    expect(ctx.setSelectedNodeId).toHaveBeenCalledWith('node-1');
  });

  it('shows ring when node is selected', () => {
    renderWithCtx(makeContext({ selectedNodeId: 'node-1' }));
    const nodeEl = screen.getByText('Test Node').closest('[data-mindmap-node]');
    expect(nodeEl?.className).toMatch(/ring-blue-500/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/mindmap/__tests__/MindmapNodeComponent.test.tsx
```
Expected: FAIL — `useTreeContext` not called yet, component reads from mindmapStore which isn't mocked with TreeContext values.

- [ ] **Step 3: Refactor MindmapNodeComponent**

Replace the full content of `src/components/mindmap/MindmapNodeComponent.tsx`:

```typescript
import { useState, useRef, useEffect } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import {
  PlusIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useUndoStore } from '../../store/undoStore';
import { itemService } from '../../services/itemService';
import { treeService } from '../../services/treeService';
import { useTreeContext } from './TreeContext';
import type { LayoutNode } from './hooks/useTreeLayout';

interface MindmapNodeComponentProps {
  layoutNode: LayoutNode;
  onAddChild: (parentId: string) => void;
  isDropTarget?: boolean;
  onDragStart?: (nodeId: string, e: React.PointerEvent) => void;
}

const priorityBorderColors: Record<number, string> = {
  1: 'border-l-red-500',
  2: 'border-l-orange-500',
  3: 'border-l-blue-500',
  4: 'border-l-gray-300',
};

const MindmapNodeComponent = ({ layoutNode, onAddChild, isDropTarget, onDragStart }: MindmapNodeComponentProps) => {
  const { node } = layoutNode;
  const ctx = useTreeContext();
  const { selectedNodeId, editingNodeId, collapsedNodeIds } = ctx;

  const [editTitle, setEditTitle] = useState(node.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);

  const isSelected = selectedNodeId === node.id;
  const isEditing = editingNodeId === node.id;
  const isCollapsed = collapsedNodeIds.has(node.id);
  const hasChildren = node.children.length > 0;
  const isRoot = node.parentId == null;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleToggleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const prevCompleted = node.completed;
    await itemService.toggleCompletion(ctx.itemContext, node.id, !prevCompleted);
    if (ctx.itemContext === 'mindmap') {
      useUndoStore.getState().push({
        description: 'Toggle completion',
        undo: () => itemService.toggleCompletion(ctx.itemContext, node.id, prevCompleted),
        redo: () => itemService.toggleCompletion(ctx.itemContext, node.id, !prevCompleted),
      });
    }
  };

  const handleSaveEdit = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== node.title) {
      const oldTitle = node.title;
      const nodeId = node.id;
      await itemService.update(ctx.itemContext, nodeId, { title: trimmed });
      if (ctx.itemContext === 'mindmap') {
        useUndoStore.getState().push({
          description: 'Edit title',
          undo: () => itemService.update(ctx.itemContext, nodeId, { title: oldTitle }),
          redo: () => itemService.update(ctx.itemContext, nodeId, { title: trimmed }),
        });
      }
    } else {
      setEditTitle(node.title);
    }
    ctx.setEditingNodeId(null);
    savingRef.current = false;
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditTitle(node.title);
      ctx.setEditingNodeId(null);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      savingRef.current = true;
      const trimmed = editTitle.trim();
      const oldTitle = node.title;
      const titleChanged = trimmed && trimmed !== oldTitle;
      if (titleChanged) {
        await itemService.update(ctx.itemContext, node.id, { title: trimmed });
      }
      ctx.setEditingNodeId(null);
      savingRef.current = false;

      const childSiblings = ctx.nodes.filter((n) => n.parentId === node.id);
      const maxSort = childSiblings.length > 0
        ? Math.max(...childSiblings.map((s) => s.sortOrder ?? 0))
        : -1;
      const newNodeData = {
        ...(ctx.itemContext === 'mindmap' && ctx.contextId ? { mindmapId: ctx.contextId } : {}),
        userId: ctx.userId,
        parentId: node.id,
        sortOrder: maxSort + 1,
        title: 'New node',
        completed: false as const,
        priority: 4 as const,
      };
      const newId = await itemService.create(ctx.itemContext, newNodeData);
      if (collapsedNodeIds.has(node.id)) ctx.toggleNodeExpanded(node.id);
      const parentNodeId = node.id;
      setTimeout(() => {
        ctx.setSelectedNodeId(newId);
        ctx.setEditingNodeId(newId);
      }, 300);

      if (ctx.itemContext === 'mindmap') {
        useUndoStore.getState().push({
          description: 'Tab: save + add child',
          undo: async () => {
            await itemService.delete(ctx.itemContext, newId);
            if (titleChanged) await itemService.update(ctx.itemContext, parentNodeId, { title: oldTitle });
            ctx.setSelectedNodeId(parentNodeId);
          },
          redo: async () => {
            if (titleChanged) await itemService.update(ctx.itemContext, parentNodeId, { title: trimmed! });
            await itemService.createWithId(ctx.itemContext, newId, newNodeData);
            ctx.setSelectedNodeId(newId);
          },
        });
      }
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRoot) return;
    const nodeId = node.id;
    const parentId = node.parentId;

    if (ctx.itemContext === 'mindmap') {
      const descendantIds = treeService.getDescendantIds(nodeId, ctx.nodes);
      const deletedIds = [nodeId, ...descendantIds];
      const deletedNodes = ctx.nodes.filter((n) => deletedIds.includes(n.id));
      await treeService.deleteNode(nodeId, ctx.nodes, 'cascade');
      useUndoStore.getState().push({
        description: 'Delete node',
        undo: async () => {
          await treeService.recreateNodes(deletedNodes);
          ctx.setSelectedNodeId(nodeId);
        },
        redo: async () => {
          const descendantIdsNow = treeService.getDescendantIds(nodeId, ctx.nodes);
          await Promise.all([nodeId, ...descendantIdsNow].map((id) => itemService.delete('mindmap', id)));
          if (parentId) ctx.setSelectedNodeId(parentId);
        },
      });
    } else {
      const descendantIds = treeService.getDescendantIds(nodeId, ctx.nodes);
      await Promise.all([nodeId, ...descendantIds].map((id) => itemService.delete('task', id)));
      if (parentId) ctx.setSelectedNodeId(parentId);
    }
  };

  const handleClick = () => ctx.setSelectedNodeId(node.id);
  const handleDoubleClick = () => {
    ctx.setEditingNodeId(node.id);
    setEditTitle(node.title);
  };

  return (
    <div
      data-mindmap-node
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onPointerDown={(e) => {
        if (e.button === 0 && onDragStart) onDragStart(node.id, e);
      }}
      className={`group relative flex items-center h-full px-3 rounded-lg border border-l-4 transition-all duration-200 cursor-pointer select-none
        ${priorityBorderColors[node.priority]}
        ${node.completed ? 'opacity-60 bg-gray-50' : 'bg-white'}
        ${isDropTarget ? 'ring-2 ring-green-400 ring-offset-2 shadow-lg shadow-green-100 bg-green-50/50' : ''}
        ${isSelected && !isDropTarget ? 'ring-2 ring-blue-500 ring-offset-1 shadow-md' : ''}
        ${!isSelected && !isDropTarget ? 'border-gray-200 hover:shadow-md' : ''}
      `}
    >
      {hasChildren ? (
        <button
          onClick={(e) => { e.stopPropagation(); ctx.toggleNodeExpanded(node.id); }}
          className="flex-shrink-0 w-4 h-4 mr-1 text-gray-400 hover:text-gray-600"
        >
          {isCollapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
        </button>
      ) : (
        <div className="w-4 mr-1 flex-shrink-0" />
      )}

      <button onClick={handleToggleComplete} className="flex-shrink-0 mr-2">
        {node.completed
          ? <CheckCircleSolidIcon className="w-5 h-5 text-green-500" />
          : <CheckCircleIcon className="w-5 h-5 text-gray-400 hover:text-green-500 transition-colors" />}
      </button>

      {isEditing ? (
        <input
          ref={inputRef}
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleSaveEdit}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0 text-sm bg-transparent border-none outline-none focus:ring-0 p-0"
        />
      ) : (
        <span className={`flex-1 min-w-0 text-sm truncate ${node.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
          {node.title}
        </span>
      )}

      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded px-1">
        <button
          onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }}
          className="p-0.5 text-gray-400 hover:text-blue-500 transition-colors"
          title="Add child"
        >
          <PlusIcon className="w-4 h-4" />
        </button>
        {!isRoot && (
          <button
            onClick={handleDelete}
            className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
            title="Delete"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default MindmapNodeComponent;
```

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```
Expected: all tests PASS including the new MindmapNodeComponent tests.

- [ ] **Step 5: Start dev server and manually verify mindmap still works**

```bash
npm run dev
```
Open a mindmap. Verify: node selection highlights, double-click to edit, Tab to add child, Delete to remove, checkbox toggle all work.

- [ ] **Step 6: Commit**

```bash
git add src/components/mindmap/MindmapNodeComponent.tsx src/components/mindmap/__tests__/MindmapNodeComponent.test.tsx
git commit -m "refactor: MindmapNodeComponent reads state from TreeContext instead of mindmapStore"
```

---

## Task 5: Create TaskDetailChildren

**Files:**
- Create: `src/components/tasks/TaskDetailChildren.tsx`
- Create: `src/components/tasks/__tests__/TaskDetailChildren.test.tsx`

`TaskDetailChildren` shows either a flat list or mindmap canvas of an item's direct children. The view toggle lives in its top-right corner.

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/tasks/__tests__/TaskDetailChildren.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TaskDetailChildren from '../TaskDetailChildren';
import { useTaskStore } from '../../../store/taskStore';
import type { Item } from '../../../types';

vi.mock('../../../store/taskStore');
vi.mock('../../../store/authStore', () => ({
  useAuthStore: () => ({ user: { uid: 'user-1' } }),
}));

const parentTask: Item = {
  id: 'parent-1',
  title: 'Parent Task',
  completed: false,
  priority: 4,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 'user-1',
};

const childTask: Item = {
  id: 'child-1',
  title: 'Child Task',
  completed: false,
  priority: 4,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 'user-1',
  parentId: 'parent-1',
  sortOrder: 0,
};

describe('TaskDetailChildren', () => {
  beforeEach(() => {
    (useTaskStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      tasks: [parentTask, childTask],
    });
  });

  it('renders child task in list mode by default', () => {
    render(<TaskDetailChildren task={parentTask} />);
    expect(screen.getByText('Child Task')).toBeInTheDocument();
  });

  it('shows list and mindmap toggle buttons', () => {
    render(<TaskDetailChildren task={parentTask} />);
    expect(screen.getByTitle('List view')).toBeInTheDocument();
    expect(screen.getByTitle('Mindmap view')).toBeInTheDocument();
  });

  it('switches to mindmap mode on toggle click', () => {
    render(<TaskDetailChildren task={parentTask} />);
    fireEvent.click(screen.getByTitle('Mindmap view'));
    // TreeRenderer renders an SVG canvas
    expect(document.querySelector('svg')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/tasks/__tests__/TaskDetailChildren.test.tsx
```
Expected: FAIL — module not found.

- [ ] **Step 3: Create TaskDetailChildren**

```typescript
// src/components/tasks/TaskDetailChildren.tsx
import { useState } from 'react';
import { Bars3Icon, ShareIcon } from '@heroicons/react/24/outline';
import { useTaskStore } from '../../store/taskStore';
import { useAuthStore } from '../../store/authStore';
import TreeRenderer from '../mindmap/TreeRenderer';
import TaskItem from './TaskItem';
import type { Item } from '../../types';

type DisplayMode = 'list' | 'mindmap';

interface TaskDetailChildrenProps {
  task: Item;
}

const TaskDetailChildren = ({ task }: TaskDetailChildrenProps) => {
  const [mode, setMode] = useState<DisplayMode>('list');
  const { tasks } = useTaskStore();
  const { user } = useAuthStore();

  const children = tasks.filter((t) => t.parentId === task.id);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Toggle bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
        <span className="text-sm font-medium text-gray-600">
          {children.length} {children.length === 1 ? 'subtask' : 'subtasks'}
        </span>
        <div className="flex items-center space-x-1">
          <button
            title="List view"
            onClick={() => setMode('list')}
            className={`p-1.5 rounded transition-colors ${
              mode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
          <button
            title="Mindmap view"
            onClick={() => setMode('mindmap')}
            className={`p-1.5 rounded transition-colors ${
              mode === 'mindmap' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <ShareIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {mode === 'list' ? (
          <div className="p-6 space-y-2">
            {children.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No subtasks yet.</p>
            ) : (
              children.map((child) => <TaskItem key={child.id} task={child} />)
            )}
          </div>
        ) : (
          <div className="flex-1 h-full" style={{ minHeight: '400px' }}>
            <TreeRenderer
              items={[task, ...children]}
              itemContext="task"
              contextId={null}
              userId={user?.uid ?? ''}
              autoFitKey={task.id}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskDetailChildren;
```

Note: in mindmap mode, `items` includes the parent task itself as the root node plus its children, so the tree renders with the task as root.

- [ ] **Step 4: Run the test**

```bash
npx vitest run src/components/tasks/__tests__/TaskDetailChildren.test.tsx
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/tasks/TaskDetailChildren.tsx src/components/tasks/__tests__/TaskDetailChildren.test.tsx
git commit -m "feat: add TaskDetailChildren with list/mindmap view toggle"
```

---

## Task 6: Create TaskDetailModal

**Files:**
- Create: `src/components/tasks/TaskDetailModal.tsx`
- Create: `src/components/tasks/__tests__/TaskDetailModal.test.tsx`

Full-screen overlay. Top: inline edit form for the task (title, description, priority, due date). Bottom: `TaskDetailChildren`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/tasks/__tests__/TaskDetailModal.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TaskDetailModal from '../TaskDetailModal';
import { itemService } from '../../../services/itemService';
import type { Item } from '../../../types';

vi.mock('../../../services/itemService', () => ({
  itemService: { update: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('../../../store/taskStore', () => ({
  useTaskStore: () => ({ tasks: [] }),
}));
vi.mock('../../../store/authStore', () => ({
  useAuthStore: () => ({ user: { uid: 'user-1' } }),
}));

const task: Item = {
  id: 'task-1',
  title: 'My Task',
  description: 'Some description',
  completed: false,
  priority: 2,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 'user-1',
};

describe('TaskDetailModal', () => {
  it('renders task title in the form', () => {
    render(<TaskDetailModal task={task} onClose={vi.fn()} />);
    expect(screen.getByDisplayValue('My Task')).toBeInTheDocument();
  });

  it('calls itemService.update on save', async () => {
    render(<TaskDetailModal task={task} onClose={vi.fn()} />);
    const titleInput = screen.getByDisplayValue('My Task');
    fireEvent.change(titleInput, { target: { value: 'Updated Task' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(itemService.update).toHaveBeenCalledWith('task', 'task-1', expect.objectContaining({ title: 'Updated Task' }));
    });
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<TaskDetailModal task={task} onClose={onClose} />);
    fireEvent.click(screen.getByTitle('Close'));
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/tasks/__tests__/TaskDetailModal.test.tsx
```
Expected: FAIL — module not found.

- [ ] **Step 3: Create TaskDetailModal**

```typescript
// src/components/tasks/TaskDetailModal.tsx
import { useState } from 'react';
import { XMarkIcon, FlagIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { itemService } from '../../services/itemService';
import TaskDetailChildren from './TaskDetailChildren';
import { format } from 'date-fns';
import type { Item } from '../../types';

interface TaskDetailModalProps {
  task: Item;
  onClose: () => void;
}

const TaskDetailModal = ({ task, onClose }: TaskDetailModalProps) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [priority, setPriority] = useState<1 | 2 | 3 | 4>(task.priority);
  const [dueDate, setDueDate] = useState(
    task.dueDate ? format(task.dueDate, 'yyyy-MM-dd') : ''
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await itemService.update('task', task.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Task Detail</h2>
        <button
          title="Close"
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Edit form */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 space-y-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task name"
          className="w-full text-base font-medium border-none bg-transparent outline-none placeholder-gray-400"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          rows={2}
          className="w-full text-sm border-none bg-transparent outline-none placeholder-gray-400 resize-none"
        />
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <FlagIcon className="w-4 h-4 text-gray-400" />
            <select
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value) as 1 | 2 | 3 | 4)}
              className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={4}>Priority 4</option>
              <option value={3}>Priority 3</option>
              <option value={2}>Priority 2</option>
              <option value={1}>Priority 1</option>
            </select>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="ml-auto px-3 py-1.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Children area */}
      <div className="flex-1 flex flex-col min-h-0">
        <TaskDetailChildren task={task} />
      </div>
    </div>
  );
};

export default TaskDetailModal;
```

- [ ] **Step 4: Run the test**

```bash
npx vitest run src/components/tasks/__tests__/TaskDetailModal.test.tsx
```
Expected: PASS.

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/tasks/TaskDetailModal.tsx src/components/tasks/__tests__/TaskDetailModal.test.tsx
git commit -m "feat: add TaskDetailModal with task edit form and dual-view children"
```

---

## Task 7: Add Expand Button to TaskItem

**Files:**
- Modify: `src/components/tasks/TaskItem.tsx`
- Modify: `src/components/tasks/__tests__/TaskItem.test.tsx`

Add an expand icon button in the actions area. Clicking it opens `TaskDetailModal`. The modal renders as a portal over the full screen.

- [ ] **Step 1: Read the existing TaskItem test**

```bash
cat src/components/tasks/__tests__/TaskItem.test.tsx
```

- [ ] **Step 2: Add expand button test to the existing test file**

Open `src/components/tasks/__tests__/TaskItem.test.tsx` and add:

```typescript
// Add this import at the top with other imports:
import { ArrowsPointingOutIcon } from '@heroicons/react/24/outline';

// Add this test inside the existing describe block:
it('opens TaskDetailModal when expand button is clicked', async () => {
  render(<TaskItem task={mockTask} />);
  const expandBtn = screen.getByTitle('Open detail');
  fireEvent.click(expandBtn);
  expect(await screen.findByText('Task Detail')).toBeInTheDocument();
});
```

- [ ] **Step 3: Run to verify it fails**

```bash
npx vitest run src/components/tasks/__tests__/TaskItem.test.tsx
```
Expected: FAIL — expand button not found.

- [ ] **Step 4: Add expand button and modal state to TaskItem**

In `src/components/tasks/TaskItem.tsx`:

Add imports at top:
```typescript
import { useState } from 'react';  // already present
import { ArrowsPointingOutIcon } from '@heroicons/react/24/outline';
import TaskDetailModal from './TaskDetailModal';
```

Add state inside the component (after the existing `useState` calls):
```typescript
const [showDetail, setShowDetail] = useState(false);
```

In the actions `<div>` (the one with `opacity-0 group-hover:opacity-100`), add the expand button before the pencil button:
```typescript
<button
  title="Open detail"
  onClick={() => setShowDetail(true)}
  className="p-1 text-gray-400 hover:text-blue-500 rounded"
>
  <ArrowsPointingOutIcon className="w-4 h-4" />
</button>
```

After the closing `</div>` of the task card, add:
```typescript
{showDetail && (
  <TaskDetailModal task={task} onClose={() => setShowDetail(false)} />
)}
```

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```
Expected: all tests PASS.

- [ ] **Step 6: Start dev server and do end-to-end verification**

```bash
npm run dev
```

Verify the following manually:
1. Hover over any TaskItem → expand icon appears in the actions area.
2. Click expand → full-screen modal opens with task title pre-filled.
3. Edit title, click Save → task updates in the list after closing.
4. In the modal bottom section: default is list view showing child tasks.
5. Click the mindmap icon → canvas renders; parent task is root, children are nodes.
6. Add a child node in mindmap mode → switch to list mode → new subtask appears.
7. Close modal → main task list is unchanged.
8. Open an existing mindmap from the sidebar → canvas still works with keyboard shortcuts (arrow keys, Tab, Delete).

- [ ] **Step 7: Commit**

```bash
git add src/components/tasks/TaskItem.tsx src/components/tasks/__tests__/TaskItem.test.tsx
git commit -m "feat: add expand button to TaskItem — opens dual-view task detail modal"
```

---

## Self-Review

**Spec coverage:**
- ✅ Expand button on TaskItem → modal opens
- ✅ Full-screen modal (A choice confirmed by user)
- ✅ Top: task edit form; bottom: children dual-view
- ✅ List/mindmap toggle in top-right of children area
- ✅ Same data (tasks collection) for both views
- ✅ TreeRenderer shared between MindmapCanvas and TaskDetailChildren
- ✅ Mindmap keyboard shortcuts preserved (useMindmapKeyboard stays in MindmapCanvas)
- ✅ Recursive: TaskItem inside modal also has expand button for nested drilldown

**Type consistency:**
- `setEditingNodeId` in TreeContext matches usage throughout (was `setEditingNode` in mindmapStore — confirm the store method name is `setEditingNode` and the prop forwarded from MindmapCanvas to TreeRenderer as `onEditNode` maps to `setEditingNode`)
- `ItemContext` imported consistently from `../../services/itemService`
- `LayoutNode` imported from `./hooks/useTreeLayout` consistently

**Placeholder check:** No TBDs — all code blocks are complete.
