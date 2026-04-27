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
