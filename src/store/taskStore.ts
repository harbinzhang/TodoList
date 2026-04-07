import { create } from 'zustand';
import type { Task, TaskFilter, ViewType, TaskViewMode } from '../types';

interface TaskState {
  currentView: ViewType;
  currentProjectId?: string;
  currentLabelId?: string;
  currentFilterId?: string;
  currentMindmapId?: string;
  selectedTaskId: string | null;
  currentViewMode: TaskViewMode;
  boardColumnSource: 'section' | 'priority' | 'status';
  filter: TaskFilter;
  optimisticTaskOverrides: Record<string, Partial<Task>>;
  
  // Actions
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  clearTaskOverride: (taskId: string) => void;
  clearTaskOverrides: () => void;
  setCurrentFilterId: (filterId: string | undefined) => void;
  
  setSelectedTaskId: (taskId: string | null) => void;
  setCurrentViewMode: (mode: TaskViewMode) => void;
  setBoardColumnSource: (source: 'section' | 'priority' | 'status') => void;
  setCurrentView: (view: ViewType, id?: string) => void;
  setFilter: (filter: Partial<TaskFilter>) => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  currentView: 'inbox',
  selectedTaskId: null,
  currentViewMode: 'list',
  boardColumnSource: 'section',
  filter: {},
  optimisticTaskOverrides: {},

  updateTask: (taskId, updates) => set({
    optimisticTaskOverrides: {
      ...get().optimisticTaskOverrides,
      [taskId]: {
        ...get().optimisticTaskOverrides[taskId],
        ...updates,
      },
    },
  }),
  clearTaskOverride: (taskId) => set({
    optimisticTaskOverrides: Object.fromEntries(
      Object.entries(get().optimisticTaskOverrides).filter(([id]) => id !== taskId)
    ),
  }),
  clearTaskOverrides: () => set({ optimisticTaskOverrides: {} }),
  setCurrentFilterId: (currentFilterId) => set({ currentFilterId }),

  setSelectedTaskId: (taskId) => set({ selectedTaskId: taskId }),
  setCurrentViewMode: (currentViewMode) => set({ currentViewMode }),
  setBoardColumnSource: (boardColumnSource) => set({ boardColumnSource }),
  setCurrentView: (view, id) => set({ 
    currentView: view,
    currentProjectId: view === 'project' ? id : undefined,
    currentLabelId: view === 'label' ? id : undefined,
    currentFilterId: view === 'filter' ? id : undefined,
    currentMindmapId: view === 'mindmap' ? id : undefined,
  }),
  setFilter: (filter) => set({ filter: { ...get().filter, ...filter } }),
}));
