import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TaskList from '../TaskList';
import { useTaskStore } from '../../../store/taskStore';
import { useAppData } from '../../../hooks/useAppData';
import type { Task } from '../../../types';

// Mock DnD kit
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: vi.fn(),
}));

// Mock TaskForm and SortableTaskItem to isolate TaskList logic
vi.mock('../TaskForm', () => ({
  default: () => <div data-testid="task-form">TaskForm</div>,
}));

vi.mock('../SortableTaskItem', () => ({
  default: ({ task }: { task: Task }) => (
    <div data-testid={`task-item-${task.id}`}>{task.title}</div>
  ),
}));

vi.mock('../../sections/SectionHeader', () => ({
  default: () => <div data-testid="section-header">SectionHeader</div>,
}));

vi.mock('../../sections/SectionForm', () => ({
  default: () => <div data-testid="section-form">SectionForm</div>,
}));

vi.mock('../../../hooks/useAppData');

const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: '1',
  title: 'Test Task',
  completed: false,
  priority: 4,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  userId: 'user1',
  labels: [],
  subtasks: [],
  ...overrides,
});

const defaultAppData = {
  tasks: [] as Task[],
  labels: [],
  projects: [],
  sections: [],
  savedFilters: [],
  isLoading: false,
  isPending: false,
};

describe('TaskList', () => {
  beforeEach(() => {
    vi.mocked(useAppData).mockReturnValue(defaultAppData);
    useTaskStore.setState({
      currentView: 'inbox',
      currentProjectId: undefined,
      currentLabelId: undefined,
      filter: {},
    });
  });

  it('renders loading spinner when loading', () => {
    vi.mocked(useAppData).mockReturnValue({ ...defaultAppData, isLoading: true });
    render(<TaskList />);
    expect(screen.queryByTestId('task-form')).not.toBeInTheDocument();
  });

  it('shows empty state when no tasks', () => {
    render(<TaskList />);
    expect(screen.getByText('No tasks yet. Add one above to get started.')).toBeInTheDocument();
  });

  it('shows "All done for today!" in today view with no tasks', () => {
    useTaskStore.setState({ currentView: 'today' });
    render(<TaskList />);
    expect(screen.getByText('All done for today!')).toBeInTheDocument();
  });

  describe('Inbox filtering', () => {
    it('shows tasks without projectId in inbox view', () => {
      vi.mocked(useAppData).mockReturnValue({
        ...defaultAppData,
        tasks: [
          createMockTask({ id: '1', title: 'No Project', projectId: undefined }),
          createMockTask({ id: '2', title: 'Has Project', projectId: 'proj-1' }),
        ],
      });
      useTaskStore.setState({ currentView: 'inbox' });
      render(<TaskList />);
      expect(screen.getByText('No Project')).toBeInTheDocument();
      expect(screen.queryByText('Has Project')).not.toBeInTheDocument();
    });
  });

  describe('Project filtering', () => {
    it('shows tasks matching currentProjectId', () => {
      vi.mocked(useAppData).mockReturnValue({
        ...defaultAppData,
        tasks: [
          createMockTask({ id: '1', title: 'Match', projectId: 'proj-1' }),
          createMockTask({ id: '2', title: 'Other', projectId: 'proj-2' }),
        ],
      });
      useTaskStore.setState({ currentView: 'project', currentProjectId: 'proj-1' });
      render(<TaskList />);
      expect(screen.getByText('Match')).toBeInTheDocument();
      expect(screen.queryByText('Other')).not.toBeInTheDocument();
    });
  });

  describe('Label filtering', () => {
    it('shows tasks matching currentLabelId', () => {
      vi.mocked(useAppData).mockReturnValue({
        ...defaultAppData,
        tasks: [
          createMockTask({ id: '1', title: 'Work Task', labels: ['work'] }),
          createMockTask({ id: '2', title: 'Personal', labels: ['personal'] }),
        ],
      });
      useTaskStore.setState({ currentView: 'label', currentLabelId: 'work' });
      render(<TaskList />);
      expect(screen.getByText('Work Task')).toBeInTheDocument();
      expect(screen.queryByText('Personal')).not.toBeInTheDocument();
    });
  });

  describe('Search filtering', () => {
    it('filters by title matching search term', () => {
      vi.mocked(useAppData).mockReturnValue({
        ...defaultAppData,
        tasks: [
          createMockTask({ id: '1', title: 'Buy groceries' }),
          createMockTask({ id: '2', title: 'Write report' }),
        ],
      });
      useTaskStore.setState({ filter: { search: 'groceries' } });
      render(<TaskList />);
      expect(screen.getByText('Buy groceries')).toBeInTheDocument();
      expect(screen.queryByText('Write report')).not.toBeInTheDocument();
    });

    it('filters by description matching search term', () => {
      vi.mocked(useAppData).mockReturnValue({
        ...defaultAppData,
        tasks: [
          createMockTask({ id: '1', title: 'Task A', description: 'needs milk' }),
          createMockTask({ id: '2', title: 'Task B', description: 'needs paper' }),
        ],
      });
      useTaskStore.setState({ filter: { search: 'milk' } });
      render(<TaskList />);
      expect(screen.getByText('Task A')).toBeInTheDocument();
      expect(screen.queryByText('Task B')).not.toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('sorts completed tasks after incomplete tasks', () => {
      vi.mocked(useAppData).mockReturnValue({
        ...defaultAppData,
        tasks: [
          createMockTask({ id: '1', title: 'Done', completed: true }),
          createMockTask({ id: '2', title: 'Todo', completed: false }),
        ],
      });
      render(<TaskList />);
      const items = screen.getAllByTestId(/task-item/);
      expect(items[0]).toHaveTextContent('Todo');
      expect(items[1]).toHaveTextContent('Done');
    });

    it('sorts by priority (lower number = higher priority first)', () => {
      vi.mocked(useAppData).mockReturnValue({
        ...defaultAppData,
        tasks: [
          createMockTask({ id: '1', title: 'Low P3', priority: 3 }),
          createMockTask({ id: '2', title: 'High P1', priority: 1 }),
        ],
      });
      render(<TaskList />);
      const items = screen.getAllByTestId(/task-item/);
      expect(items[0]).toHaveTextContent('High P1');
      expect(items[1]).toHaveTextContent('Low P3');
    });
  });
});
