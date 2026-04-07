import { useMemo } from 'react';
import { useAppData } from '../../hooks/useAppData';
import { getWeeklyCount, getStreak, getWeeklyTrend } from '../../utils/stats';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

const ArchiveStats = () => {
  const { tasks } = useAppData();

  const weeklyCount = useMemo(() => getWeeklyCount(tasks), [tasks]);
  const streak = useMemo(() => getStreak(tasks), [tasks]);
  const trend = useMemo(() => getWeeklyTrend(tasks), [tasks]);

  return (
    <div className="flex items-center space-x-6 px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-2">
        <CheckCircleIcon className="w-5 h-5 text-green-500" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {weeklyCount} this week
        </span>
      </div>
      {streak > 0 && (
        <div className="flex items-center space-x-1">
          <span className="text-sm">🔥</span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {streak}-day streak
          </span>
        </div>
      )}
      {trend !== 0 && (
        <div className="flex items-center space-x-1">
          <span className="text-sm">{trend > 0 ? '📈' : '📉'}</span>
          <span
            className={`text-sm font-medium ${
              trend > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'
            }`}
          >
            {trend > 0 ? '+' : ''}{trend}% vs last week
          </span>
        </div>
      )}
    </div>
  );
};

export default ArchiveStats;
