import { useEffect, useMemo } from 'react';
import { useTaskStore } from '../../store/taskStore';
import { taskService } from '../../services/taskService';
import { useAuthSession } from '../../providers/useAuthSession';
import { useRealtimeCollection } from './useRealtimeCollection';
import type { Task } from '../../types';

function normalizeValue(value: unknown): unknown {
  if (value instanceof Date) return value.getTime();
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
        key,
        normalizeValue(nested),
      ])
    );
  }

  return value;
}

function taskMatchesOverride(task: Task, override: Partial<Task>) {
  return Object.entries(override).every(([key, value]) => {
    const taskValue = task[key as keyof Task];
    return JSON.stringify(normalizeValue(taskValue)) === JSON.stringify(normalizeValue(value));
  });
}

export function useTasks() {
  const { user } = useAuthSession();
  const optimisticTaskOverrides = useTaskStore((state) => state.optimisticTaskOverrides);
  const clearTaskOverride = useTaskStore((state) => state.clearTaskOverride);

  const queryKey = useMemo(() => ['tasks', user?.uid ?? 'anonymous'], [user?.uid]);

  const query = useRealtimeCollection<Task>({
    enabled: Boolean(user?.uid),
    queryKey,
    getInitial: () => taskService.getUserTasks(user!.uid),
    subscribe: (callback) => taskService.subscribeToUserTasks(user!.uid, callback),
  });

  useEffect(() => {
    if (!query.data) return;

    for (const [taskId, override] of Object.entries(optimisticTaskOverrides)) {
      const task = query.data.find((item) => item.id === taskId);

      if (!task || taskMatchesOverride(task, override)) {
        clearTaskOverride(taskId);
      }
    }
  }, [clearTaskOverride, optimisticTaskOverrides, query.data]);

  const tasks = useMemo(
    () =>
      (query.data ?? []).map((task) =>
        optimisticTaskOverrides[task.id]
          ? { ...task, ...optimisticTaskOverrides[task.id] }
          : task
      ),
    [optimisticTaskOverrides, query.data]
  );

  return {
    ...query,
    data: tasks,
    tasks,
  };
}
