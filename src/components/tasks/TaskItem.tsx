import { useState } from 'react';
import { useTaskStore } from '../../store/taskStore';
import type { Task } from '../../types';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import {
  CheckCircleIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  FlagIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleFilledIcon } from '@heroicons/react/24/solid';

interface TaskItemProps {
  task: Task;
}

const TaskItem = ({ task }: TaskItemProps) => {
  const { updateTask, deleteTask, labels } = useTaskStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const handleToggleComplete = async () => {
    await updateTask(task.id, {
      completed: !task.completed,
      updatedAt: new Date(),
    });
  };

  const handleSaveEdit = async () => {
    if (editTitle.trim()) {
      await updateTask(task.id, {
        title: editTitle.trim(),
        updatedAt: new Date(),
      });
    } else {
      setEditTitle(task.title);
    }
    setIsEditing(false);
  };

  const handleKeyPress = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      await handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditTitle(task.title);
      setIsEditing(false);
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'text-red-500';
      case 2: return 'text-orange-500';
      case 3: return 'text-blue-500';
      case 4: return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getPriorityBorder = (priority: number) => {
    switch (priority) {
      case 1: return 'border-l-red-500';
      case 2: return 'border-l-orange-500';
      case 3: return 'border-l-blue-500';
      case 4: return 'border-l-gray-300';
      default: return 'border-l-gray-300';
    }
  };

  const formatDueDate = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  const getDueDateColor = (date: Date) => {
    if (isPast(date) && !isToday(date)) return 'text-red-500';
    if (isToday(date)) return 'text-orange-500';
    return 'text-gray-500';
  };

  return (
    <div
      className={`group bg-white border border-gray-200 rounded-lg p-3 md:p-4 hover:shadow-md transition-all duration-200 border-l-4 ${getPriorityBorder(
        task.priority
      )} ${task.completed ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start space-x-3">
        {/* Checkbox */}
        <button
          onClick={handleToggleComplete}
          className="flex-shrink-0 mt-0.5 p-1 touch-manipulation"
        >
          {task.completed ? (
            <CheckCircleFilledIcon className="w-6 h-6 text-green-500 md:w-7 md:h-7" />
          ) : (
            <CheckCircleIcon className="w-6 h-6 text-gray-400 hover:text-green-500 md:w-7 md:h-7" />
          )}
        </button>

        {/* Task Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={handleKeyPress}
              className="min-h-[44px] w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 md:text-base"
              autoFocus
            />
          ) : (
            <h3
              className={`-my-2 cursor-pointer py-2 text-sm font-medium touch-manipulation md:text-base ${
                task.completed ? 'line-through text-gray-500' : 'text-gray-900'
              }`}
              onClick={() => setIsEditing(true)}
            >
              {task.title}
            </h3>
          )}

          {task.description && (
            <p className="mt-1 text-xs text-gray-500 md:text-sm">{task.description}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-3 md:gap-4">
            {task.priority < 4 && (
              <div className="flex items-center space-x-1">
                <FlagIcon className={`w-4 h-4 ${getPriorityColor(task.priority)}`} />
                <span className={`text-xs ${getPriorityColor(task.priority)}`}>
                  P{task.priority}
                </span>
              </div>
            )}

            {task.dueDate && (
              <div className="flex items-center space-x-1">
                <CalendarIcon className="w-4 h-4 text-gray-400" />
                <span className={`text-xs ${getDueDateColor(task.dueDate)}`}>
                  {formatDueDate(task.dueDate)}
                </span>
              </div>
            )}

            {task.labels.length > 0 && labels.length > 0 && (
              <div className="flex items-center space-x-1">
                {task.labels.slice(0, 2).map((labelId, index) => {
                  const label = labels.find((currentLabel) => currentLabel.id === labelId);
                  return (
                    <span
                      key={index}
                      className="inline-block rounded bg-gray-100 px-2 py-1 text-xs text-gray-600"
                    >
                      {label?.name || labelId}
                    </span>
                  );
                })}
                {task.labels.length > 2 && (
                  <span className="text-xs text-gray-400">
                    +{task.labels.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 transition-opacity md:opacity-0 md:group-hover:opacity-100">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsEditing(true)}
              className="rounded p-2 text-gray-400 hover:text-gray-600 touch-manipulation"
            >
              <PencilIcon className="h-5 w-5 md:h-4 md:w-4" />
            </button>
            <button
              onClick={async () => {
                await deleteTask(task.id);
              }}
              className="rounded p-2 text-gray-400 hover:text-red-500 touch-manipulation"
            >
              <TrashIcon className="h-5 w-5 md:h-4 md:w-4" />
            </button>
          </div>
        </div>
      </div>

      {task.subtasks.length > 0 && (
        <div className="ml-9 mt-3 space-y-2">
          {task.subtasks.map((subtask) => (
            <div key={subtask.id} className="flex items-center space-x-2">
              <button className="flex-shrink-0">
                {subtask.completed ? (
                  <CheckCircleFilledIcon className="w-4 h-4 text-green-500" />
                ) : (
                  <CheckCircleIcon className="w-4 h-4 text-gray-400 hover:text-green-500" />
                )}
              </button>
              <span
                className={`text-xs ${
                  subtask.completed ? 'line-through text-gray-500' : 'text-gray-700'
                }`}
              >
                {subtask.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskItem;
