import { create } from 'zustand';
import type { Task, Project, Label, TaskFilter, ViewType } from '../types';
import { labelService } from '../services/labelService';
import { taskService } from '../services/taskService';
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
  addTask: (task: Task) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;
  
  setLabels: (labels: Label[]) => void;
  addLabel: (label: Label) => void;
  updateLabel: (labelId: string, updates: Partial<Label>) => void;
  deleteLabel: (labelId: string) => void;
  findLabelByName: (name: string) => Label | undefined;
  findLabelById: (id: string) => Label | undefined;
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
  addTask: async (task) => {
    try {
      const { id: tempId, createdAt, updatedAt, userId, ...taskData } = task;
      // Remove undefined values to prevent Firebase errors
      const sanitizedTaskData = Object.fromEntries(
        Object.entries(taskData).filter(([_, value]) => value !== undefined)
      );

      // Optimistically add task with its temporary id so UI feels instant
      const existing = get().tasks.find(t => t.id === tempId);
      if (!existing) {
        set({ tasks: [...get().tasks, task] });
      }

      // Typescript can't infer after runtime sanitization; assert the shape
      const newTaskId = await taskService.createTask(
        userId,
        sanitizedTaskData as Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
      );

      // Replace the temporary id with Firestore generated id in-place
      set({
        tasks: get().tasks.map(t =>
          t.id === tempId ? { ...t, id: newTaskId } : t
        )
      });
    } catch (error) {
      console.error('Error adding task:', error);
      // On failure, remove the optimistic task with temp id
      set({ tasks: get().tasks.filter(t => t.id !== task.id) });
      throw error;
    }
  },
  updateTask: async (taskId, updates) => {
    try {
      const tasks = get().tasks;
      const task = tasks.find(t => t.id === taskId);
      if (!task) throw new Error('Task not found');
      
      await taskService.updateTask(task.userId, taskId, updates);
      set({
        tasks: tasks.map(task => 
          task.id === taskId ? { ...task, ...updates, updatedAt: new Date() } : task
        )
      });
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  },
  deleteTask: async (taskId) => {
    try {
      const tasks = get().tasks;
      const task = tasks.find(t => t.id === taskId);
      if (!task) throw new Error('Task not found');
      
      await taskService.deleteTask(task.userId, taskId);
      set({
        tasks: tasks.filter(task => task.id !== taskId)
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  },

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

  findLabelById: (id) => {
    return get().labels.find(label => label.id === id);
  },

  findOrCreateLabel: async (name, userId, defaultColor = parserConfig.labels.defaultColor) => {
    const existingLabel = get().findLabelByName(name);
    if (existingLabel) {
      return existingLabel;
    }

    try {
      const labelId = await labelService.createLabel(userId, {
        name,
        color: defaultColor,
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