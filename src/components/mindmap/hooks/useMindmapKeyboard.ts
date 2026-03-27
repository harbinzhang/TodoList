import { useCallback, useEffect } from 'react';
import { useMindmapStore } from '../../../store/mindmapStore';
import { useAuthStore } from '../../../store/authStore';
import { itemService } from '../../../services/itemService';
import { treeService } from '../../../services/treeService';
import { buildTree, findNode, getParentNode, getSiblings } from '../../../utils/mindmapTree';

export function useMindmapKeyboard(containerRef: React.RefObject<HTMLDivElement | null>) {
  const handleKeyDown = useCallback(async (e: KeyboardEvent) => {
    const {
      nodes, selectedNodeId, editingNodeId,
      setSelectedNodeId, setEditingNode, toggleNodeExpanded, collapsedNodeIds,
      currentMindmapId,
    } = useMindmapStore.getState();
    const { user } = useAuthStore.getState();

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
        if (collapsedNodeIds.has(selectedNodeId)) {
          toggleNodeExpanded(selectedNodeId);
        } else if (selected.children.length > 0) {
          setSelectedNodeId(selected.children[0].id);
        }
        break;
      }
      case 'ArrowLeft': {
        e.preventDefault();
        if (!collapsedNodeIds.has(selectedNodeId) && selected.children.length > 0) {
          toggleNodeExpanded(selectedNodeId);
        } else {
          const parent = getParentNode(tree, selectedNodeId);
          if (parent) setSelectedNodeId(parent.id);
        }
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
        await itemService.toggleCompletion('mindmap', selectedNodeId, !selected.completed);
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
        const newId = await itemService.create('mindmap', {
          mindmapId: currentMindmapId,
          userId: user.uid,
          parentId: selectedNodeId,
          sortOrder: maxSort + 1,
          title: 'New node',
          completed: false,
          priority: 4,
        });
        if (collapsedNodeIds.has(selectedNodeId)) {
          toggleNodeExpanded(selectedNodeId);
        }
        setTimeout(() => {
          useMindmapStore.getState().setSelectedNodeId(newId);
          useMindmapStore.getState().setEditingNode(newId);
        }, 300);
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
        // Shift siblings after current
        const toShift = parentSiblings.filter((s) => (s.sortOrder ?? 0) > currentSort);
        for (const s of toShift) {
          await itemService.update('mindmap', s.id, { sortOrder: (s.sortOrder ?? 0) + 1 });
        }
        const newId = await itemService.create('mindmap', {
          mindmapId: currentMindmapId,
          userId: user.uid,
          parentId: parent.id,
          sortOrder: currentSort + 1,
          title: 'New node',
          completed: false,
          priority: 4,
        });
        setTimeout(() => {
          useMindmapStore.getState().setSelectedNodeId(newId);
          useMindmapStore.getState().setEditingNode(newId);
        }, 300);
        break;
      }
      case 'Delete':
      case 'Backspace': {
        e.preventDefault();
        if (selected.parentId == null) break; // Don't delete root
        const parent = getParentNode(tree, selectedNodeId);
        await treeService.deleteNode(selectedNodeId, nodes, 'cascade');
        if (parent) setSelectedNodeId(parent.id);
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
