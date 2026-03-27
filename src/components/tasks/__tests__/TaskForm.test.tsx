import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TaskForm from '../TaskForm';
import { itemService } from '../../../services/itemService';
import { useAuthStore } from '../../../store/authStore';
import { useTaskStore } from '../../../store/taskStore';

vi.mock('../../../services/itemService', () => ({
  itemService: {
    create: vi.fn(),
  },
}));

describe('TaskForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { uid: 'user1', email: 'test@test.com' },
      loading: false,
    });
    useTaskStore.setState({
      currentView: 'inbox',
      currentProjectId: undefined,
    });
  });

  it('renders collapsed "Add task" button initially', () => {
    render(<TaskForm />);
    expect(screen.getByText('Add task')).toBeInTheDocument();
  });

  it('expands form when "Add task" button is clicked', () => {
    render(<TaskForm />);
    fireEvent.click(screen.getByText('Add task'));
    expect(screen.getByPlaceholderText('Task name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Description')).toBeInTheDocument();
  });

  it('has submit button disabled when title is empty', () => {
    render(<TaskForm />);
    fireEvent.click(screen.getByText('Add task'));
    // After expansion, the "Add task" button is the submit button
    const submitBtn = screen.getByRole('button', { name: 'Add task' });
    expect(submitBtn).toBeDisabled();
  });

  it('enables submit button when title is entered', () => {
    render(<TaskForm />);
    fireEvent.click(screen.getByText('Add task'));
    fireEvent.change(screen.getByPlaceholderText('Task name'), {
      target: { value: 'New Task' },
    });
    const submitBtn = screen.getByRole('button', { name: 'Add task' });
    expect(submitBtn).not.toBeDisabled();
  });

  it('calls itemService.create on form submit', async () => {
    vi.mocked(itemService.create).mockResolvedValue('new-id');
    render(<TaskForm />);

    fireEvent.click(screen.getByText('Add task'));
    fireEvent.change(screen.getByPlaceholderText('Task name'), {
      target: { value: 'My New Task' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Add task' }).closest('form')!);

    await waitFor(() => {
      expect(itemService.create).toHaveBeenCalledOnce();
      const callArgs = vi.mocked(itemService.create).mock.calls[0];
      expect(callArgs[0]).toBe('task');
      expect(callArgs[1].title).toBe('My New Task');
      expect(callArgs[1].userId).toBe('user1');
      expect(callArgs[1].completed).toBe(false);
    });
  });

  it('resets form after successful submission', async () => {
    vi.mocked(itemService.create).mockResolvedValue('new-id');
    render(<TaskForm />);

    fireEvent.click(screen.getByText('Add task'));
    fireEvent.change(screen.getByPlaceholderText('Task name'), {
      target: { value: 'Task' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Add task' }).closest('form')!);

    await waitFor(() => {
      // Form should collapse back to button
      expect(screen.getByText('Add task')).toBeInTheDocument();
    });
  });

  it('collapses form on Cancel', () => {
    render(<TaskForm />);
    fireEvent.click(screen.getByText('Add task'));
    expect(screen.getByPlaceholderText('Task name')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    // Should be back to collapsed state
    expect(screen.queryByPlaceholderText('Task name')).not.toBeInTheDocument();
  });

  it('sets projectId when in project view', async () => {
    useTaskStore.setState({
      currentView: 'project',
      currentProjectId: 'proj-42',
    });
    vi.mocked(itemService.create).mockResolvedValue('new-id');

    render(<TaskForm />);
    fireEvent.click(screen.getByText('Add task'));
    fireEvent.change(screen.getByPlaceholderText('Task name'), {
      target: { value: 'Project Task' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Add task' }).closest('form')!);

    await waitFor(() => {
      const callArgs = vi.mocked(itemService.create).mock.calls[0];
      expect(callArgs[1].projectId).toBe('proj-42');
    });
  });
});
