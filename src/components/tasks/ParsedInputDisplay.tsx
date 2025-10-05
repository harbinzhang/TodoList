import { XMarkIcon, CalendarIcon, FlagIcon, TagIcon } from '@heroicons/react/24/outline';
import type { ParsedInput } from '../../utils/taskInputParser';

interface ParsedInputDisplayProps {
  parsedInput: ParsedInput;
  onRemovePriority: () => void;
  onRemoveDate: () => void;
  onRemoveLabel: (label: string) => void;
}

const ParsedInputDisplay = ({
  parsedInput,
  onRemovePriority,
  onRemoveDate,
  onRemoveLabel,
}: ParsedInputDisplayProps) => {
  const { priority, dueDate, labels } = parsedInput;

  if (!priority && !dueDate && labels.length === 0) {
    return null;
  }

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
    });
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-red-100 text-red-800 border-red-200';
      case 2: return 'bg-orange-100 text-orange-800 border-orange-200';
      case 3: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 4: return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mt-2 mb-3">
      {priority && (
        <div className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getPriorityColor(priority)}`}>
          <FlagIcon className="w-3 h-3 mr-1" />
          <span>Priority {priority}</span>
          <button
            type="button"
            onClick={onRemovePriority}
            className="ml-1 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5"
          >
            <XMarkIcon className="w-3 h-3" />
          </button>
        </div>
      )}

      {dueDate && (
        <div className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
          <CalendarIcon className="w-3 h-3 mr-1" />
          <span>{formatDate(dueDate)}</span>
          <button
            type="button"
            onClick={onRemoveDate}
            className="ml-1 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5"
          >
            <XMarkIcon className="w-3 h-3" />
          </button>
        </div>
      )}

      {labels.map((label) => (
        <div
          key={label}
          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200"
        >
          <TagIcon className="w-3 h-3 mr-1" />
          <span>@{label}</span>
          <button
            type="button"
            onClick={() => onRemoveLabel(label)}
            className="ml-1 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5"
          >
            <XMarkIcon className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ParsedInputDisplay;