import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useTaskStore } from '../../store/taskStore';
import { useAuthStore } from '../../store/authStore';
import {
  groupTasksBySource,
  getDropFieldUpdate,
  type BoardColumnSource,
} from '../../utils/board';
import { taskService } from '../../services/taskService';
import { sectionService } from '../../services/sectionService';
import ColumnSourcePicker from './board/ColumnSourcePicker';
import BoardColumn from './board/BoardColumn';
import BoardCard from './board/BoardCard';
import WipLimitDialog from './board/WipLimitDialog';
import type { Task } from '../../types';

const COL_PREFIX = 'col:';

// --- localStorage helpers ---
function getWipLimit(source: BoardColumnSource, columnId: string): number | undefined {
  const raw = localStorage.getItem(`board:wip:${source}:${columnId}`);
  if (raw === null) return undefined;
  const n = parseInt(raw, 10);
  return isNaN(n) ? undefined : n;
}

function setWipLimitStorage(source: BoardColumnSource, columnId: string, limit: number | undefined) {
  const key = `board:wip:${source}:${columnId}`;
  if (limit === undefined) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, String(limit));
  }
}

function getCollapsed(columnId: string): boolean {
  return localStorage.getItem(`board:collapsed:${columnId}`) === 'true';
}

function setCollapsedStorage(columnId: string, collapsed: boolean) {
  const key = `board:collapsed:${columnId}`;
  if (collapsed) {
    localStorage.setItem(key, 'true');
  } else {
    localStorage.removeItem(key);
  }
}

const BoardView = () => {
  const tasks = useTaskStore((s) => s.tasks);
  const sections = useTaskStore((s) => s.sections);
  const currentProjectId = useTaskStore((s) => s.currentProjectId);
  const currentView = useTaskStore((s) => s.currentView);
  const currentLabelId = useTaskStore((s) => s.currentLabelId);
  const boardColumnSource = useTaskStore((s) => s.boardColumnSource);
  const setBoardColumnSource = useTaskStore((s) => s.setBoardColumnSource);

  const [collapsedState, setCollapsedState] = useState<Record<string, boolean>>({});
  const [wipLimitState, setWipLimitState] = useState<Record<string, number | undefined>>({});
  const [wipDialogColumnId, setWipDialogColumnId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const addColumnInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const filteredSections = useMemo(
    () =>
      currentProjectId
        ? sections.filter((s) => s.projectId === currentProjectId)
        : sections,
    [sections, currentProjectId]
  );

  const filteredTasks = useMemo(() => {
    let result = tasks;

    if (currentView === 'project' && currentProjectId) {
      result = result.filter((t) => t.projectId === currentProjectId);
    }
    if (currentView === 'label' && currentLabelId) {
      result = result.filter((t) => t.labels?.includes(currentLabelId));
    }
    if (boardColumnSource !== 'status') {
      result = result.filter((t) => !t.completed);
    }

    return result;
  }, [tasks, currentProjectId, currentLabelId, currentView, boardColumnSource]);

  const columns = useMemo(
    () => groupTasksBySource(filteredTasks, boardColumnSource, filteredSections),
    [filteredTasks, boardColumnSource, filteredSections]
  );

  const isColumnCollapsed = useCallback(
    (columnId: string) => {
      if (columnId in collapsedState) return collapsedState[columnId];
      return getCollapsed(columnId);
    },
    [collapsedState]
  );

  const toggleCollapse = useCallback((columnId: string) => {
    setCollapsedState((prev) => {
      const current = prev[columnId] ?? getCollapsed(columnId);
      const next = !current;
      setCollapsedStorage(columnId, next);
      return { ...prev, [columnId]: next };
    });
  }, []);

  const getColumnWipLimit = useCallback(
    (columnId: string) => {
      if (columnId in wipLimitState) return wipLimitState[columnId];
      return getWipLimit(boardColumnSource, columnId);
    },
    [wipLimitState, boardColumnSource]
  );

  const handleSaveWipLimit = useCallback(
    (columnId: string, limit: number | undefined) => {
      setWipLimitStorage(boardColumnSource, columnId, limit);
      setWipLimitState((prev) => ({ ...prev, [columnId]: limit }));
    },
    [boardColumnSource]
  );

  const canReorderColumns = boardColumnSource === 'section';
  const columnIds = useMemo(() => columns.map((c) => c.def.id), [columns]);

  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const activeColumnData = useMemo(
    () => (activeColumnId ? columns.find((c) => c.def.id === activeColumnId) : null),
    [activeColumnId, columns]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    if (id.startsWith(COL_PREFIX)) {
      setActiveColumnId(id.slice(COL_PREFIX.length));
      setActiveTask(null);
    } else {
      setActiveColumnId(null);
      const task = filteredTasks.find((t) => t.id === id);
      setActiveTask(task || null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    setActiveColumnId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // --- Column reorder ---
    if (activeId.startsWith(COL_PREFIX)) {
      const fromColId = activeId.slice(COL_PREFIX.length);
      // The drop target is a column droppable (plain column.def.id)
      const toColId = overId.startsWith(COL_PREFIX)
        ? overId.slice(COL_PREFIX.length)
        : overId;
      // Check if toColId is actually a column
      const isColumnTarget = columnIds.includes(toColId);
      if (!isColumnTarget || fromColId === toColId) return;

      const oldIndex = columns.findIndex((c) => c.def.id === fromColId);
      const newIndex = columns.findIndex((c) => c.def.id === toColId);
      if (oldIndex < 0 || newIndex < 0) return;

      const reordered = arrayMove(columns, oldIndex, newIndex);
      const updates = reordered
        .filter((col) => col.def.id !== '__no_section__')
        .map((col, idx) => ({
          sectionId: col.def.id,
          sortOrder: idx,
        }));

      try {
        await Promise.all(
          updates.map((u) => sectionService.updateSection(u.sectionId, { sortOrder: u.sortOrder }))
        );
      } catch (err) {
        console.error('Failed to reorder columns:', err);
      }
      return;
    }

    // --- Task drag ---
    const sourceColumn = columns.find((col) =>
      col.tasks.some((t) => t.id === activeId)
    );
    const destColumn = columns.find(
      (col) =>
        col.def.id === overId || col.tasks.some((t) => t.id === overId)
    );

    if (!sourceColumn || !destColumn) return;

    const isSameColumn = sourceColumn.def.id === destColumn.def.id;

    if (isSameColumn) {
      const oldIndex = sourceColumn.tasks.findIndex((t) => t.id === activeId);
      const overTaskIndex = sourceColumn.tasks.findIndex((t) => t.id === overId);
      const newIndex = overTaskIndex >= 0 ? overTaskIndex : sourceColumn.tasks.length;

      if (oldIndex === newIndex || oldIndex < 0) return;

      const reordered = arrayMove(sourceColumn.tasks, oldIndex, newIndex);
      const updates = reordered.map((t, idx) => ({
        taskId: t.id,
        sortOrder: idx,
      }));

      try {
        await taskService.batchUpdateSortOrder(updates);
      } catch (err) {
        console.error('Failed to reorder tasks:', err);
      }
    } else {
      const fieldUpdate = getDropFieldUpdate(boardColumnSource, destColumn.def.id);

      try {
        await taskService.updateTask(activeId, fieldUpdate);
      } catch (err) {
        console.error('Failed to move task:', err);
      }
    }
  };

  const handleSourceChange = (source: BoardColumnSource) => {
    setBoardColumnSource(source);
    setWipLimitState({});
    setCollapsedState({});
  };

  // "Add section" — visible whenever grouping by sections
  const canAddColumn = boardColumnSource === 'section';

  useEffect(() => {
    if (isAddingColumn && addColumnInputRef.current) {
      addColumnInputRef.current.focus();
    }
  }, [isAddingColumn]);

  const handleAddColumn = useCallback(async () => {
    const name = newColumnName.trim();
    if (!name || !user) return;

    try {
      await sectionService.createSection({
        name,
        projectId: currentProjectId || '',
        userId: user.uid,
        sortOrder: filteredSections.length,
      });
    } catch (err) {
      console.error('Failed to create section:', err);
    }

    setNewColumnName('');
    setIsAddingColumn(false);
  }, [newColumnName, user, currentProjectId, filteredSections.length]);

  const handleAddColumnKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddColumn();
      } else if (e.key === 'Escape') {
        setNewColumnName('');
        setIsAddingColumn(false);
      }
    },
    [handleAddColumn]
  );

  return (
    <div className="flex h-full flex-col">
      {/* Sub-header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Board
        </h2>
        <ColumnSourcePicker
          source={boardColumnSource}
          onChange={handleSourceChange}
        />
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 gap-4 overflow-x-auto p-4">
            {columns.map((column) => (
              <div key={column.def.id} className="relative">
                <BoardColumn
                  column={column}
                  source={boardColumnSource}
                  wipLimit={getColumnWipLimit(column.def.id)}
                  isCollapsed={isColumnCollapsed(column.def.id)}
                  onToggleCollapse={() => toggleCollapse(column.def.id)}
                  onSetWipLimit={() => setWipDialogColumnId(column.def.id)}
                  dragColumnId={canReorderColumns ? `${COL_PREFIX}${column.def.id}` : undefined}
                />

                {wipDialogColumnId === column.def.id && (
                  <WipLimitDialog
                    columnId={column.def.id}
                    currentLimit={getColumnWipLimit(column.def.id)}
                    onSave={(limit) => handleSaveWipLimit(column.def.id, limit)}
                    onClose={() => setWipDialogColumnId(null)}
                  />
                )}
              </div>
            ))}

          {/* Add section — Todoist-style column card */}
          {canAddColumn && (
            <div className="flex-shrink-0">
              {isAddingColumn ? (
                <div className="flex min-w-[280px] max-w-[280px] flex-col rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  {/* Header area to match column header height */}
                  <div className="rounded-t-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-800/50">
                    <input
                      ref={addColumnInputRef}
                      type="text"
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      onKeyDown={handleAddColumnKeyDown} 
                      onBlur={() => {
                        if (!newColumnName.trim()) {
                          setIsAddingColumn(false);
                        }
                      }}
                      placeholder="Section name"
                      className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-2">
                    <button
                      onClick={handleAddColumn}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                    >
                      Add section
                    </button>
                    <button
                      onClick={() => {
                        setNewColumnName('');
                        setIsAddingColumn(false);
                      }}
                      className="rounded-md px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingColumn(true)}
                  className="flex min-w-[280px] max-w-[280px] items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-500 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-750 dark:hover:text-gray-200"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded border border-gray-300 dark:border-gray-600">
                    <PlusIcon className="h-3.5 w-3.5" />
                  </span>
                  Add section
                </button>
              )}
            </div>
          )}
        </div>

        {/* Drag overlay */}
        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <div className="w-[264px] rotate-2 opacity-90">
              <BoardCard task={activeTask} />
            </div>
          ) : activeColumnData ? (
            <div className="w-[280px] rotate-1 opacity-80">
              <BoardColumn
                column={activeColumnData}
                source={boardColumnSource}
                wipLimit={getColumnWipLimit(activeColumnData.def.id)}
                isCollapsed={false}
                onToggleCollapse={() => {}}
                onSetWipLimit={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default BoardView;
