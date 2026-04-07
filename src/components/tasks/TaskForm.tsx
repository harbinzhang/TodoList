import { useEffect, useState } from 'react';
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

  const getEffectiveParsedInput = (): ParsedInput | null => {
    if (!parsedInput) {
      return null;
    }

    return {
      ...parsedInput,
      priority: overriddenValues.priority ? undefined : parsedInput.priority,
      dueDate: overriddenValues.date ? undefined : parsedInput.dueDate,
      labels: parsedInput.labels.filter((label) => !overriddenValues.labels?.includes(label)),
    };
  };

  useEffect(() => {
    if (title.trim()) {
      setParsedInput(taskInputParser.parseInput(title));
    } else {
      setParsedInput(null);
    }
  }, [title]);

  const submitTask = async () => {
    if (!user) {
      return;
    }

    const effectiveParsedInput = getEffectiveParsedInput();
    const finalTitle = effectiveParsedInput?.cleanTitle.trim() || title.trim();
    if (!finalTitle) {
      return;
    }

    let finalLabels: string[] = [];
    if (effectiveParsedInput?.labels.length) {
      const createdLabels = await Promise.all(
        effectiveParsedInput.labels.map((labelName) => findOrCreateLabel(labelName, user.uid))
      );
      finalLabels = createdLabels.map((label) => label.id);
    }

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: finalTitle,
      description: description.trim() || undefined,
      completed: false,
      priority: effectiveParsedInput?.priority ?? priority,
      dueDate: effectiveParsedInput?.dueDate ?? (dueDate ? new Date(dueDate) : undefined),
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: user.uid,
      projectId: currentView === 'project' ? currentProjectId : undefined,
      labels: finalLabels,
      subtasks: [],
    };

    const sanitizedTask = Object.fromEntries(
      Object.entries(newTask).filter(([, value]) => value !== undefined)
    ) as Task;

    await addTask(sanitizedTask);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitTask();
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

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      await submitTask();
    }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="group w-full flex items-center space-x-3 rounded-lg border border-gray-200 bg-white p-3 transition-all duration-200 hover:shadow-md md:p-4"
      >
        <PlusIcon className="w-5 h-5 text-red-500" />
        <span className="text-sm text-gray-500 group-hover:text-gray-700 md:text-base">
          Add task
        </span>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-3 shadow-md md:p-4">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Task name (try: p1 today @work fix bug)"
        className="mb-2 min-h-[44px] w-full border-none text-sm font-medium outline-none placeholder-gray-400 md:text-base"
        autoFocus
      />

      {getEffectiveParsedInput() && (
        <ParsedInputDisplay
          parsedInput={getEffectiveParsedInput()!}
          onRemovePriority={() => setOverriddenValues((current) => ({ ...current, priority: true }))}
          onRemoveDate={() => setOverriddenValues((current) => ({ ...current, date: true }))}
          onRemoveLabel={(labelName) =>
            setOverriddenValues((current) => ({
              ...current,
              labels: [...(current.labels || []), labelName],
            }))
          }
        />
      )}

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        rows={2}
        className="mb-3 min-h-[44px] w-full resize-none border-none text-sm outline-none placeholder-gray-400 md:text-base"
      />

      <div className="mb-4 flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
        <div className="flex items-center space-x-2">
          <CalendarIcon className="h-5 w-5 text-gray-400" />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="min-h-[44px] rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <FlagIcon className="h-5 w-5 text-gray-400" />
          <select
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value) as 1 | 2 | 3 | 4)}
            className="min-h-[44px] rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={4}>Priority 4</option>
            <option value={3}>Priority 3</option>
            <option value={2}>Priority 2</option>
            <option value={1}>Priority 1</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-end space-x-3">
        <button
          type="button"
          onClick={handleCancel}
          className="min-h-[44px] rounded border border-gray-300 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!title.trim() && !parsedInput?.cleanTitle.trim()}
          className="min-h-[44px] rounded bg-red-500 px-4 py-2.5 text-sm text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add task
        </button>
      </div>
    </form>
  );
};

export default TaskForm;
