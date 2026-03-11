import { isSameDay } from 'date-fns';
import type { Task } from '../../../types';
import { getTasksForDate } from '../../../utils/calendar';
import DayCell from './DayCell';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface MonthGridProps {
  weeks: Date[][];
  tasks: Task[];
  currentMonth: number;
  onAddTask: (date: Date) => void;
}

export default function MonthGrid({ weeks, tasks, currentMonth, onAddTask }: MonthGridProps) {
  const today = new Date();

  return (
    <div className="flex flex-col flex-1">
      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="
              text-center text-xs font-semibold py-2
              text-gray-500 dark:text-gray-400
              border-r border-gray-200 dark:border-gray-700
              last:border-r-0
            "
          >
            {day}
          </div>
        ))}
      </div>

      {/* Weeks grid */}
      <div className="flex-1 flex flex-col">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 flex-1">
            {week.map((date, dayIdx) => (
              <DayCell
                key={dayIdx}
                date={date}
                tasks={getTasksForDate(tasks, date)}
                isCurrentMonth={date.getMonth() === currentMonth}
                isToday={isSameDay(date, today)}
                onAddTask={onAddTask}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
