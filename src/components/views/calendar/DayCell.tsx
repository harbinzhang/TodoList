import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { format } from 'date-fns';
import type { Task } from '../../../types';
import { getDensityLevel } from '../../../utils/calendar';
import TaskPill from './TaskPill';

const DENSITY_COLORS: Record<string, string> = {
  none: '',
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-red-500',
};

interface DayCellProps {
  date: Date;
  tasks: Task[];
  isCurrentMonth: boolean;
  isToday: boolean;
  onAddTask: (date: Date) => void;
}

export default function DayCell({ date, tasks, isCurrentMonth, isToday, onAddTask }: DayCellProps) {
  const dateId = format(date, 'yyyy-MM-dd');
  const density = getDensityLevel(tasks.length);
  const visibleTasks = tasks.slice(0, 3);
  const remainingCount = tasks.length - 3;

  const { setNodeRef, isOver } = useDroppable({ id: dateId });

  return (
    <div
      ref={setNodeRef}
      onClick={(e) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.cellBg === 'true') {
          onAddTask(date);
        }
      }}
      className={`
        min-h-[100px] border-r border-b p-1 flex flex-col
        border-gray-200 dark:border-gray-700
        ${isOver ? 'bg-blue-50 dark:bg-blue-900/30' : ''}
        ${isToday ? 'bg-blue-50/50 dark:bg-blue-900/20 ring-1 ring-inset ring-blue-400 dark:ring-blue-500' : ''}
        ${!isCurrentMonth ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800'}
        cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750
        transition-colors
      `}
    >
      {/* Date header */}
      <div className="flex items-center gap-1 mb-0.5" data-cell-bg="true">
        <span
          className={`
            text-xs leading-none
            ${isToday
              ? 'font-bold bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center'
              : isCurrentMonth
                ? 'font-medium text-gray-700 dark:text-gray-300'
                : 'text-gray-400 dark:text-gray-500'
            }
          `}
        >
          {format(date, 'd')}
        </span>
        {density !== 'none' && (
          <span className={`w-1.5 h-1.5 rounded-full ${DENSITY_COLORS[density]}`} />
        )}
      </div>

      {/* Task pills */}
      <SortableContext items={visibleTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-0.5 flex-1">
          {visibleTasks.map((task) => (
            <TaskPill key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>

      {remainingCount > 0 && (
        <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 pl-0.5">
          +{remainingCount} more
        </span>
      )}
    </div>
  );
}
