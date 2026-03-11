import { useState, useEffect, useRef, useCallback } from 'react';
import { useTaskStore } from '../../store/taskStore';
import { taskService } from '../../services/taskService';
import { useSettingsStore } from '../../store/settingsStore';
import { format } from 'date-fns';
import { isDateTodayInTz, isDateTomorrowInTz, isDatePastInTz } from '../../utils/dateUtils';
import {
  XMarkIcon,
  CalendarIcon,
  FlagIcon,
  TrashIcon,
  CheckCircleIcon,
  PlusSmallIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleFilledIcon } from '@heroicons/react/24/solid';
import RecurrencePicker from './RecurrencePicker';
import type { RecurrenceRule, Task } from '../../types';

const TaskDetailPanel = () => {
  const { selectedTaskId, setSelectedTaskId, tasks, projects, labels: allLabels } = useTaskStore();
  const { timezone } = useSettingsStore();

  const task = tasks.find((t) => t.id === selectedTaskId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<1 | 2 | 3 | 4>(4);
  const [projectId, setProjectId] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const [subtasksExpanded, setSubtasksExpanded] = useState(true);
  const [recurrence, setRecurrence] = useState<RecurrenceRule | undefined>(undefined);

  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Sync local state when selected task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setDueDate(task.dueDate ? format(task.dueDate, 'yyyy-MM-dd') : '');
      setPriority(task.priority);
      setProjectId(task.projectId || '');
      setNewSubtaskTitle('');
      setShowSubtaskInput(false);
      setSubtasksExpanded(true);
      setRecurrence(task.recurrence);
    }
  }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedTaskId(null);
      }
    };
    if (selectedTaskId) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedTaskId, setSelectedTaskId]);

  const handleSaveTitle = useCallback(async () => {
    if (!task || title.trim() === task.title) return;
    if (!title.trim()) {
      setTitle(task.title);
      return;
    }
    try {
      await taskService.updateTask(task.id, { title: title.trim() });
    } catch (error) {
      console.error('Error updating title:', error);
      setTitle(task.title);
    }
  }, [task, title]);

  const handleSaveDescription = useCallback(async () => {
    if (!task) return;
    const newDesc = description.trim() || undefined;
    if (newDesc === (task.description || undefined)) return;
    try {
      await taskService.updateTask(task.id, { description: newDesc });
    } catch (error) {
      console.error('Error updating description:', error);
      setDescription(task.description || '');
    }
  }, [task, description]);

  const handleDueDateChange = async (value: string) => {
    if (!task) return;
    setDueDate(value);
    try {
      await taskService.updateTask(task.id, {
        dueDate: value ? new Date(value + 'T00:00:00') : undefined,
      });
    } catch (error) {
      console.error('Error updating due date:', error);
    }
  };

  const handlePriorityChange = async (value: 1 | 2 | 3 | 4) => {
    if (!task) return;
    setPriority(value);
    try {
      await taskService.updateTask(task.id, { priority: value });
    } catch (error) {
      console.error('Error updating priority:', error);
    }
  };

  const handleProjectChange = async (value: string) => {
    if (!task) return;
    setProjectId(value);
    try {
      await taskService.updateTask(task.id, { projectId: value || undefined });
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  const handleToggleLabel = async (labelId: string) => {
    if (!task) return;
    const currentLabels = task.labels || [];
    const newLabels = currentLabels.includes(labelId)
      ? currentLabels.filter((id) => id !== labelId)
      : [...currentLabels, labelId];
    try {
      await taskService.updateTask(task.id, { labels: newLabels });
    } catch (error) {
      console.error('Error updating labels:', error);
    }
  };

  const handleToggleComplete = async () => {
    if (!task) return;
    try {
      await taskService.toggleTaskCompletion(task.id, !task.completed);
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    try {
      await taskService.deleteTask(task.id);
      setSelectedTaskId(null);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleToggleSubtask = async (subtaskId: string) => {
    if (!task) return;
    try {
      await taskService.toggleSubtask(task.id, subtaskId);
    } catch (error) {
      console.error('Error toggling subtask:', error);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!task) return;
    try {
      await taskService.deleteSubtask(task.id, subtaskId);
    } catch (error) {
      console.error('Error deleting subtask:', error);
    }
  };

  const handleAddSubtask = async () => {
    if (!task || !newSubtaskTitle.trim()) return;
    try {
      await taskService.addSubtask(task.id, newSubtaskTitle.trim());
      setNewSubtaskTitle('');
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

  const getPriorityColor = (p: number) => {
    switch (p) {
      case 1: return 'text-red-500';
      case 2: return 'text-orange-500';
      case 3: return 'text-blue-500';
      default: return 'text-gray-400';
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

  if (!selectedTaskId || !task) return null;

  const completedSubtasks = task.subtasks.filter((st) => st.completed).length;
  const totalSubtasks = task.subtasks.length;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={() => setSelectedTaskId(null)}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col animate-slide-in-right"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            {/* Breadcrumb / context */}
            {task.projectId && (() => {
              const project = projects.find((p) => p.id === task.projectId);
              return project ? (
                <span className="flex items-center space-x-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <span>{project.name}</span>
                </span>
              ) : null;
            })()}
          </div>
          <button
            onClick={() => setSelectedTaskId(null)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 space-y-5">
            {/* Completion + Title */}
            <div className="flex items-start space-x-3">
              <button onClick={handleToggleComplete} className="flex-shrink-0 mt-1">
                {task.completed ? (
                  <CheckCircleFilledIcon className="w-6 h-6 text-green-500" />
                ) : (
                  <CheckCircleIcon className="w-6 h-6 text-gray-400 hover:text-green-500 transition-colors" />
                )}
              </button>
              <input
                ref={titleRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                className={`flex-1 text-lg font-semibold bg-transparent border-none outline-none dark:text-white placeholder-gray-400 ${
                  task.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900'
                }`}
                placeholder="Task name"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleSaveDescription}
                placeholder="Add a description..."
                rows={3}
                className="w-full text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white dark:placeholder-gray-400 resize-none transition-colors"
              />
            </div>

            {/* Fields Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Due Date */}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>Due date</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => handleDueDateChange(e.target.value)}
                  className="w-full text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-colors"
                />
                {task.dueDate && (
                  <span className={`text-xs mt-1 block ${getDueDateColor(task.dueDate)}`}>
                    {formatDueDate(task.dueDate)}
                  </span>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                  <FlagIcon className={`w-3.5 h-3.5 ${getPriorityColor(priority)}`} />
                  <span>Priority</span>
                </label>
                <select
                  value={priority}
                  onChange={(e) => handlePriorityChange(Number(e.target.value) as 1 | 2 | 3 | 4)}
                  className="w-full text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-colors"
                >
                  <option value={4}>Priority 4</option>
                  <option value={3}>Priority 3</option>
                  <option value={2}>Priority 2</option>
                  <option value={1}>Priority 1</option>
                </select>
              </div>

              {/* Project */}
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">
                  Project
                </label>
                <select
                  value={projectId}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  className="w-full text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-colors"
                >
                  <option value="">No project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Recurrence */}
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">
                Recurrence
              </label>
              <RecurrencePicker
                value={recurrence}
                onChange={async (rule) => {
                  setRecurrence(rule);
                  if (task) {
                    try {
                      if (rule) {
                        await taskService.updateTask(task.id, { recurrence: rule } as Partial<Omit<Task, 'id' | 'createdAt'>>);
                      } else {
                        // Use deleteField() to remove the recurrence field from Firestore
                        const { doc, updateDoc, deleteField } = await import('firebase/firestore');
                        const { db } = await import('../../firebase/config');
                        await updateDoc(doc(db, 'tasks', task.id), { recurrence: deleteField() });
                      }
                    } catch (error) {
                      console.error('Error updating recurrence:', error);
                    }
                  }
                }}
              />
            </div>

            {/* Labels */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <TagIcon className="w-3.5 h-3.5" />
                <span>Labels</span>
              </label>
              {allLabels.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {allLabels.map((label) => {
                    const isSelected = task.labels.includes(label.id);
                    return (
                      <button
                        key={label.id}
                        onClick={() => handleToggleLabel(label.id)}
                        className={`inline-flex items-center px-2.5 py-1 text-xs rounded-full font-medium transition-all duration-150 border ${
                          isSelected
                            ? 'text-white border-transparent shadow-sm'
                            : 'bg-transparent border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'
                        }`}
                        style={
                          isSelected
                            ? { backgroundColor: label.color || '#6b7280' }
                            : undefined
                        }
                      >
                        {label.name}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500">No labels created yet</p>
              )}
            </div>

            {/* Divider */}
            <hr className="border-gray-200 dark:border-gray-700" />

            {/* Subtasks Section */}
            <div>
              <button
                onClick={() => setSubtasksExpanded(!subtasksExpanded)}
                className="flex items-center space-x-2 w-full text-left mb-3"
              >
                {subtasksExpanded ? (
                  <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Sub-tasks
                </span>
                {/* Progress circle */}
                {totalSubtasks > 0 && (
                  <div className="flex items-center space-x-1.5">
                    <svg className="w-4 h-4" viewBox="0 0 20 20">
                      <circle
                        cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2"
                        className="text-gray-200 dark:text-gray-600"
                      />
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
              </button>

              {subtasksExpanded && (
                <div className="space-y-1.5 ml-6">
                  {/* Add Subtask */}
                  {showSubtaskInput ? (
                    <div className="flex items-center space-x-2.5 py-1.5 px-2">
                      <CheckCircleIcon className="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
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
                        className="flex-1 text-sm px-2 py-1 bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-white dark:placeholder-gray-400"
                        placeholder="Subtask name"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowSubtaskInput(true)}
                      className="flex items-center space-x-2 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors w-full"
                    >
                      <PlusSmallIcon className="w-5 h-5" />
                      <span>Add sub-task</span>
                    </button>
                  )}

                  {[...task.subtasks]
                    .reverse()
                    .sort((a, b) => Number(a.completed) - Number(b.completed))
                    .map((subtask) => (
                    <div
                      key={subtask.id}
                      className="group/subtask flex items-center space-x-2.5 py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <button
                        className="flex-shrink-0"
                        onClick={() => handleToggleSubtask(subtask.id)}
                      >
                        {subtask.completed ? (
                          <CheckCircleFilledIcon className="w-5 h-5 text-green-500" />
                        ) : (
                          <CheckCircleIcon className="w-5 h-5 text-gray-400 hover:text-green-500 transition-colors" />
                        )}
                      </button>
                      <span
                        className={`text-sm flex-1 ${
                          subtask.completed
                            ? 'line-through text-gray-500 dark:text-gray-400'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {subtask.title}
                      </span>
                      <button
                        onClick={() => handleDeleteSubtask(subtask.id)}
                        className="opacity-0 group-hover/subtask:opacity-100 transition-opacity p-1 text-gray-400 hover:text-red-500 rounded"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Created {format(task.createdAt, 'MMM d, yyyy')}
          </span>
          <button
            onClick={handleDelete}
            className="flex items-center space-x-1.5 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            <TrashIcon className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default TaskDetailPanel;
