import type { BoardColumnSource } from '../../../utils/board';

interface ColumnSourcePickerProps {
  source: BoardColumnSource;
  onChange: (source: BoardColumnSource) => void;
}

const options: { value: BoardColumnSource; label: string }[] = [
  { value: 'section', label: 'Sections' },
  { value: 'priority', label: 'Priority' },
  { value: 'status', label: 'Status' },
];

const ColumnSourcePicker = ({ source, onChange }: ColumnSourcePickerProps) => {
  return (
    <div className="inline-flex items-center rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
      {options.map((option) => {
        const isActive = source === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`
              rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150
              ${
                isActive
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }
            `}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export default ColumnSourcePicker;
