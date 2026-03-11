import {
  Bars3BottomLeftIcon,
  ViewColumnsIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import type { TaskViewMode } from '../../types';

interface ViewSwitcherProps {
  availableViews: TaskViewMode[];
  currentViewMode: TaskViewMode;
  onViewChange: (mode: TaskViewMode) => void;
}

const VIEW_CONFIG: Record<TaskViewMode, { icon: typeof Bars3BottomLeftIcon; label: string }> = {
  list: { icon: Bars3BottomLeftIcon, label: 'List' },
  board: { icon: ViewColumnsIcon, label: 'Board' },
  calendar: { icon: CalendarDaysIcon, label: 'Calendar' },
};

const ViewSwitcher = ({ availableViews, currentViewMode, onViewChange }: ViewSwitcherProps) => {
  if (availableViews.length <= 1) return null;

  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
      {availableViews.map((mode) => {
        const { icon: Icon, label } = VIEW_CONFIG[mode];
        const isActive = currentViewMode === mode;

        return (
          <button
            key={mode}
            onClick={() => onViewChange(mode)}
            title={label}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
              isActive
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ViewSwitcher;
