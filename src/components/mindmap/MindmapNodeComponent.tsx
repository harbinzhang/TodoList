import { useState, useRef, useEffect } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import {
  PlusIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useUndoStore } from '../../store/undoStore';
import { itemService } from '../../services/itemService';
import { treeService } from '../../services/treeService';
import { useTreeContext } from './TreeContext';
import type { LayoutNode } from './hooks/useTreeLayout';
import type { Item } from '../../types';

interface MindmapNodeComponentProps {
  layoutNode: LayoutNode;
  onAddChild: (parentId: string) => void;
  isDropTarget?: boolean;
  onDragStart?: (nodeId: string, e: React.PointerEvent) => void;
}

const priorityBorderColors: Record<number, string> = {
  1: 'border-l-red-500',
  2: 'border-l-orange-500',
  3: 'border-l-blue-500',
  4: 'border-l-gray-300',
};

const MindmapNodeComponent = ({ layoutNode, onAddChild, isDropTarget, onDragStart }: MindmapNodeComponentProps) => {
  const { node } = layoutNode;
  const ctx = useTreeContext();
  const { selectedNodeId, editingNodeId, collapsedNodeIds, nodes, readOnly } = ctx;

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
    if (readOnly) return;
    const prevCompleted = node.completed;
    await itemService.toggleCompletion(ctx.itemContext, node.id, !prevCompleted);
    if (ctx.itemContext === 'mindmap') {
      useUndoStore.getState().push({
        description: 'Toggle completion',
        undo: () => itemService.toggleCompletion(ctx.itemContext, node.id, prevCompleted),
        redo: () => itemService.toggleCompletion(ctx.itemContext, node.id, !prevCompleted),
      });
    }
  };

  const handleSaveEdit = async () => {
    if (savingRef.current || readOnly) { ctx.setEditingNodeId(null); return; }
    savingRef.current = true;
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== node.title) {
      const oldTitle = node.title;
      const nodeId = node.id;
      await itemService.update(ctx.itemContext, nodeId, { title: trimmed });
      if (ctx.itemContext === 'mindmap') {
        useUndoStore.getState().push({
          description: 'Edit title',
          undo: () => itemService.update(ctx.itemContext, nodeId, { title: oldTitle }),
          redo: () => itemService.update(ctx.itemContext, nodeId, { title: trimmed }),
        });
      }
    } else {
      setEditTitle(node.title);
    }
    ctx.setEditingNodeId(null);
    savingRef.current = false;
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditTitle(node.title);
      ctx.setEditingNodeId(null);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      savingRef.current = true;
      const trimmed = editTitle.trim();
      const oldTitle = node.title;
      const titleChanged = trimmed && trimmed !== oldTitle;
      if (titleChanged) {
        await itemService.update(ctx.itemContext, node.id, { title: trimmed });
      }
      ctx.setEditingNodeId(null);
      savingRef.current = false;

      const childSiblings = ctx.nodes.filter((n) => n.parentId === node.id);
      const maxSort = childSiblings.length > 0
        ? Math.max(...childSiblings.map((s) => s.sortOrder ?? 0))
        : -1;
      const newNodeData = {
        ...(ctx.itemContext === 'mindmap' && ctx.contextId ? { mindmapId: ctx.contextId } : {}),
        userId: ctx.userId,
        parentId: node.id,
        sortOrder: maxSort + 1,
        title: 'New node',
        completed: false as const,
        priority: 4 as const,
      };
      const newId = await itemService.create(ctx.itemContext, newNodeData as Omit<Item, 'id' | 'createdAt' | 'updatedAt'>);
      if (collapsedNodeIds.has(node.id)) ctx.toggleNodeExpanded(node.id);
      const parentNodeId = node.id;
      setTimeout(() => {
        ctx.setSelectedNodeId(newId);
        ctx.setEditingNodeId(newId);
      }, 300);

      if (ctx.itemContext === 'mindmap') {
        useUndoStore.getState().push({
          description: 'Tab: save + add child',
          undo: async () => {
            await itemService.delete(ctx.itemContext, newId);
            if (titleChanged) await itemService.update(ctx.itemContext, parentNodeId, { title: oldTitle });
            ctx.setSelectedNodeId(parentNodeId);
          },
          redo: async () => {
            if (titleChanged) await itemService.update(ctx.itemContext, parentNodeId, { title: trimmed! });
            await itemService.createWithId(ctx.itemContext, newId, newNodeData as Omit<Item, 'id' | 'createdAt' | 'updatedAt'>);
            ctx.setSelectedNodeId(newId);
          },
        });
      }
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRoot || readOnly) return;
    const nodeId = node.id;
    const parentId = node.parentId;

    if (ctx.itemContext === 'mindmap') {
      const descendantIds = treeService.getDescendantIds(nodeId, nodes);
      const deletedIds = [nodeId, ...descendantIds];
      const deletedNodes = nodes.filter((n) => deletedIds.includes(n.id));
      await treeService.deleteNode(nodeId, nodes, 'cascade');
      useUndoStore.getState().push({
        description: 'Delete node',
        undo: async () => {
          await treeService.recreateNodes(deletedNodes);
          ctx.setSelectedNodeId(nodeId);
        },
        redo: async () => {
          await Promise.all(deletedIds.map((id) => itemService.delete(ctx.itemContext, id)));
          if (parentId) ctx.setSelectedNodeId(parentId);
        },
      });
    } else {
      const descendantIds = treeService.getDescendantIds(nodeId, nodes);
      await Promise.all([nodeId, ...descendantIds].map((id) => itemService.delete(ctx.itemContext, id)));
      if (parentId) ctx.setSelectedNodeId(parentId);
    }
  };

  const handleClick = () => ctx.setSelectedNodeId(node.id);
  const handleDoubleClick = () => {
    if (readOnly) return;
    ctx.setEditingNodeId(node.id);
    setEditTitle(node.title);
  };

  return (
    <div
      data-mindmap-node
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onPointerDown={(e) => {
        if (e.button === 0 && onDragStart) onDragStart(node.id, e);
      }}
      className={`group relative flex items-center h-full px-3 rounded-lg border border-l-4 transition-all duration-200 cursor-pointer select-none
        ${priorityBorderColors[node.priority]}
        ${node.completed ? 'opacity-60 bg-gray-50' : 'bg-white'}
        ${isDropTarget ? 'ring-2 ring-green-400 ring-offset-2 shadow-lg shadow-green-100 bg-green-50/50' : ''}
        ${isSelected && !isDropTarget ? 'ring-2 ring-blue-500 ring-offset-1 shadow-md' : ''}
        ${!isSelected && !isDropTarget ? 'border-gray-200 hover:shadow-md' : ''}
      `}
    >
      {hasChildren ? (
        <button
          onClick={(e) => { e.stopPropagation(); ctx.toggleNodeExpanded(node.id); }}
          className="flex-shrink-0 w-4 h-4 mr-1 text-gray-400 hover:text-gray-600"
        >
          {isCollapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
        </button>
      ) : (
        <div className="w-4 mr-1 flex-shrink-0" />
      )}

      <button onClick={handleToggleComplete} className="flex-shrink-0 mr-2">
        {node.completed
          ? <CheckCircleSolidIcon className="w-5 h-5 text-green-500" />
          : <CheckCircleIcon className="w-5 h-5 text-gray-400 hover:text-green-500 transition-colors" />}
      </button>

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
        <span className={`flex-1 min-w-0 text-sm truncate ${node.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
          {node.title}
        </span>
      )}

      {!readOnly && (
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
      )}
    </div>
  );
};

export default MindmapNodeComponent;
