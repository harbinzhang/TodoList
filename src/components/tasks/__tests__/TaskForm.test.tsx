import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TaskForm from '../TaskForm';
import { taskService } from '../../../services/taskService';
import { useAuthStore } from '../../../store/authStore';
import { useTaskStore } from '../../../store/taskStore';

vi.mock('../../../services/taskService', () => ({
  taskService: {
    createTask: vi.fn(),
  },
}));

// Mock chrono-node to avoid issues in test environment
vi.mock('chrono-node', () => ({
  parse: vi.fn(() => []),
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
      projects: [],
      labels: [],
    });
  });

  it('renders collapsed "Add task" button initially', () => {
    render(<TaskForm />);
    expect(screen.getByText('Add task')).toBeInTheDocument();
  });

  it('expands to Quick Add when "Add task" button is clicked', () => {
    render(<TaskForm />);
    fireEvent.click(screen.getByText('Add task'));
    // Quick Add mode shows a text input and a "Detailed mode" toggle
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByText('Detailed mode')).toBeInTheDocument();
  });

  it('expands to detailed form when "Detailed mode" is clicked', () => {
    render(<TaskForm />);
    fireEvent.click(screen.getByText('Add task'));
    fireEvent.click(screen.getByText('Detailed mode'));
    expect(screen.getByPlaceholderText('Task name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Description')).toBeInTheDocument();
  });

  it('has submit button disabled when title is empty in detailed mode', () => {
    render(<TaskForm />);
    fireEvent.click(screen.getByText('Add task'));
    fireEvent.click(screen.getByText('Detailed mode'));
    // After expansion, the "Add task" button is the submit button
    const submitBtn = screen.getByRole('button', { name: 'Add task' });
    expect(submitBtn).toBeDisabled();
  });

  it('enables submit button when title is entered in detailed mode', () => {
    render(<TaskForm />);
    fireEvent.click(screen.getByText('Add task'));
    fireEvent.click(screen.getByText('Detailed mode'));
    fireEvent.change(screen.getByPlaceholderText('Task name'), {
      target: { value: 'New Task' },
    });
    const submitBtn = screen.getByRole('button', { name: 'Add task' });
    expect(submitBtn).not.toBeDisabled();
  });

  it('calls taskService.createTask on detailed form submit', async () => {
    vi.mocked(taskService.createTask).mockResolvedValue('new-id');
    render(<TaskForm />);

    fireEvent.click(screen.getByText('Add task'));
    fireEvent.click(screen.getByText('Detailed mode'));
    fireEvent.change(screen.getByPlaceholderText('Task name'), {
      target: { value: 'My New Task' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Add task' }).closest('form')!);

    await waitFor(() => {
      expect(taskService.createTask).toHaveBeenCalledOnce();
      const callArgs = vi.mocked(taskService.createTask).mock.calls[0][0];
      expect(callArgs.title).toBe('My New Task');
      expect(callArgs.userId).toBe('user1');
      expect(callArgs.completed).toBe(false);
    });
  });

  it('resets form after successful submission in detailed mode', async () => {
    vi.mocked(taskService.createTask).mockResolvedValue('new-id');
    render(<TaskForm />);

    fireEvent.click(screen.getByText('Add task'));
    fireEvent.click(screen.getByText('Detailed mode'));
    fireEvent.change(screen.getByPlaceholderText('Task name'), {
      target: { value: 'Task' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Add task' }).closest('form')!);

    await waitFor(() => {
      // Form should collapse back to button
      expect(screen.getByText('Add task')).toBeInTheDocument();
    });
  });

  it('collapses form on Cancel in detailed mode', () => {
    render(<TaskForm />);
    fireEvent.click(screen.getByText('Add task'));
    fireEvent.click(screen.getByText('Detailed mode'));
    expect(screen.getByPlaceholderText('Task name')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    // Should be back to collapsed state
    expect(screen.queryByPlaceholderText('Task name')).not.toBeInTheDocument();
  });

  it('sets projectId when in project view', async () => {
    useTaskStore.setState({
      currentView: 'project',
      currentProjectId: 'proj-42',
      projects: [],
      labels: [],
    });
    vi.mocked(taskService.createTask).mockResolvedValue('new-id');

    render(<TaskForm />);
    fireEvent.click(screen.getByText('Add task'));
    fireEvent.click(screen.getByText('Detailed mode'));
    fireEvent.change(screen.getByPlaceholderText('Task name'), {
      target: { value: 'Project Task' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Add task' }).closest('form')!);

    await waitFor(() => {
      const callArgs = vi.mocked(taskService.createTask).mock.calls[0][0];
      expect(callArgs.projectId).toBe('proj-42');
    });
  });
});
