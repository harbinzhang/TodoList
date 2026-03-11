import { useMemo } from 'react';
import { useTaskStore } from '../../store/taskStore';
import { getTodayCount, getDailyCountsForDays } from '../../utils/stats';

const CompletionSpark = () => {
  const { tasks } = useTaskStore();

  const todayCount = useMemo(() => getTodayCount(tasks), [tasks]);
  const dailyCounts = useMemo(() => getDailyCountsForDays(tasks, 7), [tasks]);

  const maxCount = Math.max(...dailyCounts, 1);

  return (
    <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          ✅ {todayCount} today
        </span>
      </div>
      {/* Sparkline */}
      <div className="flex items-end space-x-0.5 h-5">
        {dailyCounts.map((count, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-green-400 dark:bg-green-500 transition-all duration-300"
            style={{
              height: `${Math.max((count / maxCount) * 100, count > 0 ? 15 : 4)}%`,
              opacity: count > 0 ? 1 : 0.2,
            }}
            title={`${count} completed`}
          />
        ))}
      </div>
    </div>
  );
};

export default CompletionSpark;
