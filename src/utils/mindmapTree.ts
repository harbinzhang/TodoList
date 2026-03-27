import type { MindmapNode } from '../types';

export interface TreeNode extends MindmapNode {
  children: TreeNode[];
}

export function buildTree(nodes: MindmapNode[]): TreeNode | null {
  if (nodes.length === 0) return null;

  const map = new Map<string, TreeNode>();
  let root: TreeNode | null = null;

  for (const node of nodes) {
    map.set(node.id, { ...node, children: [] });
  }

  for (const node of nodes) {
    const treeNode = map.get(node.id)!;
    if (node.parentId === null) {
      root = treeNode;
    } else {
      const parent = map.get(node.parentId);
      if (parent) {
        parent.children.push(treeNode);
      }
    }
  }

  for (const treeNode of map.values()) {
    treeNode.children.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return root;
}

export function findNode(root: TreeNode, nodeId: string): TreeNode | null {
  if (root.id === nodeId) return root;
  for (const child of root.children) {
    const found = findNode(child, nodeId);
    if (found) return found;
  }
  return null;
}

export function getParentNode(root: TreeNode, nodeId: string): TreeNode | null {
  for (const child of root.children) {
    if (child.id === nodeId) return root;
    const found = getParentNode(child, nodeId);
    if (found) return found;
  }
  return null;
}

export function getSiblings(root: TreeNode, nodeId: string): TreeNode[] {
  const parent = getParentNode(root, nodeId);
  if (!parent) return [];
  return parent.children;
}
