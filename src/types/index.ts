export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
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
  labels: string[];
  subtasks: Subtask[];
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

export type ViewType = 'inbox' | 'today' | 'upcoming' | 'project' | 'label';

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