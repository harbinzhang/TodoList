import { useState } from 'react';
import { XMarkIcon, FlagIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { taskService } from '../../services/taskService';
import { deleteField } from 'firebase/firestore';
import TaskDetailChildren from './TaskDetailChildren';
import { format } from 'date-fns';
import type { Task } from '../../types';

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
}

const TaskDetailModal = ({ task, onClose }: TaskDetailModalProps) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [priority, setPriority] = useState<1 | 2 | 3 | 4>(task.priority);
  const [dueDate, setDueDate] = useState(
    task.dueDate ? format(task.dueDate, 'yyyy-MM-dd') : ''
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await taskService.updateTask(task.id, {
        title: title.trim(),
        // deleteField() is a Firestore sentinel — cast needed because Task types don't model FieldValue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        description: (description.trim() || deleteField()) as any,
        priority,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dueDate: (dueDate ? new Date(dueDate + 'T00:00:00') : deleteField()) as any,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white" onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Task Detail</h2>
        <button
          title="Close"
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Edit form */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 space-y-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task name"
          className="w-full text-base font-medium border-none bg-transparent outline-none placeholder-gray-400"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          rows={2}
          className="w-full text-sm border-none bg-transparent outline-none placeholder-gray-400 resize-none"
        />
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
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
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="ml-auto px-3 py-1.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Children area */}
      <div className="flex-1 flex flex-col min-h-0">
        <TaskDetailChildren task={task} />
      </div>
    </div>
  );
};

export default TaskDetailModal;
