import { useState } from 'react';
import { Bars3Icon, RectangleGroupIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/authStore';
import TreeRenderer from '../mindmap/TreeRenderer';
import type { Task, Subtask } from '../../types';
import type { Item } from '../../types';

type DisplayMode = 'list' | 'mindmap';

interface TaskDetailChildrenProps {
  task: Task;
}

// Convert Task + inline subtasks to Item[] for TreeRenderer
function toMindmapItems(task: Task): Item[] {
  const root: Item = {
    id: task.id,
    title: task.title,
    mindmapId: task.id,
    parentId: null,
    completed: task.completed,
    priority: task.priority,
    userId: task.userId,
    sortOrder: 0,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
  const children: Item[] = task.subtasks.map((sub: Subtask, i: number) => ({
    id: sub.id,
    title: sub.title,
    mindmapId: task.id,
    parentId: task.id,
    completed: sub.completed,
    priority: 4 as const,
    userId: task.userId,
    sortOrder: i,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
  return [root, ...children];
}

const TaskDetailChildren = ({ task }: TaskDetailChildrenProps) => {
  const [mode, setMode] = useState<DisplayMode>('list');
  const { user } = useAuthStore();

  const subtasks = task.subtasks ?? [];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Toggle bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
        <span className="text-sm font-medium text-gray-600">
          {subtasks.length} {subtasks.length === 1 ? 'subtask' : 'subtasks'}
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
            <RectangleGroupIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 ${mode === 'mindmap' ? 'overflow-hidden flex flex-col' : 'overflow-auto'}`}>
        {mode === 'list' ? (
          <div className="p-6 space-y-2">
            {subtasks.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No subtasks yet.</p>
            ) : (
              subtasks.map((sub: Subtask) => (
                <div key={sub.id} className="flex items-center space-x-3 py-2 px-3 bg-white border border-gray-100 rounded-lg">
                  <span className={`text-sm ${sub.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    {sub.title}
                  </span>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="flex flex-col flex-1 h-full">
            <TreeRenderer
              items={toMindmapItems(task)}
              itemContext="mindmap"
              contextId={task.id}
              userId={user?.uid ?? ''}
              autoFitKey={task.id}
              readOnly
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskDetailChildren;
