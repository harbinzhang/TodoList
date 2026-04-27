import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TaskItem from '../TaskItem';
import { itemService } from '../../../services/itemService';
import type { Item } from '../../../types';

vi.mock('../../../services/itemService', () => ({
  itemService: {
    toggleCompletion: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

const createMockItem = (overrides: Partial<Item> = {}): Item => ({
  id: 'task-1',
  title: 'Test Task',
  completed: false,
  priority: 4,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  userId: 'user1',
  labels: [],
  ...overrides,
});

describe('TaskItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders task title', () => {
    render(<TaskItem task={createMockItem({ title: 'Buy groceries' })} />);
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
  });

  it('renders task description when present', () => {
    render(<TaskItem task={createMockItem({ description: 'Milk and eggs' })} />);
    expect(screen.getByText('Milk and eggs')).toBeInTheDocument();
  });

  it('renders priority badge for P1-P3', () => {
    render(<TaskItem task={createMockItem({ priority: 1 })} />);
    expect(screen.getByText('P1')).toBeInTheDocument();
  });

  it('does not render priority badge for P4', () => {
    render(<TaskItem task={createMockItem({ priority: 4 })} />);
    expect(screen.queryByText('P4')).not.toBeInTheDocument();
  });

  it('renders due date when present', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    render(<TaskItem task={createMockItem({ dueDate: tomorrow })} />);
    expect(screen.getByText('Tomorrow')).toBeInTheDocument();
  });

  it('renders labels', () => {
    render(<TaskItem task={createMockItem({ labels: ['work', 'urgent'] })} />);
    expect(screen.getByText('work')).toBeInTheDocument();
    expect(screen.getByText('urgent')).toBeInTheDocument();
  });

  it('shows overflow count for > 2 labels', () => {
    render(<TaskItem task={createMockItem({ labels: ['a', 'b', 'c'] })} />);
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('applies strikethrough for completed tasks', () => {
    render(<TaskItem task={createMockItem({ completed: true })} />);
    const title = screen.getByText('Test Task');
    expect(title.className).toContain('line-through');
  });

  it('calls itemService.toggleCompletion on checkbox click', async () => {
    vi.mocked(itemService.toggleCompletion).mockResolvedValue(undefined);
    render(<TaskItem task={createMockItem()} />);

    // Click the first button (checkbox)
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      expect(itemService.toggleCompletion).toHaveBeenCalledWith('task', 'task-1', true);
    });
  });

  it('enters edit mode on title click and saves on Enter', async () => {
    vi.mocked(itemService.update).mockResolvedValue(undefined);
    render(<TaskItem task={createMockItem()} />);

    // Click title to enter edit mode
    fireEvent.click(screen.getByText('Test Task'));
    const input = screen.getByDisplayValue('Test Task');
    fireEvent.change(input, { target: { value: 'Updated Title' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(itemService.update).toHaveBeenCalledWith('task', 'task-1', { title: 'Updated Title' });
    });
  });

  it('reverts edit on Escape', () => {
    render(<TaskItem task={createMockItem()} />);

    fireEvent.click(screen.getByText('Test Task'));
    const input = screen.getByDisplayValue('Test Task');
    fireEvent.change(input, { target: { value: 'Changed' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    // Should show original title, not the changed value
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('opens TaskDetailModal when expand button is clicked', async () => {
    render(<TaskItem task={createMockItem()} />);
    const expandBtn = screen.getByTitle('Open detail');
    fireEvent.click(expandBtn);
    expect(await screen.findByText('Task Detail')).toBeInTheDocument();
  });
});
