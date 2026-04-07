import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableTaskItem from '../../tasks/SortableTaskItem';
import type { DayGroup as DayGroupType } from '../../../utils/upcoming';

interface DayGroupProps {
  dayGroup: DayGroupType;
  onAddTask: (date: Date) => void;
}

const DayGroupComponent = ({ dayGroup, onAddTask }: DayGroupProps) => {
  const { date, dateKey, label, isToday, tasks } = dayGroup;
  const { setNodeRef, isOver } = useDroppable({ id: dateKey });

  const taskIds = tasks.map((t) => t.id);

  return (
    <div
      ref={setNodeRef}
      className={`
        mb-3 rounded-lg border p-3 transition-colors
        ${
          isToday
            ? 'border-indigo-200 bg-indigo-50/50 dark:border-indigo-900 dark:bg-indigo-950/20'
            : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/40'
        }
        ${isOver ? 'ring-2 ring-indigo-400 dark:ring-indigo-500' : ''}
      `}
    >
      {/* Sticky date header */}
      <div className="sticky top-0 z-10 mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3
            className={`text-sm font-semibold ${
              isToday
                ? 'text-indigo-700 dark:text-indigo-400'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {label}
          </h3>
          {tasks.length > 0 && (
            <span
              className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-medium ${
                isToday
                  ? 'bg-indigo-200 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300'
                  : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {tasks.length}
            </span>
          )}
        </div>

        <button
          onClick={() => onAddTask(date)}
          className={`flex h-6 w-6 items-center justify-center rounded-md text-lg leading-none transition-colors ${
            isToday
              ? 'text-indigo-400 hover:bg-indigo-100 hover:text-indigo-600 dark:text-indigo-500 dark:hover:bg-indigo-900/50 dark:hover:text-indigo-300'
              : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300'
          }`}
          aria-label={`Add task for ${label}`}
        >
          +
        </button>
      </div>

      {/* Task list or empty state */}
      {tasks.length > 0 ? (
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {tasks.map((task) => (
              <SortableTaskItem key={task.id} task={task} />
            ))}
          </div>
        </SortableContext>
      ) : (
        <p className="py-2 text-center text-xs text-gray-400 dark:text-gray-500">
          No tasks
        </p>
      )}
    </div>
  );
};

export default DayGroupComponent;
