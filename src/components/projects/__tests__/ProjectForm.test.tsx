import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProjectForm from '../ProjectForm';
import { projectService } from '../../../services/projectService';
import { useAuthStore } from '../../../store/authStore';

vi.mock('../../../services/projectService', () => ({
  projectService: {
    createProject: vi.fn(),
  },
}));

describe('ProjectForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { uid: 'user1', email: 'test@test.com' },
      loading: false,
    });
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<ProjectForm isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders modal when isOpen is true', () => {
    render(<ProjectForm isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Add Project' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter project name')).toBeInTheDocument();
  });

  it('has submit button disabled when name is empty', () => {
    render(<ProjectForm isOpen={true} onClose={vi.fn()} />);
    const submitBtn = screen.getByRole('button', { name: 'Add Project' });
    expect(submitBtn).toBeDisabled();
  });

  it('enables submit when name is entered', () => {
    render(<ProjectForm isOpen={true} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('Enter project name'), {
      target: { value: 'My Project' },
    });
    const submitBtn = screen.getByRole('button', { name: 'Add Project' });
    expect(submitBtn).not.toBeDisabled();
  });

  it('calls projectService.createProject on submit', async () => {
    vi.mocked(projectService.createProject).mockResolvedValue('proj-1');
    const onClose = vi.fn();
    render(<ProjectForm isOpen={true} onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText('Enter project name'), {
      target: { value: 'New Project' },
    });
    const form = screen.getByRole('button', { name: 'Add Project' }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(projectService.createProject).toHaveBeenCalledWith({
        name: 'New Project',
        color: '#ef4444',
        userId: 'user1',
      });
    });
  });

  it('calls onClose after successful submit', async () => {
    vi.mocked(projectService.createProject).mockResolvedValue('proj-1');
    const onClose = vi.fn();
    render(<ProjectForm isOpen={true} onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText('Enter project name'), {
      target: { value: 'Project' },
    });
    const form = screen.getByRole('button', { name: 'Add Project' }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<ProjectForm isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
