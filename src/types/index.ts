export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}

// --- Recurrence (Feature 1) ---
export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;           // e.g., 2 = "every 2 weeks"
  daysOfWeek?: number[];      // 0=Sun, 1=Mon, ..., 6=Sat (for weekly)
  dayOfMonth?: number;        // 1-31 (for monthly)
  endDate?: Date;             // optional end
  endAfterCount?: number;     // optional: stop after N occurrences
  completedCount?: number;    // tracks how many have been completed
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 1 | 2 | 3 | 4;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  projectId?: string;
  sectionId?: string;
  sortOrder?: number;
  labels: string[];
  subtasks: Subtask[];
  recurrence?: RecurrenceRule;  // Feature 1: Recurring Due Dates
  completedAt?: Date;           // Feature 2: Completed Tasks Archive
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  userId: string;
  createdAt: Date;
  taskCount: number;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  userId: string;
}

export type ViewType = 'inbox' | 'today' | 'upcoming' | 'project' | 'label' | 'filter' | 'completed';

export type TaskViewMode = 'list' | 'board' | 'calendar';

export interface TaskFilter {
  projectId?: string;
  labelId?: string;
  priority?: number;
  completed?: boolean;
  dueDate?: {
    start?: Date;
    end?: Date;
  };
  search?: string;
}

// --- Custom Saved Filters (Feature 3) ---
export interface FilterCondition {
  field: 'priority' | 'dueDate' | 'project' | 'label' | 'completed';
  operator: 'is' | 'isNot' | 'before' | 'after' | 'thisWeek' |
            'next7Days' | 'overdue' | 'noDate' | 'hasDate';
  value?: string | number | boolean;
}

export interface SavedFilter {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  conditions: FilterCondition[];
  userId: string;
  createdAt: Date;
  sortOrder: number;
}

export interface Section {
  id: string;
  name: string;
  projectId: string;
  userId: string;
  sortOrder: number;
  createdAt: Date;
}