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
  const { updateTask, deleteTask } = useTaskStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const handleToggleComplete = () => {
    updateTask(task.id, { 
      completed: !task.completed,
      updatedAt: new Date()
    });
  };

  const handleSaveEdit = () => {
    if (editTitle.trim()) {
      updateTask(task.id, { 
        title: editTitle.trim(),
        updatedAt: new Date()
      });
    } else {
      setEditTitle(task.title);
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
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
      className={`group bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 border-l-4 ${getPriorityBorder(
        task.priority
      )} ${task.completed ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start space-x-3">
        {/* Checkbox */}
        <button
          onClick={handleToggleComplete}
          className="flex-shrink-0 mt-0.5"
        >
          {task.completed ? (
            <CheckCircleFilledIcon className="w-6 h-6 text-green-500" />
          ) : (
            <CheckCircleIcon className="w-6 h-6 text-gray-400 hover:text-green-500" />
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
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            <h3
              className={`text-sm font-medium ${
                task.completed ? 'line-through text-gray-500' : 'text-gray-900'
              } cursor-pointer`}
              onClick={() => setIsEditing(true)}
            >
              {task.title}
            </h3>
          )}

          {task.description && (
            <p className="text-xs text-gray-500 mt-1">{task.description}</p>
          )}

          {/* Task Meta */}
          <div className="flex items-center space-x-4 mt-2">
            {/* Priority */}
            {task.priority < 4 && (
              <div className="flex items-center space-x-1">
                <FlagIcon className={`w-4 h-4 ${getPriorityColor(task.priority)}`} />
                <span className={`text-xs ${getPriorityColor(task.priority)}`}>
                  P{task.priority}
                </span>
              </div>
            )}

            {/* Due Date */}
            {task.dueDate && (
              <div className="flex items-center space-x-1">
                <CalendarIcon className="w-4 h-4 text-gray-400" />
                <span className={`text-xs ${getDueDateColor(task.dueDate)}`}>
                  {formatDueDate(task.dueDate)}
                </span>
              </div>
            )}

            {/* Labels */}
            {task.labels.length > 0 && (
              <div className="flex items-center space-x-1">
                {task.labels.slice(0, 2).map((label, index) => (
                  <span
                    key={index}
                    className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                  >
                    {label}
                  </span>
                ))}
                {task.labels.length > 2 && (
                  <span className="text-xs text-gray-400">
                    +{task.labels.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => deleteTask(task.id)}
              className="p-1 text-gray-400 hover:text-red-500 rounded"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Subtasks */}
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