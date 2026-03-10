import { useState } from 'react';
import { useTaskStore } from '../../store/taskStore';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { taskService } from '../../services/taskService';
import { PlusIcon, CalendarIcon, FlagIcon } from '@heroicons/react/24/outline';
import { getTodayStringInTz } from '../../utils/dateUtils';

interface TaskFormProps {
  sectionId?: string;
}

const TaskForm = ({ sectionId }: TaskFormProps) => {
  const { user } = useAuthStore();
  const { currentView, currentProjectId, currentLabelId } = useTaskStore();
  const { timezone } = useSettingsStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<1 | 2 | 3 | 4>(4);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user) return;

    setLoading(true);
    try {
      await taskService.createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        completed: false,
        priority,
        dueDate: dueDate ? new Date(dueDate + 'T00:00:00') : undefined,
        userId: user.uid,
        projectId: currentView === 'project' ? currentProjectId : undefined,
        sectionId,
        labels: currentView === 'label' && currentLabelId ? [currentLabelId] : [],
        subtasks: [],
      });
      resetForm();
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setLoading(false);
    }
  };


  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setPriority(4);
    setIsExpanded(false);
  };

  const handleCancel = () => {
    resetForm();
  };


  if (!isExpanded) {
    return (
      <button
        onClick={() => {
          if (currentView === 'today') {
            setDueDate(getTodayStringInTz(timezone));
          }
          setIsExpanded(true);
        }}
        className="w-full flex items-center space-x-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-all duration-200 group"
      >
        <PlusIcon className="w-5 h-5 text-red-500" />
        <span className="text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200">
          Add task
        </span>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-md">
      {/* Title Input */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task name"
        className="w-full text-sm font-medium border-none outline-none placeholder-gray-400 dark:placeholder-gray-500 mb-2 bg-transparent dark:text-white"
        autoFocus
      />

      {/* Description Input */}
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        rows={2}
        className="w-full text-sm border-none outline-none placeholder-gray-400 dark:placeholder-gray-500 resize-none mb-3 bg-transparent dark:text-white"
      />

      {/* Task Options */}
      <div className="flex items-center space-x-4 mb-4">
        {/* Due Date */}
        <div className="flex items-center space-x-2">
          <CalendarIcon className="w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Priority */}
        <div className="flex items-center space-x-2">
          <FlagIcon className="w-4 h-4 text-gray-400" />
          <select
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value) as 1 | 2 | 3 | 4)}
            className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value={4}>Priority 4</option>
            <option value={3}>Priority 3</option>
            <option value={2}>Priority 2</option>
            <option value={1}>Priority 1</option>
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end space-x-2">
        <button
          type="button"
          onClick={handleCancel}
          className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!title.trim() || loading}
          className="px-3 py-1.5 text-sm text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded"
        >
          {loading ? 'Adding...' : 'Add task'}
        </button>
      </div>
    </form>
  );
};

export default TaskForm;