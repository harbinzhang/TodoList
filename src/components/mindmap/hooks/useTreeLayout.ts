import { useMemo } from 'react';
import type { TreeNode } from '../../../utils/mindmapTree';

const LAYER_GAP_X = 260;
const NODE_HEIGHT = 44;
const NODE_GAP_Y = 12;
const NODE_MIN_WIDTH = 200;
const NODE_MAX_WIDTH = 320;
const CHAR_WIDTH = 8;
const NODE_PADDING_X = 90;

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  node: TreeNode;
  children: LayoutNode[];
}

export interface LayoutEdge {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourceNode: TreeNode;
  targetNode: TreeNode;
}

function getNodeWidth(title: string): number {
  const textWidth = title.length * CHAR_WIDTH + NODE_PADDING_X;
  return Math.max(NODE_MIN_WIDTH, Math.min(NODE_MAX_WIDTH, textWidth));
}

function computeSubtreeHeight(
  node: TreeNode,
  collapsedIds: Set<string>
): number {
  if (collapsedIds.has(node.id) || node.children.length === 0) {
    return NODE_HEIGHT;
  }
  const childrenHeight = node.children.reduce(
    (sum, child) => sum + computeSubtreeHeight(child, collapsedIds),
    0
  );
  const gaps = (node.children.length - 1) * NODE_GAP_Y;
  return Math.max(NODE_HEIGHT, childrenHeight + gaps);
}

function layoutTree(
  node: TreeNode,
  depth: number,
  yOffset: number,
  collapsedIds: Set<string>
): LayoutNode {
  const width = getNodeWidth(node.title);
  const subtreeHeight = computeSubtreeHeight(node, collapsedIds);
  const y = yOffset + subtreeHeight / 2 - NODE_HEIGHT / 2;
  const x = depth * LAYER_GAP_X;

  const children: LayoutNode[] = [];

  if (!collapsedIds.has(node.id) && node.children.length > 0) {
    let childY = yOffset;
    for (const child of node.children) {
      const childHeight = computeSubtreeHeight(child, collapsedIds);
      children.push(layoutTree(child, depth + 1, childY, collapsedIds));
      childY += childHeight + NODE_GAP_Y;
    }
  }

  return { id: node.id, x, y, width, height: NODE_HEIGHT, depth, node, children };
}

function collectNodes(layoutNode: LayoutNode): LayoutNode[] {
  const result: LayoutNode[] = [layoutNode];
  for (const child of layoutNode.children) {
    result.push(...collectNodes(child));
  }
  return result;
}

function collectEdges(layoutNode: LayoutNode): LayoutEdge[] {
  const edges: LayoutEdge[] = [];
  for (const child of layoutNode.children) {
    edges.push({
      id: `${layoutNode.id}-${child.id}`,
      sourceX: layoutNode.x + layoutNode.width,
      sourceY: layoutNode.y + layoutNode.height / 2,
      targetX: child.x,
      targetY: child.y + child.height / 2,
      sourceNode: layoutNode.node,
      targetNode: child.node,
    });
    edges.push(...collectEdges(child));
  }
  return edges;
}

export function useTreeLayout(
  root: TreeNode | null,
  collapsedIds: Set<string>
) {
  return useMemo(() => {
    if (!root) return { nodes: [], edges: [], rootLayout: null };

    const rootLayout = layoutTree(root, 0, 0, collapsedIds);
    const nodes = collectNodes(rootLayout);
    const edges = collectEdges(rootLayout);

    return { nodes, edges, rootLayout };
  }, [root, collapsedIds]);
}
