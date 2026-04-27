/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react';
import type { Item } from '../../types';
import type { ItemContext } from '../../services/itemService';

export interface TreeContextValue {
  selectedNodeId: string | null;
  editingNodeId: string | null;
  collapsedNodeIds: Set<string>;
  nodes: Item[];
  setSelectedNodeId: (id: string | null) => void;
  setEditingNodeId: (id: string | null) => void;
  toggleNodeExpanded: (id: string) => void;
  itemContext: ItemContext;
  contextId: string | null;
  userId: string;
  onAddChild: (parentId: string) => Promise<void>;
}

const TreeContext = createContext<TreeContextValue | null>(null);

export default TreeContext;

export function useTreeContext(): TreeContextValue {
  const ctx = useContext(TreeContext);
  if (!ctx) throw new Error('useTreeContext must be used within TreeContext.Provider');
  return ctx;
}
