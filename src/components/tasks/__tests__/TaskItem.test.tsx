import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TaskItem from '../TaskItem';
import { taskService } from '../../../services/taskService';
import type { Task } from '../../../types';

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders task title', () => {
    render(<TaskItem task={createMockTask({ title: 'Buy groceries' })} />);
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
  });

  it('renders task description when present', () => {
    render(<TaskItem task={createMockTask({ description: 'Milk and eggs' })} />);
    expect(screen.getByText('Milk and eggs')).toBeInTheDocument();
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
    vi.mocked(taskService.toggleTaskCompletion).mockResolvedValue(undefined);
    render(<TaskItem task={createMockTask()} />);

    // Click the first button (checkbox)
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      expect(taskService.toggleTaskCompletion).toHaveBeenCalledWith('task-1', true);
    });
  });

  it('enters edit mode on title click and saves on Enter', async () => {
    vi.mocked(taskService.updateTask).mockResolvedValue(undefined);
    render(<TaskItem task={createMockTask()} />);

    // Click title to enter edit mode
    fireEvent.click(screen.getByText('Test Task'));
    const input = screen.getByDisplayValue('Test Task');
    fireEvent.change(input, { target: { value: 'Updated Title' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(taskService.updateTask).toHaveBeenCalledWith('task-1', { title: 'Updated Title' });
    });
  });

  it('reverts edit on Escape', () => {
    render(<TaskItem task={createMockTask()} />);

    fireEvent.click(screen.getByText('Test Task'));
    const input = screen.getByDisplayValue('Test Task');
    fireEvent.change(input, { target: { value: 'Changed' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    // Should show original title, not the changed value
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });
});
