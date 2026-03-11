import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableTaskItem from '../../tasks/SortableTaskItem';
import type { Task } from '../../../types';

interface OverdueSectionProps {
  tasks: Task[];
}

const OverdueSection = ({ tasks }: OverdueSectionProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: 'overdue' });

  if (tasks.length === 0) return null;

  const taskIds = tasks.map((t) => t.id);

  return (
    <div
      ref={setNodeRef}
      className={`
        mb-4 rounded-lg border border-red-200 bg-red-50 p-3
        transition-colors
        dark:border-red-900 dark:bg-red-950/30
        ${isOver ? 'ring-2 ring-red-400 dark:ring-red-600' : ''}
      `}
    >
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">
          Overdue
        </h3>
        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-200 px-1.5 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-300">
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

export default OverdueSection;
