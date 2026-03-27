import { create } from 'zustand';
import type { Mindmap, Item } from '../types';

interface MindmapState {
  mindmaps: Mindmap[];
  nodes: Item[];
  currentMindmapId: string | null;
  selectedNodeId: string | null;
  collapsedNodeIds: Set<string>;
  editingNodeId: string | null;
  loading: boolean;

  setMindmaps: (mindmaps: Mindmap[]) => void;
  addMindmap: (mindmap: Mindmap) => void;
  updateMindmap: (id: string, updates: Partial<Mindmap>) => void;
  deleteMindmap: (id: string) => void;

  setNodes: (nodes: Item[]) => void;
  addNode: (node: Item) => void;
  updateNode: (id: string, updates: Partial<Item>) => void;
  deleteNode: (id: string) => void;

  setCurrentMindmapId: (id: string | null) => void;
  setSelectedNodeId: (id: string | null) => void;
  toggleNodeExpanded: (id: string) => void;
  collapseAll: () => void;
  expandAll: () => void;
  setEditingNode: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useMindmapStore = create<MindmapState>((set, get) => ({
  mindmaps: [],
  nodes: [],
  currentMindmapId: null,
  selectedNodeId: null,
  collapsedNodeIds: new Set<string>(),
  editingNodeId: null,
  loading: false,

  setMindmaps: (mindmaps) => set({ mindmaps }),
  addMindmap: (mindmap) => set({ mindmaps: [...get().mindmaps, mindmap] }),
  updateMindmap: (id, updates) =>
    set({
      mindmaps: get().mindmaps.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    }),
  deleteMindmap: (id) =>
    set({ mindmaps: get().mindmaps.filter((m) => m.id !== id) }),

  setNodes: (nodes) => set({ nodes }),
  addNode: (node) => set({ nodes: [...get().nodes, node] }),
  updateNode: (id, updates) =>
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, ...updates } : n
      ),
    }),
  deleteNode: (id) =>
    set({ nodes: get().nodes.filter((n) => n.id !== id) }),

  setCurrentMindmapId: (id) => set({ currentMindmapId: id, nodes: [], selectedNodeId: null, editingNodeId: null }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  toggleNodeExpanded: (id) => {
    const collapsed = new Set(get().collapsedNodeIds);
    if (collapsed.has(id)) {
      collapsed.delete(id);
    } else {
      collapsed.add(id);
    }
    set({ collapsedNodeIds: collapsed });
  },
  collapseAll: () => {
    const nodesWithChildren = new Set<string>();
    for (const node of get().nodes) {
      if (node.parentId != null) nodesWithChildren.add(node.parentId);
    }
    set({ collapsedNodeIds: nodesWithChildren });
  },
  expandAll: () => set({ collapsedNodeIds: new Set() }),
  setEditingNode: (id) => set({ editingNodeId: id }),
  setLoading: (loading) => set({ loading }),
}));
