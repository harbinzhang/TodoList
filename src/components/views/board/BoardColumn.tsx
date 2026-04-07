import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { PlusIcon } from '@heroicons/react/24/outline';
import type { BoardColumn as BoardColumnType } from '../../../utils/board';
import type { BoardColumnSource } from '../../../utils/board';
import { getDropFieldUpdate } from '../../../utils/board';
import { taskService } from '../../../services/taskService';
import { sectionService } from '../../../services/sectionService';
import { useAuthSession } from '../../../providers/AuthProvider';
import { useTaskStore } from '../../../store/taskStore';
import ColumnHeader from './ColumnHeader';
import BoardCard from './BoardCard';

interface BoardColumnProps {
  column: BoardColumnType;
  source: BoardColumnSource;
  wipLimit?: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSetWipLimit: () => void;
  dragColumnId?: string;
}

const BoardColumn = ({
  column,
  source,
  wipLimit,
  isCollapsed,
  onToggleCollapse,
  onSetWipLimit,
  dragColumnId,
}: BoardColumnProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const { user } = useAuthSession();
  const currentProjectId = useTaskStore((s) => s.currentProjectId);

  const { setNodeRef, isOver } = useDroppable({
    id: column.def.id,
  });

  const taskIds = column.tasks.map((t) => t.id);

  const handleRename = source === 'section'
    ? async (newName: string) => {
        try {
          await sectionService.updateSection(column.def.id, { name: newName });
        } catch (err) {
          console.error('Failed to rename section:', err);
        }
      }
    : undefined;

  const handleAddTask = async () => {
    const trimmed = newTitle.trim();
    if (!trimmed || !user) return;

    const fieldUpdate = getDropFieldUpdate(source, column.def.id);

    try {
      await taskService.createTask({
        title: trimmed,
        completed: fieldUpdate.completed ?? false,
        priority: (fieldUpdate.priority as 1 | 2 | 3 | 4) ?? 4,
        userId: user.uid,
        projectId: currentProjectId || undefined,
        sectionId: fieldUpdate.sectionId,
        labels: [],
        subtasks: [],
      });
    } catch (err) {
      console.error('Failed to create task:', err);
    }

    setNewTitle('');
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTask();
    } else if (e.key === 'Escape') {
      setNewTitle('');
      setIsAdding(false);
    }
  };

  if (isCollapsed) {
    return (
      <div className="flex h-full w-10 flex-shrink-0 flex-col items-center rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <ColumnHeader
          title={column.def.title}
          color={column.def.color}
          taskCount={column.tasks.length}
          wipLimit={wipLimit}
          isCollapsed
          onToggleCollapse={onToggleCollapse}
          onSetWipLimit={onSetWipLimit}
          onRename={handleRename}
          dragColumnId={dragColumnId}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex min-w-[280px] max-w-[280px] flex-shrink-0 flex-col rounded-lg border transition-colors ${
        isOver
          ? 'border-blue-400 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-900/10'
          : 'border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/30'
      }`}
    >
      <ColumnHeader
        title={column.def.title}
        color={column.def.color}
        taskCount={column.tasks.length}
        wipLimit={wipLimit}
        isCollapsed={false}
        onToggleCollapse={onToggleCollapse}
        onSetWipLimit={onSetWipLimit}
        onRename={handleRename}
        dragColumnId={dragColumnId}
      />

      {/* Card list */}
      <div
        ref={setNodeRef}
        className="flex-1 space-y-2 overflow-y-auto px-2 py-2"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {column.tasks.map((task) => (
            <BoardCard key={task.id} task={task} />
          ))}
        </SortableContext>

        {column.tasks.length === 0 && !isAdding && (
          <div className="flex items-center justify-center py-8 text-xs text-gray-400 dark:text-gray-500">
            No tasks
          </div>
        )}
      </div>

      {/* Add task */}
      <div className="border-t border-gray-200 px-2 py-2 dark:border-gray-700">
        {isAdding ? (
          <div className="space-y-1.5">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (!newTitle.trim()) {
                  setIsAdding(false);
                }
              }}
              autoFocus
              placeholder="Task name"
              className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            />
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleAddTask}
                className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setNewTitle('');
                  setIsAdding(false);
                }}
                className="rounded-md px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <PlusIcon className="h-4 w-4" />
            Add task
          </button>
        )}
      </div>
    </div>
  );
};

export default BoardColumn;
