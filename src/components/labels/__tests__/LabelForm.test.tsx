import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LabelForm from '../LabelForm';
import { labelService } from '../../../services/labelService';
import { useAuthStore } from '../../../store/authStore';

vi.mock('../../../services/labelService', () => ({
  labelService: {
    createLabel: vi.fn(),
  },
}));

describe('LabelForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { uid: 'user1', email: 'test@test.com' },
      loading: false,
    });
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<LabelForm isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders modal when isOpen is true', () => {
    render(<LabelForm isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Add Label' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter label name')).toBeInTheDocument();
  });

  it('has submit button disabled when name is empty', () => {
    render(<LabelForm isOpen={true} onClose={vi.fn()} />);
    const submitBtn = screen.getByRole('button', { name: 'Add Label' });
    expect(submitBtn).toBeDisabled();
  });

  it('enables submit when name is entered', () => {
    render(<LabelForm isOpen={true} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('Enter label name'), {
      target: { value: 'urgent' },
    });
    const submitBtn = screen.getByRole('button', { name: 'Add Label' });
    expect(submitBtn).not.toBeDisabled();
  });

  it('calls labelService.createLabel on submit', async () => {
    vi.mocked(labelService.createLabel).mockResolvedValue('lbl-1');
    const onClose = vi.fn();
    render(<LabelForm isOpen={true} onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText('Enter label name'), {
      target: { value: 'urgent' },
    });
    const form = screen.getByRole('button', { name: 'Add Label' }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(labelService.createLabel).toHaveBeenCalledWith({
        name: 'urgent',
        color: '#ef4444',
        userId: 'user1',
      });
    });
  });

  it('calls onClose after successful submit', async () => {
    vi.mocked(labelService.createLabel).mockResolvedValue('lbl-1');
    const onClose = vi.fn();
    render(<LabelForm isOpen={true} onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText('Enter label name'), {
      target: { value: 'test' },
    });
    const form = screen.getByRole('button', { name: 'Add Label' }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<LabelForm isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
