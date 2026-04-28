import { useRef, useEffect, useState } from 'react';
import { taskService } from '../../../services/taskService';
import { useAuthSession } from '../../../providers/useAuthSession';
import { useTaskStore } from '../../../store/taskStore';

interface InlineDateTaskFormProps {
  date: Date;
  onClose: () => void;
}

export default function InlineDateTaskForm({ date, onClose }: InlineDateTaskFormProps) {
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthSession();
  const { currentProjectId } = useTaskStore();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || !user || submitting) return;

    setSubmitting(true);
    try {
      await taskService.createTask({
        title: trimmed,
        dueDate: date,
        userId: user.uid,
        completed: false,
        priority: 4,
        labels: [],
        subtasks: [],
        ...(currentProjectId ? { projectId: currentProjectId } : {}),
      });
      onClose();
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-1">
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (!title.trim()) onClose();
        }}
        placeholder="Task name"
        disabled={submitting}
        className="
          w-full px-1.5 py-0.5 text-xs rounded
          border border-blue-400 dark:border-blue-500
          bg-white dark:bg-gray-700
          text-gray-800 dark:text-gray-100
          placeholder-gray-400 dark:placeholder-gray-500
          focus:outline-none focus:ring-1 focus:ring-blue-500
          disabled:opacity-50
        "
      />
    </form>
  );
}
