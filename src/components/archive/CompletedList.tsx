import { useState, useMemo } from 'react';
import { useTaskStore } from '../../store/taskStore';
import { taskService } from '../../services/taskService';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import {
  ArrowPathIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

const CompletedList = () => {
  const { tasks, projects, labels } = useTaskStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState<string | ''>('');

  const completedTasks = useMemo(() => {
    let result = tasks.filter((t) => t.completed && t.completedAt);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
      );
    }

    if (filterProject) {
      result = result.filter((t) => t.projectId === filterProject);
    }

    // Sort by completedAt desc
    return result.sort(
      (a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0)
    );
  }, [tasks, searchQuery, filterProject]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: { label: string; tasks: typeof completedTasks }[] = [];
    const todayTasks = completedTasks.filter(
      (t) => t.completedAt && isToday(t.completedAt)
    );
    const yesterdayTasks = completedTasks.filter(
      (t) => t.completedAt && isYesterday(t.completedAt)
    );
    const thisWeekTasks = completedTasks.filter(
      (t) =>
        t.completedAt &&
        isThisWeek(t.completedAt, { weekStartsOn: 1 }) &&
        !isToday(t.completedAt) &&
        !isYesterday(t.completedAt)
    );
    const earlierTasks = completedTasks.filter(
      (t) =>
        t.completedAt &&
        !isThisWeek(t.completedAt, { weekStartsOn: 1 })
    );

    if (todayTasks.length) groups.push({ label: 'Today', tasks: todayTasks });
    if (yesterdayTasks.length) groups.push({ label: 'Yesterday', tasks: yesterdayTasks });
    if (thisWeekTasks.length) groups.push({ label: 'This Week', tasks: thisWeekTasks });
    if (earlierTasks.length) groups.push({ label: 'Earlier', tasks: earlierTasks });

    return groups;
  }, [completedTasks]);

  const handleRestore = async (taskId: string) => {
    try {
      await taskService.toggleTaskCompletion(taskId, false);
    } catch (error) {
      console.error('Error restoring task:', error);
    }
  };

  return (
    <div className="p-6">
      {/* Search + Filter bar */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search completed tasks..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white dark:placeholder-gray-400"
          />
        </div>
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Grouped tasks */}
      {grouped.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 dark:text-gray-500 text-lg mb-2">🏆</div>
          <p className="text-gray-500 dark:text-gray-400">
            No completed tasks yet. Get started!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.label}>
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                {group.label}
              </h3>
              <div className="space-y-2">
                {group.tasks.map((task) => {
                  const project = projects.find((p) => p.id === task.projectId);
                  const taskLabels = task.labels
                    .map((lid) => labels.find((l) => l.id === lid))
                    .filter(Boolean);

                  return (
                    <div
                      key={task.id}
                      className="group flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-sm transition-shadow"
                    >
                      <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-through truncate">
                          {task.title}
                        </p>
                        <div className="flex items-center space-x-3 mt-1">
                          {task.completedAt && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {format(task.completedAt, 'MMM d, h:mm a')}
                            </span>
                          )}
                          {project && (
                            <span className="flex items-center space-x-1 text-xs text-gray-400 dark:text-gray-500">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: project.color }}
                              />
                              <span>{project.name}</span>
                            </span>
                          )}
                          {taskLabels.length > 0 && (
                            <div className="flex items-center space-x-1">
                              {taskLabels.slice(0, 2).map((label) => (
                                <span
                                  key={label!.id}
                                  className="px-1.5 py-0.5 text-xs rounded text-white"
                                  style={{ backgroundColor: label!.color }}
                                >
                                  {label!.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRestore(task.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 text-xs text-blue-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        title="Restore task"
                      >
                        <ArrowPathIcon className="w-3.5 h-3.5" />
                        <span>Restore</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompletedList;
