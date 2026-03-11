import { useCallback, useRef, useState } from 'react';
import { taskService } from '../services/taskService';
import { useTaskStore } from '../store/taskStore';
import { getNextDueDate } from '../utils/recurrence';
import type { Task } from '../types';

interface PendingCompletion {
  taskId: string;
  task: Task;
  previousDueDate?: Date; // For recurring tasks — to revert the date shift
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
    (task: Task) => {
      const isRecurring = !!task.recurrence && !!task.dueDate;

      if (isRecurring) {
        // Recurring: optimistically shift the due date forward locally
        const nextDue = getNextDueDate(task.dueDate!, task.recurrence!);
        updateTask(task.id, {
          dueDate: nextDue || task.dueDate,
          subtasks: task.subtasks.map(st => ({ ...st, completed: false })),
        });
      } else {
        // Non-recurring: optimistically mark as completed
        updateTask(task.id, { completed: true, completedAt: new Date() });
      }

      // Add to visible pending list
      setPendingItems((prev) => [...prev, { taskId: task.id, taskTitle: task.title }]);

      // Start 5-second timer
      const timer = setTimeout(async () => {
        try {
          if (isRecurring) {
            await taskService.completeRecurringTask(task);
          } else {
            await taskService.toggleTaskCompletion(task.id, true);
          }
        } catch (error) {
          console.error('Error completing task:', error);
          // Revert on error
          if (isRecurring) {
            updateTask(task.id, { dueDate: task.dueDate, subtasks: task.subtasks });
          } else {
            updateTask(task.id, { completed: false, completedAt: undefined });
          }
        }
        // Remove from pending
        pendingRef.current = pendingRef.current.filter((p) => p.taskId !== task.id);
        setPendingItems((prev) => prev.filter((p) => p.taskId !== task.id));
      }, 5000);

      pendingRef.current.push({
        taskId: task.id,
        task,
        previousDueDate: isRecurring ? task.dueDate : undefined,
        timer,
      });
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

        // Revert the optimistic update
        if (pending.previousDueDate) {
          // Recurring: restore the previous due date + original subtasks
          updateTask(taskId, {
            dueDate: pending.previousDueDate,
            subtasks: pending.task.subtasks,
          });
        } else {
          // Non-recurring: un-complete
          updateTask(taskId, { completed: false, completedAt: undefined });
        }
      }

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
