import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TaskDetailModal from '../TaskDetailModal';
import { itemService } from '../../../services/itemService';
import type { Item } from '../../../types';

vi.mock('../../../services/itemService', () => ({
  itemService: { update: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('../../../store/taskStore', () => ({
  useTaskStore: () => ({ tasks: [] }),
}));
vi.mock('../../../store/authStore', () => ({
  useAuthStore: () => ({ user: { uid: 'user-1' } }),
}));

const task: Item = {
  id: 'task-1',
  title: 'My Task',
  description: 'Some description',
  completed: false,
  priority: 2,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 'user-1',
};

describe('TaskDetailModal', () => {
  it('renders task title in the form', () => {
    render(<TaskDetailModal task={task} onClose={vi.fn()} />);
    expect(screen.getByDisplayValue('My Task')).toBeInTheDocument();
  });

  it('calls itemService.update on save', async () => {
    render(<TaskDetailModal task={task} onClose={vi.fn()} />);
    const titleInput = screen.getByDisplayValue('My Task');
    fireEvent.change(titleInput, { target: { value: 'Updated Task' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(itemService.update).toHaveBeenCalledWith('task', 'task-1', expect.objectContaining({ title: 'Updated Task' }));
    });
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<TaskDetailModal task={task} onClose={onClose} />);
    fireEvent.click(screen.getByTitle('Close'));
    expect(onClose).toHaveBeenCalled();
  });
});
