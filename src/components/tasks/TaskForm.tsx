import { useState, useEffect } from 'react';
import { useTaskStore } from '../../store/taskStore';
import { useAuthStore } from '../../store/authStore';
import { PlusIcon, CalendarIcon, FlagIcon } from '@heroicons/react/24/outline';
import type { Task } from '../../types';
import { taskInputParser, type ParsedInput } from '../../utils/taskInputParser';
import ParsedInputDisplay from './ParsedInputDisplay';

const TaskForm = () => {
  const { user } = useAuthStore();
  const { addTask, currentView, currentProjectId, findOrCreateLabel } = useTaskStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<1 | 2 | 3 | 4>(4);
  const [parsedInput, setParsedInput] = useState<ParsedInput | null>(null);
  const [overriddenValues, setOverriddenValues] = useState<{
    priority?: boolean;
    date?: boolean;
    labels?: string[];
  }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const finalTitle = parsedInput?.cleanTitle.trim() || title.trim();
    if (!finalTitle) return;

    let finalLabels: string[] = [];
    
    if (parsedInput?.labels.length && !overriddenValues.labels?.length) {
      try {
        const labelPromises = parsedInput.labels.map(labelName => 
          findOrCreateLabel(labelName, user.uid)
        );
        const createdLabels = await Promise.all(labelPromises);
        finalLabels = createdLabels.map(label => label.id);
      } catch (error) {
        console.error('Error creating labels:', error);
      }
    }

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: finalTitle,
      description: description.trim() || undefined,
      completed: false,
      priority: (!overriddenValues.priority && parsedInput?.priority) ? parsedInput.priority : priority,
      dueDate: (!overriddenValues.date && parsedInput?.dueDate) ? parsedInput.dueDate : (dueDate ? new Date(dueDate) : undefined),
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: user.uid,
      projectId: currentView === 'project' ? currentProjectId : undefined,
      labels: finalLabels,
      subtasks: [],
    };

    // Remove undefined values to prevent Firebase errors
    const sanitizedTask = Object.fromEntries(
      Object.entries(newTask).filter(([_, value]) => value !== undefined)
    ) as Task;

    try {
      await addTask(sanitizedTask);
      resetForm();
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setPriority(4);
    setParsedInput(null);
    setOverriddenValues({});
    setIsExpanded(false);
  };

  const handleCancel = () => {
    resetForm();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  // Parse input whenever title changes
  useEffect(() => {
    if (title.trim()) {
      const parsed = taskInputParser.parseInput(title);
      setParsedInput(parsed);
    } else {
      setParsedInput(null);
    }
  }, [title]);

  // Handle removing parsed priority
  const handleRemovePriority = () => {
    setOverriddenValues(prev => ({ ...prev, priority: true }));
  };

  // Handle removing parsed date
  const handleRemoveDate = () => {
    setOverriddenValues(prev => ({ ...prev, date: true }));
  };

  // Handle removing parsed label
  const handleRemoveLabel = (labelName: string) => {
    setOverriddenValues(prev => ({
      ...prev,
      labels: [...(prev.labels || []), labelName]
    }));
  };

  // Get effective parsed input for display (excluding overridden values)
  const getEffectiveParsedInput = (): ParsedInput | null => {
    if (!parsedInput) return null;

    const effectiveLabels = parsedInput.labels.filter(
      label => !overriddenValues.labels?.includes(label)
    );

    return {
      ...parsedInput,
      priority: overriddenValues.priority ? undefined : parsedInput.priority,
      dueDate: overriddenValues.date ? undefined : parsedInput.dueDate,
      labels: effectiveLabels,
    };
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
        onKeyDown={handleKeyDown}
        placeholder="Task name (try: p1 today @work fix bug)"
        className="w-full text-sm font-medium border-none outline-none placeholder-gray-400 mb-2"
        autoFocus
      />

      {/* Parsed Input Display */}
      {getEffectiveParsedInput() && (
        <ParsedInputDisplay
          parsedInput={getEffectiveParsedInput()!}
          onRemovePriority={handleRemovePriority}
          onRemoveDate={handleRemoveDate}
          onRemoveLabel={handleRemoveLabel}
        />
      )}

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
          disabled={!title.trim() && !parsedInput?.cleanTitle.trim()}
          className="px-3 py-1.5 text-sm text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded"
        >
          Add task
        </button>
      </div>
    </form>
  );
};

export default TaskForm;