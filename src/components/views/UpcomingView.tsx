import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useTaskStore } from '../../store/taskStore';
import { useAuthStore } from '../../store/authStore';
import { useAppData } from '../../hooks/useAppData';
import { taskService } from '../../services/taskService';
import {
  type UpcomingScope,
  getOverdueTasks,
  getUndatedTasks,
  groupTasksByDay,
} from '../../utils/upcoming';
import ScopeToggle from './upcoming/ScopeToggle';
import OverdueSection from './upcoming/OverdueSection';
import NoDateSection from './upcoming/NoDateSection';
import DayGroupComponent from './upcoming/DayGroup';
import { format } from 'date-fns';

const SCOPE_STORAGE_KEY = 'upcoming:scope';

function loadScope(): UpcomingScope {
  try {
    const stored = localStorage.getItem(SCOPE_STORAGE_KEY);
    if (stored === '7' || stored === '14' || stored === '30') {
      return Number(stored) as UpcomingScope;
    }
  } catch {
    // ignore
  }
  return 7;
}

const UpcomingView = () => {
  const { tasks } = useAppData();
  const { currentProjectId } = useTaskStore();
  const { user } = useAuthStore();

  // Scope state — persisted to localStorage
  const [scope, setScope] = useState<UpcomingScope>(loadScope);

  const handleScopeChange = useCallback((newScope: UpcomingScope) => {
    setScope(newScope);
    try {
      localStorage.setItem(SCOPE_STORAGE_KEY, String(newScope));
    } catch {
      // ignore
    }
  }, []);

  // Inline add state
  const [addingForDate, setAddingForDate] = useState<Date | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingForDate && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [addingForDate]);

  // Derived data — memoised with scope so switching 7/14/30 days recalculates
  const overdueTasks = useMemo(() => getOverdueTasks(tasks), [tasks]);
  const undatedTasks = useMemo(() => getUndatedTasks(tasks), [tasks]);
  const dayGroups = useMemo(() => groupTasksByDay(tasks, scope), [tasks, scope]);

  // DnD sensors
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  });
  const keyboardSensor = useSensor(KeyboardSensor);
  const sensors = useSensors(pointerSensor, keyboardSensor);

  // Drag end handler — reschedule task
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const targetId = String(over.id);

    if (targetId === 'overdue') return; // no-op

    try {
      if (targetId === 'no-date') {
        await taskService.updateTask(taskId, { dueDate: undefined });
      } else {
        const newDueDate = new Date(targetId + 'T00:00:00');
        if (isNaN(newDueDate.getTime())) return;
        await taskService.updateTask(taskId, { dueDate: newDueDate });
      }
    } catch (error) {
      console.error('Failed to reschedule task:', error);
    }
  }, []);

  // Add task handler
  const handleAddTask = useCallback((date: Date) => {
    setAddingForDate(date);
    setNewTaskTitle('');
  }, []);

  const handleSubmitNewTask = useCallback(
    async (date: Date) => {
      const title = newTaskTitle.trim();
      if (!title) {
        setAddingForDate(null);
        return;
      }

      try {
        await taskService.createTask({
          title,
          dueDate: date,
          priority: 4,
          labels: [],
          subtasks: [],
          completed: false,
          userId: user?.uid || '',
          projectId: currentProjectId,
        });
      } catch (error) {
        console.error('Failed to create task:', error);
      }

      setAddingForDate(null);
      setNewTaskTitle('');
    },
    [newTaskTitle, user, currentProjectId]
  );

  const handleAddKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, date: Date) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmitNewTask(date);
      } else if (e.key === 'Escape') {
        setAddingForDate(null);
        setNewTaskTitle('');
      }
    },
    [handleSubmitNewTask]
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Sub-header with scope toggle */}
      <div className="mb-6 flex items-center justify-end">
        <ScopeToggle scope={scope} onChange={handleScopeChange} />
      </div>

      {/* DnD Context wrapping all sections */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        {/* Overdue section */}
        {overdueTasks.length > 0 && (
          <OverdueSection tasks={overdueTasks} />
        )}

        {/* Day groups */}
        {dayGroups.map((dayGroup) => (
          <div key={dayGroup.dateKey}>
            <DayGroupComponent
              dayGroup={dayGroup}
              onAddTask={handleAddTask}
            />

            {/* Inline add input */}
            {addingForDate &&
              format(addingForDate, 'yyyy-MM-dd') === dayGroup.dateKey && (
                <div className="mb-3 -mt-2 ml-3 mr-3">
                  <input
                    ref={addInputRef}
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => handleAddKeyDown(e, addingForDate)}
                    onBlur={() => handleSubmitNewTask(addingForDate)}
                    placeholder="Task name — press Enter to add"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
                  />
                </div>
              )}
          </div>
        ))}

        {/* No date section */}
        {undatedTasks.length > 0 && (
          <NoDateSection tasks={undatedTasks} />
        )}
      </DndContext>

      {/* Empty state */}
      {overdueTasks.length === 0 &&
        undatedTasks.length === 0 &&
        dayGroups.every((g) => g.tasks.length === 0) && (
          <div className="mt-12 text-center">
            <p className="text-lg text-gray-400 dark:text-gray-500">
              🎉 No upcoming tasks
            </p>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
              Tasks with due dates will appear here
            </p>
          </div>
        )}
    </div>
  );
};

export default UpcomingView;
