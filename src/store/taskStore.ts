import { create } from 'zustand';
import type { Task, Project, Label, Section, SavedFilter, TaskFilter, ViewType, TaskViewMode } from '../types';

interface TaskState {
  tasks: Task[];
  projects: Project[];
  labels: Label[];
  sections: Section[];
  savedFilters: SavedFilter[];
  currentView: ViewType;
  currentProjectId?: string;
  currentLabelId?: string;
  currentFilterId?: string;
  selectedTaskId: string | null;
  currentViewMode: TaskViewMode;
  boardColumnSource: 'section' | 'priority' | 'status';
  filter: TaskFilter;
  loading: boolean;
  
  // Actions
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;
  
  setLabels: (labels: Label[]) => void;
  addLabel: (label: Label) => void;
  updateLabel: (labelId: string, updates: Partial<Label>) => void;
  deleteLabel: (labelId: string) => void;
  
  setSections: (sections: Section[]) => void;
  addSection: (section: Section) => void;
  updateSection: (sectionId: string, updates: Partial<Section>) => void;
  deleteSection: (sectionId: string) => void;
  
  setSavedFilters: (filters: SavedFilter[]) => void;
  setCurrentFilterId: (filterId: string | undefined) => void;
  
  setSelectedTaskId: (taskId: string | null) => void;
  setCurrentViewMode: (mode: TaskViewMode) => void;
  setBoardColumnSource: (source: 'section' | 'priority' | 'status') => void;
  setCurrentView: (view: ViewType, id?: string) => void;
  setFilter: (filter: Partial<TaskFilter>) => void;
  setLoading: (loading: boolean) => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  projects: [],
  labels: [],
  sections: [],
  savedFilters: [],
  currentView: 'inbox',
  selectedTaskId: null,
  currentViewMode: 'list',
  boardColumnSource: 'section',
  filter: {},
  loading: false,

  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set({ tasks: [...get().tasks, task] }),
  updateTask: (taskId, updates) => set({
    tasks: get().tasks.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    )
  }),
  deleteTask: (taskId) => set({
    tasks: get().tasks.filter(task => task.id !== taskId)
  }),

  setProjects: (projects) => set({ projects }),
  addProject: (project) => set({ projects: [...get().projects, project] }),
  updateProject: (projectId, updates) => set({
    projects: get().projects.map(project => 
      project.id === projectId ? { ...project, ...updates } : project
    )
  }),
  deleteProject: (projectId) => set({
    projects: get().projects.filter(project => project.id !== projectId)
  }),

  setLabels: (labels) => set({ labels }),
  addLabel: (label) => set({ labels: [...get().labels, label] }),
  updateLabel: (labelId, updates) => set({
    labels: get().labels.map(label => 
      label.id === labelId ? { ...label, ...updates } : label
    )
  }),
  deleteLabel: (labelId) => set({
    labels: get().labels.filter(label => label.id !== labelId)
  }),

  setSections: (sections) => set({ sections }),
  addSection: (section) => set({ sections: [...get().sections, section] }),
  updateSection: (sectionId, updates) => set({
    sections: get().sections.map(section => 
      section.id === sectionId ? { ...section, ...updates } : section
    )
  }),
  deleteSection: (sectionId) => set({
    sections: get().sections.filter(section => section.id !== sectionId)
  }),

  setSavedFilters: (savedFilters) => set({ savedFilters }),
  setCurrentFilterId: (currentFilterId) => set({ currentFilterId }),

  setSelectedTaskId: (taskId) => set({ selectedTaskId: taskId }),
  setCurrentViewMode: (currentViewMode) => set({ currentViewMode }),
  setBoardColumnSource: (boardColumnSource) => set({ boardColumnSource }),
  setCurrentView: (view, id) => set({ 
    currentView: view,
    currentProjectId: view === 'project' ? id : undefined,
    currentLabelId: view === 'label' ? id : undefined,
    currentFilterId: view === 'filter' ? id : undefined,
  }),
  setFilter: (filter) => set({ filter: { ...get().filter, ...filter } }),
  setLoading: (loading) => set({ loading }),
}));