import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MindmapNodeComponent from '../MindmapNodeComponent';
import TreeContext, { type TreeContextValue } from '../TreeContext';
import type { LayoutNode } from '../hooks/useTreeLayout';
import type { Item } from '../../../types';

const mockNode: Item = {
  id: 'node-1',
  title: 'Test Node',
  completed: false,
  priority: 4,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 'user-1',
  parentId: 'root-1',
  sortOrder: 0,
};

const mockLayoutNode: LayoutNode = {
  id: 'node-1',
  x: 0,
  y: 0,
  width: 200,
  height: 44,
  depth: 1,
  node: { ...mockNode, children: [] },
  children: [],
};

const makeContext = (overrides: Partial<TreeContextValue> = {}): TreeContextValue => ({
  selectedNodeId: null,
  editingNodeId: null,
  collapsedNodeIds: new Set(),
  nodes: [mockNode],
  setSelectedNodeId: vi.fn(),
  setEditingNodeId: vi.fn(),
  toggleNodeExpanded: vi.fn(),
  itemContext: 'task',
  contextId: null,
  userId: 'user-1',
  onAddChild: vi.fn(),
  ...overrides,
});

const renderWithCtx = (ctx: TreeContextValue) =>
  render(
    <TreeContext.Provider value={ctx}>
      <MindmapNodeComponent layoutNode={mockLayoutNode} onAddChild={vi.fn()} />
    </TreeContext.Provider>
  );

describe('MindmapNodeComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders node title', () => {
    renderWithCtx(makeContext());
    expect(screen.getByText('Test Node')).toBeInTheDocument();
  });

  it('calls setSelectedNodeId on click', () => {
    const ctx = makeContext();
    renderWithCtx(ctx);
    fireEvent.click(screen.getByText('Test Node'));
    expect(ctx.setSelectedNodeId).toHaveBeenCalledWith('node-1');
  });

  it('shows ring when node is selected', () => {
    renderWithCtx(makeContext({ selectedNodeId: 'node-1' }));
    const nodeEl = screen.getByText('Test Node').closest('[data-mindmap-node]');
    expect(nodeEl?.className).toMatch(/ring-blue-500/);
  });
});
