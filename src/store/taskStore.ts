import { create } from 'zustand';
import type { Task, Project, Label, TaskFilter, ViewType } from '../types';
import { labelService } from '../services/labelService';
import { parserConfig } from '../config/parserConfig';

interface TaskState {
  tasks: Task[];
  projects: Project[];
  labels: Label[];
  currentView: ViewType;
  currentProjectId?: string;
  currentLabelId?: string;
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
  findLabelByName: (name: string) => Label | undefined;
  findOrCreateLabel: (name: string, userId: string, defaultColor?: string) => Promise<Label>;
  
  setCurrentView: (view: ViewType, id?: string) => void;
  setFilter: (filter: Partial<TaskFilter>) => void;
  setLoading: (loading: boolean) => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  projects: [],
  labels: [],
  currentView: 'inbox',
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

  findLabelByName: (name) => {
    return get().labels.find(label => label.name.toLowerCase() === name.toLowerCase());
  },

  findOrCreateLabel: async (name, userId, defaultColor = parserConfig.labels.defaultColor) => {
    const existingLabel = get().findLabelByName(name);
    if (existingLabel) {
      return existingLabel;
    }

    try {
      const labelId = await labelService.createLabel({
        name,
        color: defaultColor,
        userId,
      });

      const newLabel: Label = {
        id: labelId,
        name,
        color: defaultColor,
        userId,
      };

      get().addLabel(newLabel);
      return newLabel;
    } catch (error) {
      console.error('Error creating label:', error);
      throw error;
    }
  },

  setCurrentView: (view, id) => set({ 
    currentView: view,
    currentProjectId: view === 'project' ? id : undefined,
    currentLabelId: view === 'label' ? id : undefined
  }),
  setFilter: (filter) => set({ filter: { ...get().filter, ...filter } }),
  setLoading: (loading) => set({ loading }),
}));