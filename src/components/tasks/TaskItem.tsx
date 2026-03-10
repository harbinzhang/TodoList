import { useState } from 'react';
import { taskService } from '../../services/taskService';
import type { Task } from '../../types';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import {
  CheckCircleIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  FlagIcon,
  PlusSmallIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleFilledIcon } from '@heroicons/react/24/solid';

interface TaskItemProps {
  task: Task;
  dragHandleProps?: Record<string, unknown>;
}

const TaskItem = ({ task, dragHandleProps }: TaskItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const handleToggleComplete = async () => {
    try {
      await taskService.toggleTaskCompletion(task.id, !task.completed);
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const handleSaveEdit = async () => {
    if (editTitle.trim()) {
      try {
        await taskService.updateTask(task.id, { title: editTitle.trim() });
      } catch (error) {
        console.error('Error updating task:', error);
        setEditTitle(task.title);
      }
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

  const handleToggleSubtask = async (subtaskId: string) => {
    try {
      await taskService.toggleSubtask(task.id, subtaskId);
    } catch (error) {
      console.error('Error toggling subtask:', error);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      await taskService.deleteSubtask(task.id, subtaskId);
    } catch (error) {
      console.error('Error deleting subtask:', error);
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;
    try {
      await taskService.addSubtask(task.id, newSubtaskTitle.trim());
      setNewSubtaskTitle('');
      // Keep input open for continuous creation
    } catch (error) {
      console.error('Error adding subtask:', error);
    }
  };

  const handleSubtaskKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSubtask();
    } else if (e.key === 'Escape') {
      setNewSubtaskTitle('');
      setShowSubtaskInput(false);
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
      case 4: return 'border-l-gray-300 dark:border-l-gray-600';
      default: return 'border-l-gray-300 dark:border-l-gray-600';
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
    return 'text-gray-500 dark:text-gray-400';
  };

  // Subtask progress calculation
  const completedSubtasks = task.subtasks.filter(st => st.completed).length;
  const totalSubtasks = task.subtasks.length;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  return (
    <div
      className={`group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-all duration-200 border-l-4 ${getPriorityBorder(
        task.priority
      )} ${task.completed ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start space-x-3">
        {/* Drag Handle */}
        {dragHandleProps && (
          <button
            className="flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            {...dragHandleProps}
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="5" cy="3" r="1.5" />
              <circle cx="11" cy="3" r="1.5" />
              <circle cx="5" cy="8" r="1.5" />
              <circle cx="11" cy="8" r="1.5" />
              <circle cx="5" cy="13" r="1.5" />
              <circle cx="11" cy="13" r="1.5" />
            </svg>
          </button>
        )}

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
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              autoFocus
            />
          ) : (
            <h3
              className={`text-sm font-medium ${
                task.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'
              } cursor-pointer`}
              onClick={() => setIsEditing(true)}
            >
              {task.title}
            </h3>
          )}

          {task.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{task.description}</p>
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
                    className="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
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

            {/* Subtask Progress Pill */}
            {totalSubtasks > 0 && (
              <div className="flex items-center space-x-1.5">
                <svg className="w-4 h-4" viewBox="0 0 20 20">
                  <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-200 dark:text-gray-600" />
                  <circle
                    cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2"
                    className="text-blue-500"
                    strokeDasharray={`${subtaskProgress * 0.5027} 50.27`}
                    strokeLinecap="round"
                    transform="rotate(-90 10 10)"
                  />
                </svg>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {completedSubtasks}/{totalSubtasks}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
            <button
              onClick={async () => {
                try {
                  await taskService.deleteTask(task.id);
                } catch (error) {
                  console.error('Error deleting task:', error);
                }
              }}
              className="p-1 text-gray-400 hover:text-red-500 rounded"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Subtasks */}
      {(task.subtasks.length > 0 || showSubtaskInput) && (
        <div className="ml-9 mt-3 space-y-2">
          {task.subtasks.map((subtask) => (
            <div key={subtask.id} className="group/subtask flex items-center space-x-2">
              <button
                className="flex-shrink-0"
                onClick={() => handleToggleSubtask(subtask.id)}
              >
                {subtask.completed ? (
                  <CheckCircleFilledIcon className="w-4 h-4 text-green-500" />
                ) : (
                  <CheckCircleIcon className="w-4 h-4 text-gray-400 hover:text-green-500" />
                )}
              </button>
              <span
                className={`text-xs flex-1 ${
                  subtask.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {subtask.title}
              </span>
              <button
                onClick={() => handleDeleteSubtask(subtask.id)}
                className="opacity-0 group-hover/subtask:opacity-100 transition-opacity p-0.5 text-gray-400 hover:text-red-500"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {/* Add Subtask Input */}
          {showSubtaskInput && (
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={handleSubtaskKeyDown}
                onBlur={() => {
                  if (!newSubtaskTitle.trim()) {
                    setShowSubtaskInput(false);
                  }
                }}
                className="flex-1 text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                placeholder="Subtask name"
                autoFocus
              />
            </div>
          )}
        </div>
      )}

      {/* Add Subtask Button */}
      {!showSubtaskInput && (
        <button
          onClick={() => setShowSubtaskInput(true)}
          className="ml-9 mt-2 flex items-center space-x-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <PlusSmallIcon className="w-4 h-4" />
          <span>Add subtask</span>
        </button>
      )}
    </div>
  );
};

export default TaskItem;