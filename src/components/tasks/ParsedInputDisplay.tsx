import { CalendarIcon, FlagIcon, TagIcon, XMarkIcon } from '@heroicons/react/24/outline';
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
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  const getPriorityColor = (value: number) => {
    switch (value) {
      case 1:
        return 'bg-red-100 text-red-800 border-red-200';
      case 2:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 3:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="mt-2 mb-3 flex flex-wrap gap-2">
      {priority && (
        <div className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${getPriorityColor(priority)}`}>
          <FlagIcon className="mr-1 h-3 w-3" />
          <span>Priority {priority}</span>
          <button
            type="button"
            onClick={onRemovePriority}
            className="ml-1 rounded-full p-0.5 hover:bg-black/10"
          >
            <XMarkIcon className="h-3 w-3" />
          </button>
        </div>
      )}

      {dueDate && (
        <div className="inline-flex items-center rounded-md border border-blue-200 bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
          <CalendarIcon className="mr-1 h-3 w-3" />
          <span>{formatDate(dueDate)}</span>
          <button
            type="button"
            onClick={onRemoveDate}
            className="ml-1 rounded-full p-0.5 hover:bg-black/10"
          >
            <XMarkIcon className="h-3 w-3" />
          </button>
        </div>
      )}

      {labels.map((label) => (
        <div
          key={label}
          className="inline-flex items-center rounded-md border border-purple-200 bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800"
        >
          <TagIcon className="mr-1 h-3 w-3" />
          <span>{label}</span>
          <button
            type="button"
            onClick={() => onRemoveLabel(label)}
            className="ml-1 rounded-full p-0.5 hover:bg-black/10"
          >
            <XMarkIcon className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ParsedInputDisplay;
