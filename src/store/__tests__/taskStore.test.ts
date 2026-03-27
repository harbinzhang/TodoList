import { describe, it, expect, beforeEach } from 'vitest';
import { useTaskStore } from '../taskStore';
import type { Item, Project, Label } from '../../types';

const createMockTask = (overrides: Partial<Item> = {}): Item => ({
  id: '1',
  title: 'Test Task',
  completed: false,
  priority: 4,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 'user1',
  labels: [],

  ...overrides,
});

const createMockProject = (overrides: Partial<Project> = {}): Project => ({
  id: '1',
  name: 'Test Project',
  color: '#3b82f6',
  userId: 'user1',
  createdAt: new Date(),
  taskCount: 0,
  ...overrides,
});

const createMockLabel = (overrides: Partial<Label> = {}): Label => ({
  id: '1',
  name: 'test-label',
  color: '#ef4444',
  userId: 'user1',
  ...overrides,
});

describe('useTaskStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useTaskStore.setState({
      tasks: [],
      projects: [],
      labels: [],
      currentView: 'inbox',
      currentProjectId: undefined,
      currentLabelId: undefined,
      filter: {},
      loading: false,
    });
  });

  describe('Task actions', () => {
    it('setTasks replaces all tasks', () => {
      const tasks = [createMockTask({ id: '1' }), createMockTask({ id: '2' })];
      useTaskStore.getState().setTasks(tasks);
      expect(useTaskStore.getState().tasks).toEqual(tasks);
    });

    it('addTask appends a task', () => {
      const task1 = createMockTask({ id: '1' });
      const task2 = createMockTask({ id: '2', title: 'Second' });
      useTaskStore.getState().setTasks([task1]);
      useTaskStore.getState().addTask(task2);
      expect(useTaskStore.getState().tasks).toHaveLength(2);
      expect(useTaskStore.getState().tasks[1].title).toBe('Second');
    });

    it('updateTask updates the correct task', () => {
      const tasks = [
        createMockTask({ id: '1', title: 'Original' }),
        createMockTask({ id: '2', title: 'Other' }),
      ];
      useTaskStore.getState().setTasks(tasks);
      useTaskStore.getState().updateTask('1', { title: 'Updated' });

      const state = useTaskStore.getState();
      expect(state.tasks[0].title).toBe('Updated');
      expect(state.tasks[1].title).toBe('Other');
    });

    it('updateTask does not affect other tasks', () => {
      const tasks = [createMockTask({ id: '1' }), createMockTask({ id: '2' })];
      useTaskStore.getState().setTasks(tasks);
      useTaskStore.getState().updateTask('1', { completed: true });
      expect(useTaskStore.getState().tasks[1].completed).toBe(false);
    });

    it('deleteTask removes the correct task', () => {
      const tasks = [createMockTask({ id: '1' }), createMockTask({ id: '2' })];
      useTaskStore.getState().setTasks(tasks);
      useTaskStore.getState().deleteTask('1');
      expect(useTaskStore.getState().tasks).toHaveLength(1);
      expect(useTaskStore.getState().tasks[0].id).toBe('2');
    });
  });

  describe('Project actions', () => {
    it('setProjects replaces all projects', () => {
      const projects = [createMockProject()];
      useTaskStore.getState().setProjects(projects);
      expect(useTaskStore.getState().projects).toEqual(projects);
    });

    it('addProject appends a project', () => {
      useTaskStore.getState().setProjects([createMockProject({ id: '1' })]);
      useTaskStore.getState().addProject(createMockProject({ id: '2', name: 'New' }));
      expect(useTaskStore.getState().projects).toHaveLength(2);
    });

    it('updateProject updates the correct project', () => {
      useTaskStore.getState().setProjects([createMockProject({ id: '1', name: 'Old' })]);
      useTaskStore.getState().updateProject('1', { name: 'Renamed' });
      expect(useTaskStore.getState().projects[0].name).toBe('Renamed');
    });

    it('deleteProject removes the correct project', () => {
      useTaskStore.getState().setProjects([
        createMockProject({ id: '1' }),
        createMockProject({ id: '2' }),
      ]);
      useTaskStore.getState().deleteProject('1');
      expect(useTaskStore.getState().projects).toHaveLength(1);
      expect(useTaskStore.getState().projects[0].id).toBe('2');
    });
  });

  describe('Label actions', () => {
    it('setLabels replaces all labels', () => {
      const labels = [createMockLabel()];
      useTaskStore.getState().setLabels(labels);
      expect(useTaskStore.getState().labels).toEqual(labels);
    });

    it('addLabel appends a label', () => {
      useTaskStore.getState().setLabels([createMockLabel({ id: '1' })]);
      useTaskStore.getState().addLabel(createMockLabel({ id: '2', name: 'new' }));
      expect(useTaskStore.getState().labels).toHaveLength(2);
    });

    it('updateLabel updates the correct label', () => {
      useTaskStore.getState().setLabels([createMockLabel({ id: '1', name: 'old' })]);
      useTaskStore.getState().updateLabel('1', { name: 'renamed' });
      expect(useTaskStore.getState().labels[0].name).toBe('renamed');
    });

    it('deleteLabel removes the correct label', () => {
      useTaskStore.getState().setLabels([
        createMockLabel({ id: '1' }),
        createMockLabel({ id: '2' }),
      ]);
      useTaskStore.getState().deleteLabel('1');
      expect(useTaskStore.getState().labels).toHaveLength(1);
      expect(useTaskStore.getState().labels[0].id).toBe('2');
    });
  });

  describe('View and filter actions', () => {
    it('setCurrentView to inbox clears project/label ids', () => {
      useTaskStore.getState().setCurrentView('inbox');
      const state = useTaskStore.getState();
      expect(state.currentView).toBe('inbox');
      expect(state.currentProjectId).toBeUndefined();
      expect(state.currentLabelId).toBeUndefined();
    });

    it('setCurrentView to project sets currentProjectId', () => {
      useTaskStore.getState().setCurrentView('project', 'proj-1');
      const state = useTaskStore.getState();
      expect(state.currentView).toBe('project');
      expect(state.currentProjectId).toBe('proj-1');
      expect(state.currentLabelId).toBeUndefined();
    });

    it('setCurrentView to label sets currentLabelId', () => {
      useTaskStore.getState().setCurrentView('label', 'lbl-1');
      const state = useTaskStore.getState();
      expect(state.currentView).toBe('label');
      expect(state.currentLabelId).toBe('lbl-1');
      expect(state.currentProjectId).toBeUndefined();
    });

    it('setFilter merges with existing filter', () => {
      useTaskStore.getState().setFilter({ priority: 1 });
      useTaskStore.getState().setFilter({ search: 'test' });
      const state = useTaskStore.getState();
      expect(state.filter.priority).toBe(1);
      expect(state.filter.search).toBe('test');
    });

    it('setLoading updates loading state', () => {
      useTaskStore.getState().setLoading(true);
      expect(useTaskStore.getState().loading).toBe(true);
      useTaskStore.getState().setLoading(false);
      expect(useTaskStore.getState().loading).toBe(false);
    });
  });
});
