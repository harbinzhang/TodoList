import { useState, useCallback } from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import { format, addMonths, subMonths, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useAppData } from '../../hooks/useAppData';
import { taskService } from '../../services/taskService';
import { getMonthGrid, getWeekDays } from '../../utils/calendar';
import MonthGrid from './calendar/MonthGrid';
import WeekGrid from './calendar/WeekGrid';
import InlineDateTaskForm from './calendar/InlineDateTaskForm';

type CalendarMode = 'month' | 'week';

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('month');
  const [addingForDate, setAddingForDate] = useState<Date | null>(null);

  const { tasks } = useAppData();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const weeks = calendarMode === 'month' ? getMonthGrid(year, month) : [];
  const weekDays = calendarMode === 'week' ? getWeekDays(currentDate) : [];

  const handlePrev = useCallback(() => {
    setCurrentDate((d) =>
      calendarMode === 'month' ? subMonths(d, 1) : subWeeks(d, 1)
    );
  }, [calendarMode]);

  const handleNext = useCallback(() => {
    setCurrentDate((d) =>
      calendarMode === 'month' ? addMonths(d, 1) : addWeeks(d, 1)
    );
  }, [calendarMode]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleAddTask = useCallback((date: Date) => {
    setAddingForDate(date);
  }, []);

  const handleCloseForm = useCallback(() => {
    setAddingForDate(null);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const dateStr = over.id as string;

    try {
      const newDate = new Date(dateStr + 'T00:00:00');
      if (isNaN(newDate.getTime())) return;
      await taskService.updateTask(taskId, { dueDate: newDate });
    } catch (err) {
      console.error('Failed to update task date:', err);
    }
  }, []);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Navigation header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Previous"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Next"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>

          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {format(currentDate, 'MMMM yyyy')}
          </h2>

          <button
            onClick={handleToday}
            className="px-3 py-1 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Today
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
          <button
            onClick={() => setCalendarMode('month')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              calendarMode === 'month'
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setCalendarMode('week')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              calendarMode === 'week'
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Week
          </button>
        </div>
      </div>

      {/* Calendar body */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex-1 flex flex-col overflow-hidden">
          {calendarMode === 'month' ? (
            <MonthGrid
              weeks={weeks}
              tasks={tasks}
              currentMonth={month}
              onAddTask={handleAddTask}
            />
          ) : (
            <WeekGrid
              days={weekDays}
              tasks={tasks}
              onAddTask={handleAddTask}
            />
          )}
        </div>
      </DndContext>

      {/* Inline task creation modal */}
      {addingForDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 w-80">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Add task — {format(addingForDate, 'MMM d, yyyy')}
              </h3>
              <button
                onClick={handleCloseForm}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none"
              >
                ×
              </button>
            </div>
            <InlineDateTaskForm date={addingForDate} onClose={handleCloseForm} />
          </div>
        </div>
      )}
    </div>
  );
}
