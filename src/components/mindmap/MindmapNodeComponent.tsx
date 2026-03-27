import { useState, useRef, useEffect } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import {
  PlusIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useMindmapStore } from '../../store/mindmapStore';
import { useAuthStore } from '../../store/authStore';
import { itemService } from '../../services/itemService';
import { treeService } from '../../services/treeService';
import type { LayoutNode } from './hooks/useTreeLayout';

interface MindmapNodeComponentProps {
  layoutNode: LayoutNode;
  onAddChild: (parentId: string) => void;
}

const priorityBorderColors: Record<number, string> = {
  1: 'border-l-red-500',
  2: 'border-l-orange-500',
  3: 'border-l-blue-500',
  4: 'border-l-gray-300',
};

const MindmapNodeComponent = ({ layoutNode, onAddChild }: MindmapNodeComponentProps) => {
  const { node } = layoutNode;
  const { selectedNodeId, setSelectedNodeId, editingNodeId, setEditingNode, collapsedNodeIds, toggleNodeExpanded, nodes } = useMindmapStore();
  const [editTitle, setEditTitle] = useState(node.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);

  const isSelected = selectedNodeId === node.id;
  const isEditing = editingNodeId === node.id;
  const isCollapsed = collapsedNodeIds.has(node.id);
  const hasChildren = node.children.length > 0;
  const isRoot = node.parentId == null;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleToggleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await itemService.toggleCompletion('mindmap', node.id, !node.completed);
  };

  const handleSaveEdit = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== node.title) {
      await itemService.update('mindmap', node.id, { title: trimmed });
    } else {
      setEditTitle(node.title);
    }
    setEditingNode(null);
    savingRef.current = false;
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditTitle(node.title);
      setEditingNode(null);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Save edit
      savingRef.current = true;
      const trimmed = editTitle.trim();
      if (trimmed && trimmed !== node.title) {
        await itemService.update('mindmap', node.id, { title: trimmed });
      }
      setEditingNode(null);
      savingRef.current = false;

      // Create child node
      const { currentMindmapId, nodes: storeNodes, collapsedNodeIds, toggleNodeExpanded } = useMindmapStore.getState();
      const { user } = useAuthStore.getState();
      if (!currentMindmapId || !user) return;

      const childSiblings = storeNodes.filter((n) => n.parentId === node.id);
      const maxSort = childSiblings.length > 0
        ? Math.max(...childSiblings.map((s) => s.sortOrder ?? 0))
        : -1;
      const newId = await itemService.create('mindmap', {
        mindmapId: currentMindmapId,
        userId: user.uid,
        parentId: node.id,
        sortOrder: maxSort + 1,
        title: 'New node',
        completed: false,
        priority: 4,
      });
      if (collapsedNodeIds.has(node.id)) {
        toggleNodeExpanded(node.id);
      }
      setTimeout(() => {
        useMindmapStore.getState().setSelectedNodeId(newId);
        useMindmapStore.getState().setEditingNode(newId);
      }, 300);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRoot) return;
    await treeService.deleteNode(node.id, nodes, 'cascade');
  };

  const handleClick = () => {
    setSelectedNodeId(node.id);
  };

  const handleDoubleClick = () => {
    setEditingNode(node.id);
    setEditTitle(node.title);
  };

  return (
    <div
      data-mindmap-node
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={`group relative flex items-center h-full px-3 rounded-lg border border-l-4 transition-all duration-200 cursor-pointer select-none
        ${priorityBorderColors[node.priority]}
        ${node.completed ? 'opacity-60 bg-gray-50' : 'bg-white'}
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1 shadow-md' : 'border-gray-200 hover:shadow-md'}
      `}
    >
      {/* Expand/collapse */}
      {hasChildren ? (
        <button
          onClick={(e) => { e.stopPropagation(); toggleNodeExpanded(node.id); }}
          className="flex-shrink-0 w-4 h-4 mr-1 text-gray-400 hover:text-gray-600"
        >
          {isCollapsed ? (
            <ChevronRightIcon className="w-4 h-4" />
          ) : (
            <ChevronDownIcon className="w-4 h-4" />
          )}
        </button>
      ) : (
        <div className="w-4 mr-1 flex-shrink-0" />
      )}

      {/* Checkbox */}
      <button onClick={handleToggleComplete} className="flex-shrink-0 mr-2">
        {node.completed ? (
          <CheckCircleSolidIcon className="w-5 h-5 text-green-500" />
        ) : (
          <CheckCircleIcon className="w-5 h-5 text-gray-400 hover:text-green-500 transition-colors" />
        )}
      </button>

      {/* Title */}
      {isEditing ? (
        <input
          ref={inputRef}
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleSaveEdit}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0 text-sm bg-transparent border-none outline-none focus:ring-0 p-0"
        />
      ) : (
        <span
          className={`flex-1 min-w-0 text-sm truncate ${
            node.completed ? 'line-through text-gray-500' : 'text-gray-900'
          }`}
        >
          {node.title}
        </span>
      )}

      {/* Actions — absolute so they don't consume layout space */}
      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded px-1">
        <button
          onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }}
          className="p-0.5 text-gray-400 hover:text-blue-500 transition-colors"
          title="Add child"
        >
          <PlusIcon className="w-4 h-4" />
        </button>
        {!isRoot && (
          <button
            onClick={handleDelete}
            className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
            title="Delete"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default MindmapNodeComponent;
