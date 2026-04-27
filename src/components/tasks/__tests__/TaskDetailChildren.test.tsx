import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TaskDetailChildren from '../TaskDetailChildren';
import { useTaskStore } from '../../../store/taskStore';
import type { Item } from '../../../types';

vi.mock('../../../store/taskStore');
vi.mock('../../../store/authStore', () => ({
  useAuthStore: () => ({ user: { uid: 'user-1' } }),
}));

const parentTask: Item = {
  id: 'parent-1',
  title: 'Parent Task',
  completed: false,
  priority: 4,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 'user-1',
};

const childTask: Item = {
  id: 'child-1',
  title: 'Child Task',
  completed: false,
  priority: 4,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 'user-1',
  parentId: 'parent-1',
  sortOrder: 0,
};

describe('TaskDetailChildren', () => {
  beforeEach(() => {
    (useTaskStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      tasks: [parentTask, childTask],
    });
  });

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

  it('shows empty state when no children', () => {
    (useTaskStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      tasks: [parentTask],
    });
    render(<TaskDetailChildren task={parentTask} />);
    expect(screen.getByText('No subtasks yet.')).toBeInTheDocument();
  });
});
