import { useCallback, useRef, useState } from 'react';
import { taskService } from '../services/taskService';
import { useTaskStore } from '../store/taskStore';

interface PendingCompletion {
  taskId: string;
  timer: ReturnType<typeof setTimeout>;
}

export interface UndoQueueItem {
  taskId: string;
  taskTitle: string;
}

export function useUndoQueue() {
  const [pendingItems, setPendingItems] = useState<UndoQueueItem[]>([]);
  const pendingRef = useRef<PendingCompletion[]>([]);
  const { updateTask } = useTaskStore();

  const enqueue = useCallback(
    (taskId: string, taskTitle: string) => {
      // Optimistically mark as completed locally
      updateTask(taskId, { completed: true, completedAt: new Date() });

      // Add to visible pending list
      setPendingItems((prev) => [...prev, { taskId, taskTitle }]);

      // Start 5-second timer
      const timer = setTimeout(async () => {
        try {
          await taskService.toggleTaskCompletion(taskId, true);
        } catch (error) {
          console.error('Error completing task:', error);
          // Revert on error
          updateTask(taskId, { completed: false, completedAt: undefined });
        }
        // Remove from pending
        pendingRef.current = pendingRef.current.filter((p) => p.taskId !== taskId);
        setPendingItems((prev) => prev.filter((p) => p.taskId !== taskId));
      }, 5000);

      pendingRef.current.push({ taskId, timer });
    },
    [updateTask]
  );

  const undo = useCallback(
    (taskId: string) => {
      // Find and cancel the timer
      const pending = pendingRef.current.find((p) => p.taskId === taskId);
      if (pending) {
        clearTimeout(pending.timer);
        pendingRef.current = pendingRef.current.filter((p) => p.taskId !== taskId);
      }

      // Revert the optimistic update
      updateTask(taskId, { completed: false, completedAt: undefined });

      // Remove from visible list
      setPendingItems((prev) => prev.filter((p) => p.taskId !== taskId));
    },
    [updateTask]
  );

  const dismiss = useCallback((taskId: string) => {
    setPendingItems((prev) => prev.filter((p) => p.taskId !== taskId));
  }, []);

  return { pendingItems, enqueue, undo, dismiss };
}
