import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../../../types';
import { useTaskStore } from '../../../store/taskStore';

const PRIORITY_COLORS: Record<1 | 2 | 3 | 4, string> = {
  1: 'border-l-red-500',
  2: 'border-l-orange-500',
  3: 'border-l-blue-500',
  4: 'border-l-gray-400',
};

interface TaskPillProps {
  task: Task;
}

export default function TaskPill({ task }: TaskPillProps) {
  const { setSelectedTaskId } = useTaskStore();

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
  };

  const truncatedTitle =
    task.title.length > 20 ? task.title.slice(0, 20) + '…' : task.title;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedTaskId(task.id);
      }}
      className={`
        flex items-center rounded px-1.5 py-0.5 text-xs truncate cursor-pointer
        border-l-2 ${PRIORITY_COLORS[task.priority]}
        bg-white dark:bg-gray-700
        text-gray-800 dark:text-gray-100
        hover:bg-gray-100 dark:hover:bg-gray-600
        shadow-sm
        ${isDragging ? 'opacity-50 shadow-lg ring-2 ring-blue-400' : ''}
      `}
      title={task.title}
    >
      <span className="truncate">{truncatedTitle}</span>
    </div>
  );
}
