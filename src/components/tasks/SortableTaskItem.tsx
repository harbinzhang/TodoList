import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskItem from './TaskItem';
import type { Task } from '../../types';

interface SortableTaskItemProps {
  task: Task;
}

const SortableTaskItem = ({ task }: SortableTaskItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto' as const,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskItem
        task={task}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
};

export default SortableTaskItem;
