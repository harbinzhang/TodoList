import { useCallback, useEffect } from 'react';
import { useMindmapStore } from '../../../store/mindmapStore';
import { useAuthStore } from '../../../store/authStore';
import { useUndoStore } from '../../../store/undoStore';
import { itemService } from '../../../services/itemService';
import { treeService } from '../../../services/treeService';
import { buildTree, findNode, getParentNode, getSiblings } from '../../../utils/mindmapTree';

export function useMindmapKeyboard(containerRef: React.RefObject<HTMLDivElement | null>) {
  const handleKeyDown = useCallback(async (e: KeyboardEvent) => {
    const {
      nodes, selectedNodeId, editingNodeId,
      setSelectedNodeId, setEditingNode, collapsedNodeIds, toggleNodeExpanded,
      currentMindmapId,
    } = useMindmapStore.getState();
    const { user } = useAuthStore.getState();

    // Undo/redo works regardless of editing or selection state
    const isCtrlOrMeta = e.ctrlKey || e.metaKey;
    if (isCtrlOrMeta && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        await useUndoStore.getState().redo();
      } else {
        await useUndoStore.getState().undo();
      }
      return;
    }
    if (isCtrlOrMeta && e.key === 'y') {
      e.preventDefault();
      await useUndoStore.getState().redo();
      return;
    }

    // Don't handle keys when editing
    if (editingNodeId) return;
    if (!selectedNodeId) return;

    const tree = buildTree(nodes);
    if (!tree) return;

    const selected = findNode(tree, selectedNodeId);
    if (!selected) return;

    switch (e.key) {
      case 'ArrowRight': {
        e.preventDefault();
        if (selected.children.length > 0 && !collapsedNodeIds.has(selectedNodeId)) {
          setSelectedNodeId(selected.children[0].id);
        }
        break;
      }
      case 'ArrowLeft': {
        e.preventDefault();
        const parent = getParentNode(tree, selectedNodeId);
        if (parent) setSelectedNodeId(parent.id);
        break;
      }
      case 'ArrowDown': {
        e.preventDefault();
        const siblings = getSiblings(tree, selectedNodeId);
        const idx = siblings.findIndex((s) => s.id === selectedNodeId);
        if (idx < siblings.length - 1) {
          setSelectedNodeId(siblings[idx + 1].id);
        }
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const siblings = getSiblings(tree, selectedNodeId);
        const idx = siblings.findIndex((s) => s.id === selectedNodeId);
        if (idx > 0) {
          setSelectedNodeId(siblings[idx - 1].id);
        }
        break;
      }
      case ' ': {
        e.preventDefault();
        const prevCompleted = selected.completed;
        const nodeId = selectedNodeId;
        await itemService.toggleCompletion('mindmap', nodeId, !prevCompleted);
        useUndoStore.getState().push({
          description: 'Toggle completion',
          undo: () => itemService.toggleCompletion('mindmap', nodeId, prevCompleted),
          redo: () => itemService.toggleCompletion('mindmap', nodeId, !prevCompleted),
        });
        break;
      }
      case 'F2': {
        e.preventDefault();
        setEditingNode(selectedNodeId);
        break;
      }
      case 'Escape': {
        e.preventDefault();
        setSelectedNodeId(null);
        break;
      }
      case 'Tab': {
        e.preventDefault();
        if (!currentMindmapId || !user) break;
        const childSiblings = nodes.filter((n) => n.parentId === selectedNodeId);
        const maxSort = childSiblings.length > 0
          ? Math.max(...childSiblings.map((s) => s.sortOrder ?? 0))
          : -1;
        const newNodeData = {
          mindmapId: currentMindmapId,
          userId: user.uid,
          parentId: selectedNodeId,
          sortOrder: maxSort + 1,
          title: 'New node',
          completed: false as const,
          priority: 4 as const,
        };
        const newId = await itemService.create('mindmap', newNodeData);
        if (collapsedNodeIds.has(selectedNodeId)) {
          toggleNodeExpanded(selectedNodeId);
        }
        const parentId = selectedNodeId;
        setTimeout(() => {
          useMindmapStore.getState().setSelectedNodeId(newId);
          useMindmapStore.getState().setEditingNode(newId);
        }, 300);
        useUndoStore.getState().push({
          description: 'Add child node',
          undo: async () => {
            await itemService.delete('mindmap', newId);
            useMindmapStore.getState().setSelectedNodeId(parentId);
          },
          redo: async () => {
            await itemService.createWithId('mindmap', newId, newNodeData);
            useMindmapStore.getState().setSelectedNodeId(newId);
          },
        });
        break;
      }
      case 'Enter': {
        e.preventDefault();
        if (e.shiftKey) {
          setEditingNode(selectedNodeId);
          break;
        }
        if (!currentMindmapId || !user) break;
        const parent = getParentNode(tree, selectedNodeId);
        if (!parent) break; // Can't add sibling to root
        const parentSiblings = nodes.filter((n) => n.parentId === parent.id);
        const currentSort = selected.sortOrder ?? 0;
        const toShift = parentSiblings.filter((s) => (s.sortOrder ?? 0) > currentSort);
        const originalSorts = toShift.map((s) => ({ id: s.id, sortOrder: s.sortOrder ?? 0 }));
        for (const s of toShift) {
          await itemService.update('mindmap', s.id, { sortOrder: (s.sortOrder ?? 0) + 1 });
        }
        const newNodeData = {
          mindmapId: currentMindmapId,
          userId: user.uid,
          parentId: parent.id,
          sortOrder: currentSort + 1,
          title: 'New node',
          completed: false as const,
          priority: 4 as const,
        };
        const newId = await itemService.create('mindmap', newNodeData);
        const prevSelectedId = selectedNodeId;
        setTimeout(() => {
          useMindmapStore.getState().setSelectedNodeId(newId);
          useMindmapStore.getState().setEditingNode(newId);
        }, 300);
        useUndoStore.getState().push({
          description: 'Add sibling node',
          undo: async () => {
            await itemService.delete('mindmap', newId);
            for (const s of originalSorts) {
              await itemService.update('mindmap', s.id, { sortOrder: s.sortOrder });
            }
            useMindmapStore.getState().setSelectedNodeId(prevSelectedId);
          },
          redo: async () => {
            for (const s of originalSorts) {
              await itemService.update('mindmap', s.id, { sortOrder: s.sortOrder + 1 });
            }
            await itemService.createWithId('mindmap', newId, newNodeData);
            useMindmapStore.getState().setSelectedNodeId(newId);
          },
        });
        break;
      }
      case 'Delete':
      case 'Backspace': {
        e.preventDefault();
        if (selected.parentId == null) break; // Don't delete root
        const parent = getParentNode(tree, selectedNodeId);
        const descendantIds = treeService.getDescendantIds(selectedNodeId, nodes);
        const deletedIds = [selectedNodeId, ...descendantIds];
        const deletedNodes = nodes.filter((n) => deletedIds.includes(n.id));
        const nodeId = selectedNodeId;
        await treeService.deleteNode(nodeId, nodes, 'cascade');
        if (parent) setSelectedNodeId(parent.id);
        const parentId = parent?.id ?? null;
        useUndoStore.getState().push({
          description: 'Delete node',
          undo: async () => {
            await treeService.recreateNodes(deletedNodes);
            useMindmapStore.getState().setSelectedNodeId(nodeId);
          },
          redo: async () => {
            const currentNodes = useMindmapStore.getState().nodes;
            await treeService.deleteNode(nodeId, currentNodes, 'cascade');
            if (parentId) useMindmapStore.getState().setSelectedNodeId(parentId);
          },
        });
        break;
      }
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener('keydown', handleKeyDown);
    el.setAttribute('tabindex', '0');

    return () => {
      el.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, handleKeyDown]);
}
