import type { UpcomingScope } from '../../../utils/upcoming';

interface ScopeToggleProps {
  scope: UpcomingScope;
  onChange: (scope: UpcomingScope) => void;
}

const options: { value: UpcomingScope; label: string }[] = [
  { value: 7, label: '7 days' },
  { value: 14, label: '2 weeks' },
  { value: 30, label: '1 month' },
];

const ScopeToggle = ({ scope, onChange }: ScopeToggleProps) => {
  return (
    <div className="inline-flex items-center rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
      {options.map((option) => {
        const isActive = scope === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`
              rounded-md px-3 py-1.5 text-sm font-medium transition-colors
              ${
                isActive
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
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

export default ScopeToggle;
