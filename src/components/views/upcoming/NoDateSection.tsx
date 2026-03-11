import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableTaskItem from '../../tasks/SortableTaskItem';
import type { Task } from '../../../types';

interface NoDateSectionProps {
  tasks: Task[];
}

const NoDateSection = ({ tasks }: NoDateSectionProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: 'no-date' });

  if (tasks.length === 0) return null;

  const taskIds = tasks.map((t) => t.id);

  return (
    <div
      ref={setNodeRef}
      className={`
        mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3
        transition-colors
        dark:border-gray-700 dark:bg-gray-800/50
        ${isOver ? 'ring-2 ring-gray-400 dark:ring-gray-500' : ''}
      `}
    >
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
          No date
        </h3>
        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gray-200 px-1.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
          {tasks.length}
        </span>
      </div>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {tasks.map((task) => (
            <SortableTaskItem key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};

export default NoDateSection;
