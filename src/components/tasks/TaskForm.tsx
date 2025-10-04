import { useState } from 'react';
import { useTaskStore } from '../../store/taskStore';
import { useAuthStore } from '../../store/authStore';
import { PlusIcon, CalendarIcon, FlagIcon } from '@heroicons/react/24/outline';
import type { Task } from '../../types';

const TaskForm = () => {
  const { user } = useAuthStore();
  const { addTask, currentView, currentProjectId } = useTaskStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<1 | 2 | 3 | 4>(4);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user) return;

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description.trim() || undefined,
      completed: false,
      priority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: user.uid,
      projectId: currentView === 'project' ? currentProjectId : undefined,
      labels: [],
      subtasks: [],
    };

    addTask(newTask);
    resetForm();
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
        onClick={() => setIsExpanded(true)}
        className="w-full flex items-center space-x-3 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 group"
      >
        <PlusIcon className="w-5 h-5 text-red-500" />
        <span className="text-gray-500 group-hover:text-gray-700">
          Add task
        </span>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-4 shadow-md">
      {/* Title Input */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task name"
        className="w-full text-sm font-medium border-none outline-none placeholder-gray-400 mb-2"
        autoFocus
      />

      {/* Description Input */}
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        rows={2}
        className="w-full text-sm border-none outline-none placeholder-gray-400 resize-none mb-3"
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
            className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Priority */}
        <div className="flex items-center space-x-2">
          <FlagIcon className="w-4 h-4 text-gray-400" />
          <select
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value) as 1 | 2 | 3 | 4)}
            className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 rounded border border-gray-300 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!title.trim()}
          className="px-3 py-1.5 text-sm text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded"
        >
          Add task
        </button>
      </div>
    </form>
  );
};

export default TaskForm;