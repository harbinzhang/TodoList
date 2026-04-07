import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import type { Task } from '../../../types';
import { useTaskStore } from '../../../store/taskStore';

interface BoardCardProps {
  task: Task;
}

const PRIORITY_COLORS: Record<number, string> = {
  1: '#ef4444',
  2: '#f97316',
  3: '#3b82f6',
  4: '#9ca3af',
};

const BoardCard = ({ task }: BoardCardProps) => {
  const setSelectedTaskId = useTaskStore((s) => s.setSelectedTaskId);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const completedSubtasks = task.subtasks?.filter((s) => s.completed).length ?? 0;
  const totalSubtasks = task.subtasks?.length ?? 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative cursor-pointer rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800 ${
        isDragging ? 'z-50 shadow-lg' : ''
      }`}
      onClick={() => setSelectedTaskId(task.id)}
    >
      {/* Priority left border stripe */}
      <div
        className="absolute bottom-0 left-0 top-0 w-1 rounded-l-lg"
        style={{ backgroundColor: PRIORITY_COLORS[task.priority] || PRIORITY_COLORS[4] }}
      />

      <div className="flex items-start gap-2 py-2.5 pl-4 pr-3">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="mt-0.5 flex-shrink-0 cursor-grab opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <svg
            width="12"
            height="16"
            viewBox="0 0 12 16"
            className="text-gray-400 dark:text-gray-500"
          >
            <circle cx="3" cy="3" r="1.5" fill="currentColor" />
            <circle cx="9" cy="3" r="1.5" fill="currentColor" />
            <circle cx="3" cy="8" r="1.5" fill="currentColor" />
            <circle cx="9" cy="8" r="1.5" fill="currentColor" />
            <circle cx="3" cy="13" r="1.5" fill="currentColor" />
            <circle cx="9" cy="13" r="1.5" fill="currentColor" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          {/* Title */}
          <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
            {task.title}
          </p>

          {/* Meta row */}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {/* Due date */}
            {dueDate && (
              <span className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400">
                <svg className="mr-0.5 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {format(dueDate, 'MMM d')}
              </span>
            )}

            {/* Subtask count */}
            {totalSubtasks > 0 && (
              <span className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400">
                <svg className="mr-0.5 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {completedSubtasks}/{totalSubtasks}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoardCard;
