import { useContext, useState } from 'react';
import { useTaskStore } from '../../store/taskStore';
import { useAppData } from '../../hooks/useAppData';
import { taskService } from '../../services/taskService';
import type { Task } from '../../types';
import { format } from 'date-fns';
import { useSettingsStore } from '../../store/settingsStore';
import { isDateTodayInTz, isDateTomorrowInTz, isDatePastInTz } from '../../utils/dateUtils';
import { formatRecurrenceLabel } from '../../utils/recurrence';
import {
  CheckCircleIcon,
  CalendarIcon,
  FlagIcon,
  ArrowsPointingOutIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleFilledIcon } from '@heroicons/react/24/solid';
import { UndoQueueContext } from '../../context/UndoQueueContext';
import TaskDetailModal from './TaskDetailModal';

interface TaskItemProps {
  task: Task;
  dragHandleProps?: Record<string, unknown>;
}

const TaskItem = ({ task, dragHandleProps }: TaskItemProps) => {
  const { timezone } = useSettingsStore();
  const { setSelectedTaskId } = useTaskStore();
  const { labels: allLabels, projects: allProjects } = useAppData();
  const { enqueue } = useContext(UndoQueueContext);
  const [showDetail, setShowDetail] = useState(false);

  const handleToggleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Don't open detail panel
    try {
      if (!task.completed) {
        // Both recurring and non-recurring: use undo queue for 5s delay
        enqueue(task);
      } else {
        // Uncompleting a task
        await taskService.toggleTaskCompletion(task.id, false);
      }
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const handleOpenDetail = () => {
    setSelectedTaskId(task.id);
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
    if (isDateTodayInTz(date, timezone)) return 'Today';
    if (isDateTomorrowInTz(date, timezone)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  const getDueDateColor = (date: Date) => {
    if (isDatePastInTz(date, timezone) && !isDateTodayInTz(date, timezone)) return 'text-red-500';
    if (isDateTodayInTz(date, timezone)) return 'text-orange-500';
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
      )} ${task.completed ? 'opacity-60' : ''} cursor-pointer`}
      onClick={handleOpenDetail}
    >
      <div className="flex items-start space-x-3">
        {/* Drag Handle */}
        {dragHandleProps && (
          <button
            className="flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            onClick={(e) => e.stopPropagation()}
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
          <h3
            className={`text-sm font-medium ${
              task.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'
            }`}
          >
            {task.title}
          </h3>

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

            {/* Recurrence Badge */}
            {task.recurrence && (
              <div className="flex items-center space-x-1">
                <span className="text-xs text-purple-500 dark:text-purple-400">🔁</span>
                <span className="text-xs text-purple-500 dark:text-purple-400">
                  {formatRecurrenceLabel(task.recurrence)}
                </span>
              </div>
            )}

            {/* Project */}
            {task.projectId && (() => {
              const project = allProjects.find(p => p.id === task.projectId);
              return project ? (
                <div className="flex items-center space-x-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {project.name}
                  </span>
                </div>
              ) : null;
            })()}

            {/* Labels */}
            {task.labels.length > 0 && (
              <div className="flex items-center space-x-1">
                {task.labels.slice(0, 2).map((labelId, index) => {
                  const labelObj = allLabels.find(l => l.id === labelId);
                  return (
                    <span
                      key={index}
                      className="inline-block px-2 py-1 text-xs rounded text-white"
                      style={{ backgroundColor: labelObj?.color || '#6b7280' }}
                    >
                      {labelObj?.name || labelId}
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

        {/* Expand to dual-view modal */}
        <button
          title="Open detail"
          onClick={(e) => { e.stopPropagation(); setShowDetail(true); }}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity p-1 text-gray-400 hover:text-blue-500 rounded"
        >
          <ArrowsPointingOutIcon className="w-4 h-4" />
        </button>
      </div>

      {showDetail && (
        <TaskDetailModal task={task} onClose={() => setShowDetail(false)} />
      )}
    </div>
  );
};

export default TaskItem;
