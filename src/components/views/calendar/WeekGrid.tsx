import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { format, isSameDay } from 'date-fns';
import type { Task } from '../../../types';
import { getTasksForDate } from '../../../utils/calendar';
import TaskPill from './TaskPill';

interface WeekDayColumnProps {
  date: Date;
  tasks: Task[];
  isToday: boolean;
  onAddTask: (date: Date) => void;
}

function WeekDayColumn({ date, tasks, isToday, onAddTask }: WeekDayColumnProps) {
  const dateId = format(date, 'yyyy-MM-dd');
  const { setNodeRef, isOver } = useDroppable({ id: dateId });

  return (
    <div
      ref={setNodeRef}
      className={`
        flex flex-col border-r border-gray-200 dark:border-gray-700 last:border-r-0
        ${isOver ? 'bg-blue-50 dark:bg-blue-900/30' : ''}
        ${isToday ? 'bg-blue-50/40 dark:bg-blue-900/20' : ''}
      `}
    >
      {/* Day header */}
      <div className="text-center py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">
          {format(date, 'EEE')}
        </div>
        <div
          className={`
            text-sm mt-0.5
            ${isToday
              ? 'font-bold bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center mx-auto'
              : 'font-medium text-gray-700 dark:text-gray-300'
            }
          `}
        >
          {format(date, 'd')}
        </div>
      </div>

      {/* Tasks list */}
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 overflow-y-auto p-1 space-y-1">
          {tasks.map((task) => (
            <TaskPill key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>

      {/* Add button */}
      <button
        onClick={() => onAddTask(date)}
        className="
          mx-1 mb-1 py-1 text-xs rounded
          text-gray-400 dark:text-gray-500
          hover:bg-gray-100 dark:hover:bg-gray-700
          hover:text-gray-600 dark:hover:text-gray-300
          transition-colors
        "
      >
        + Add task
      </button>
    </div>
  );
}

interface WeekGridProps {
  days: Date[];
  tasks: Task[];
  onAddTask: (date: Date) => void;
}

export default function WeekGrid({ days, tasks, onAddTask }: WeekGridProps) {
  const today = new Date();

  return (
    <div className="flex-1 grid grid-cols-7 border-t border-l border-gray-200 dark:border-gray-700">
      {days.map((date, idx) => (
        <WeekDayColumn
          key={idx}
          date={date}
          tasks={getTasksForDate(tasks, date)}
          isToday={isSameDay(date, today)}
          onAddTask={onAddTask}
        />
      ))}
    </div>
  );
}
