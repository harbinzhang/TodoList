import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TaskItem from '../TaskItem';
import type { Task } from '../../../types';
import { UndoQueueContext } from '../../../context/UndoQueueContext';

vi.mock('../../../services/taskService', () => ({
  taskService: {
    toggleTaskCompletion: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
  },
}));

const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
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

describe('TaskItem', () => {
  const enqueue = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders task title', () => {
    render(<TaskItem task={createMockTask({ title: 'Buy groceries' })} />);
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
  });

  it('renders priority badge for P1-P3', () => {
    render(<TaskItem task={createMockTask({ priority: 1 })} />);
    expect(screen.getByText('P1')).toBeInTheDocument();
  });

  it('does not render priority badge for P4', () => {
    render(<TaskItem task={createMockTask({ priority: 4 })} />);
    expect(screen.queryByText('P4')).not.toBeInTheDocument();
  });

  it('renders due date when present', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    render(<TaskItem task={createMockTask({ dueDate: tomorrow })} />);
    expect(screen.getByText('Tomorrow')).toBeInTheDocument();
  });

  it('renders labels', () => {
    render(<TaskItem task={createMockTask({ labels: ['work', 'urgent'] })} />);
    expect(screen.getByText('work')).toBeInTheDocument();
    expect(screen.getByText('urgent')).toBeInTheDocument();
  });

  it('shows overflow count for > 2 labels', () => {
    render(<TaskItem task={createMockTask({ labels: ['a', 'b', 'c'] })} />);
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('applies strikethrough for completed tasks', () => {
    render(<TaskItem task={createMockTask({ completed: true })} />);
    const title = screen.getByText('Test Task');
    expect(title.className).toContain('line-through');
  });

  it('calls taskService.toggleTaskCompletion on checkbox click', async () => {
    render(
      <UndoQueueContext.Provider value={{ enqueue, pendingItems: [] }}>
        <TaskItem task={createMockTask()} />
      </UndoQueueContext.Provider>
    );

    // Click the first button (checkbox)
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-1' }));
    });
  });

  it('shows subtask progress pill when subtasks exist', () => {
    render(
      <TaskItem
        task={createMockTask({
          subtasks: [
            { id: 's1', title: 'Sub 1', completed: true },
            { id: 's2', title: 'Sub 2', completed: false },
          ],
        })}
      />
    );
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('does not show subtask progress pill when no subtasks', () => {
    render(<TaskItem task={createMockTask({ subtasks: [] })} />);
    expect(screen.queryByText(/\d+\/\d+/)).not.toBeInTheDocument();
  });

  it('opens TaskDetailModal when expand button is clicked', async () => {
    render(<TaskItem task={createMockItem()} />);
    const expandBtn = screen.getByTitle('Open detail');
    fireEvent.click(expandBtn);
    expect(await screen.findByText('Task Detail')).toBeInTheDocument();
  });
});
