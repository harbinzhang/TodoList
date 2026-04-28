import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TaskDetailChildren from '../TaskDetailChildren';
import type { Task } from '../../../types';

vi.mock('../../../store/authStore', () => ({
  useAuthStore: () => ({ user: { uid: 'user-1' } }),
}));

const parentTask: Task = {
  id: 'parent-1',
  title: 'Parent Task',
  completed: false,
  priority: 4,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 'user-1',
  labels: [],
  subtasks: [{ id: 'sub-1', title: 'Child Task', completed: false }],
};

const emptyTask: Task = {
  ...parentTask,
  id: 'parent-2',
  subtasks: [],
};

describe('TaskDetailChildren', () => {
  it('renders child task in list mode by default', () => {
    render(<TaskDetailChildren task={parentTask} />);
    expect(screen.getByText('Child Task')).toBeInTheDocument();
  });

  it('shows list and mindmap toggle buttons', () => {
    render(<TaskDetailChildren task={parentTask} />);
    expect(screen.getByTitle('List view')).toBeInTheDocument();
    expect(screen.getByTitle('Mindmap view')).toBeInTheDocument();
  });

  it('shows subtask count', () => {
    render(<TaskDetailChildren task={parentTask} />);
    expect(screen.getByText('1 subtask')).toBeInTheDocument();
  });

  it('switches to mindmap mode on toggle click', () => {
    render(<TaskDetailChildren task={parentTask} />);
    fireEvent.click(screen.getByTitle('Mindmap view'));
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('shows empty state when no children', () => {
    render(<TaskDetailChildren task={emptyTask} />);
    expect(screen.getByText('No subtasks yet.')).toBeInTheDocument();
  });
});
