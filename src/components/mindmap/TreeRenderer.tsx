import { useState, useRef, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { buildTree } from '../../utils/mindmapTree';
import { useTreeLayout } from './hooks/useTreeLayout';
import { usePanZoom } from './hooks/usePanZoom';
import { useDragDrop } from './hooks/useDragDrop';
import MindmapEdge from './MindmapEdge';
import MindmapNodeComponent from './MindmapNodeComponent';
import MindmapToolbar from './MindmapToolbar';
import TreeContext, { type TreeContextValue } from './TreeContext';
import { itemService } from '../../services/itemService';
import type { Item } from '../../types';
import type { ItemContext } from '../../services/itemService';

export interface TreeRendererProps {
  items: Item[];
  itemContext: ItemContext;
  contextId: string | null;
  userId: string;
  autoFitKey?: string;
  // Controlled-mode props — provide all or none
  selectedNodeId?: string | null;
  editingNodeId?: string | null;
  collapsedNodeIds?: Set<string>;
  onSelectNode?: (id: string | null) => void;
  onEditNode?: (id: string | null) => void;
  onToggleExpand?: (id: string) => void;
}

const TreeRenderer = ({
  items,
  itemContext,
  contextId,
  userId,
  autoFitKey,
  selectedNodeId: extSelected,
  editingNodeId: extEditing,
  collapsedNodeIds: extCollapsed,
  onSelectNode,
  onEditNode,
  onToggleExpand,
}: TreeRendererProps) => {
  const isControlled = extSelected !== undefined;

  const [localSelected, setLocalSelected] = useState<string | null>(null);
  const [localEditing, setLocalEditing] = useState<string | null>(null);
  const [localCollapsed, setLocalCollapsed] = useState(new Set<string>());

  const handleLocalToggle = useCallback((id: string) => {
    setLocalCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectedNodeId = isControlled ? (extSelected ?? null) : localSelected;
  const editingNodeId = isControlled ? (extEditing ?? null) : localEditing;
  const collapsedNodeIds = isControlled ? (extCollapsed ?? new Set<string>()) : localCollapsed;
  const setSelectedNodeId = isControlled ? (onSelectNode ?? (() => {})) : setLocalSelected;
  const setEditingNodeId = isControlled ? (onEditNode ?? (() => {})) : setLocalEditing;
  const toggleNodeExpanded = isControlled ? (onToggleExpand ?? (() => {})) : handleLocalToggle;

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const lastAutoFitKeyRef = useRef<string | null | undefined>(undefined);

  const handleAddChild = useCallback(async (parentId: string) => {
    const siblings = items.filter((n) => n.parentId === parentId);
    const maxSort = siblings.length > 0 ? Math.max(...siblings.map((s) => s.sortOrder ?? 0)) : -1;
    const newNodeData = {
      ...(itemContext === 'mindmap' && contextId ? { mindmapId: contextId } : {}),
      userId,
      parentId,
      sortOrder: maxSort + 1,
      title: 'New node',
      completed: false as const,
      priority: 4 as const,
    };
    const newId = await itemService.create(itemContext, newNodeData);
    if (collapsedNodeIds.has(parentId)) toggleNodeExpanded(parentId);
    setTimeout(() => {
      setSelectedNodeId(newId);
      setEditingNodeId(newId);
    }, 300);
  }, [items, itemContext, contextId, userId, collapsedNodeIds, toggleNodeExpanded, setSelectedNodeId, setEditingNodeId]);

  const tree = buildTree(items);
  const { nodes: layoutNodes, edges } = useTreeLayout(tree, collapsedNodeIds);
  const { panX, panY, zoom, handleWheel, handlePointerDown, handlePointerMove, handlePointerUp, zoomIn, zoomOut, fitView } = usePanZoom();
  const { dragState, dropIndicator, handleNodePointerDown, handleCanvasPointerMove, handleCanvasPointerUp } = useDragDrop({
    layoutNodes, panX, panY, zoom, svgRef, nodes: items,
  });

  const handleFitView = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    fitView(layoutNodes, rect.width, rect.height);
  }, [layoutNodes, fitView]);

  useEffect(() => {
    if (layoutNodes.length === 0 || !containerRef.current) return;
    if (lastAutoFitKeyRef.current === autoFitKey) return;
    lastAutoFitKeyRef.current = autoFitKey;
    requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      fitView(layoutNodes, rect.width, rect.height, 1.0);
    });
  }, [autoFitKey, layoutNodes, fitView]);

  useEffect(() => {
    if (!editingNodeId && containerRef.current) containerRef.current.focus();
  }, [editingNodeId]);

  const contextValue: TreeContextValue = {
    selectedNodeId,
    editingNodeId,
    collapsedNodeIds,
    nodes: items,
    setSelectedNodeId,
    setEditingNodeId,
    toggleNodeExpanded,
    itemContext,
    contextId,
    userId,
    onAddChild: handleAddChild,
  };

  if (!tree) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <p>No nodes yet. Add one to get started.</p>
      </div>
    );
  }

  return (
    <TreeContext.Provider value={contextValue}>
      <div ref={containerRef} className="flex-1 overflow-hidden bg-gray-50 relative outline-none" tabIndex={0}>
        <MindmapToolbar zoom={zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onFitView={handleFitView} />
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          className="select-none"
          style={{ cursor: dragState?.isDragging ? 'grabbing' : 'grab' }}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={(e) => { handleCanvasPointerMove(e); handlePointerMove(e); }}
          onPointerUp={(e) => { handleCanvasPointerUp(e); handlePointerUp(); }}
        >
          <g transform={`translate(${panX}, ${panY}) scale(${zoom})`}>
            {edges.map((edge) => <MindmapEdge key={edge.id} edge={edge} />)}
            <AnimatePresence>
              {layoutNodes.map((ln) => (
                <motion.g
                  key={ln.id}
                  initial={{ opacity: 0, x: ln.x, y: ln.y }}
                  animate={{ opacity: 1, x: ln.x, y: ln.y }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                  <foreignObject x={0} y={0} width={ln.width} height={ln.height} overflow="visible">
                    <MindmapNodeComponent
                      layoutNode={ln}
                      onAddChild={handleAddChild}
                      isDropTarget={dropIndicator?.targetNodeId === ln.id && dropIndicator.zone === 'child'}
                      onDragStart={handleNodePointerDown}
                    />
                  </foreignObject>
                </motion.g>
              ))}
            </AnimatePresence>
            {dropIndicator && dropIndicator.zone !== 'child' && (
              <motion.line
                x1={dropIndicator.insertionX} y1={dropIndicator.insertionY}
                x2={dropIndicator.insertionX + dropIndicator.insertionWidth} y2={dropIndicator.insertionY}
                stroke="#22c55e" strokeWidth={2} strokeDasharray="6,3"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}
              />
            )}
          </g>
        </svg>
        {dragState?.isDragging && (
          <div className="fixed pointer-events-none z-50" style={{ left: dragState.ghostX + 12, top: dragState.ghostY - 10 }}>
            <div className="px-3 py-2 bg-white/80 border border-blue-300 rounded-lg shadow-lg text-sm text-gray-700 max-w-[280px] truncate backdrop-blur-sm">
              {dragState.ghostTitle}
            </div>
          </div>
        )}
      </div>
    </TreeContext.Provider>
  );
};

export default TreeRenderer;
