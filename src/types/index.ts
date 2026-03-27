export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}

export interface Item {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 1 | 2 | 3 | 4;
  createdAt: Date;
  updatedAt: Date;
  userId: string;

  // Task-context fields
  dueDate?: Date;
  projectId?: string;
  labels?: string[];

  // Tree/hierarchy fields
  parentId?: string | null;
  sortOrder?: number;
  mindmapId?: string;
}

export type Task = Item;
export type MindmapNode = Item;

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

export type ViewType = 'inbox' | 'today' | 'upcoming' | 'project' | 'label' | 'mindmap';

export interface Mindmap {
  id: string;
  name: string;
  color: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}


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