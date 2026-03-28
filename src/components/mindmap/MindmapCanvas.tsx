import { useRef, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMindmapStore } from '../../store/mindmapStore';
import { useAuthStore } from '../../store/authStore';
import { itemService } from '../../services/itemService';
import { buildTree } from '../../utils/mindmapTree';
import { useTreeLayout } from './hooks/useTreeLayout';
import { usePanZoom } from './hooks/usePanZoom';
import MindmapEdge from './MindmapEdge';
import MindmapNodeComponent from './MindmapNodeComponent';
import MindmapToolbar from './MindmapToolbar';
import { useMindmapKeyboard } from './hooks/useMindmapKeyboard';

const MindmapCanvas = () => {
  const { nodes, collapsedNodeIds, currentMindmapId, editingNodeId } = useMindmapStore();
  const { user } = useAuthStore();
  const containerRef = useRef<HTMLDivElement>(null);
  useMindmapKeyboard(containerRef);

  // Refocus container when editing ends so keyboard shortcuts keep working
  useEffect(() => {
    if (!editingNodeId && containerRef.current) {
      containerRef.current.focus();
    }
  }, [editingNodeId]);

  const tree = buildTree(nodes);
  const { nodes: layoutNodes, edges } = useTreeLayout(tree, collapsedNodeIds);

  const {
    panX, panY, zoom,
    handleWheel, handlePointerDown, handlePointerMove, handlePointerUp,
    zoomIn, zoomOut, fitView,
  } = usePanZoom();

  const handleFitView = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    fitView(layoutNodes, rect.width, rect.height);
  }, [layoutNodes, fitView]);

  const handleAddChild = useCallback(async (parentId: string) => {
    if (!currentMindmapId || !user) return;
    const siblings = nodes.filter((n) => n.parentId === parentId);
    const maxSort = siblings.length > 0
      ? Math.max(...siblings.map((s) => s.sortOrder ?? 0))
      : -1;

    const newId = await itemService.create('mindmap', {
      mindmapId: currentMindmapId,
      userId: user.uid,
      parentId,
      sortOrder: maxSort + 1,
      title: 'New node',
      completed: false,
      priority: 4,
    });

    // Expand parent if collapsed
    const { collapsedNodeIds, toggleNodeExpanded } = useMindmapStore.getState();
    if (collapsedNodeIds.has(parentId)) {
      toggleNodeExpanded(parentId);
    }

    // Start editing the new node after a brief delay for Firestore to sync
    setTimeout(() => {
      const { nodes: currentNodes } = useMindmapStore.getState();
      const newNode = currentNodes.find((n) => n.id === newId);
      if (newNode) {
        useMindmapStore.getState().setSelectedNodeId(newId);
        useMindmapStore.getState().setEditingNode(newId);
      }
    }, 300);
  }, [currentMindmapId, user, nodes]);

  if (!tree) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <p>No nodes yet. Loading...</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden bg-gray-50 relative outline-none" tabIndex={0}>
      <MindmapToolbar
        zoom={zoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFitView={handleFitView}
      />

      <svg
        width="100%"
        height="100%"
        className="select-none"
        style={{ cursor: 'grab' }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <g transform={`translate(${panX}, ${panY}) scale(${zoom})`}>
          {/* Edges */}
          {edges.map((edge) => (
            <MindmapEdge key={edge.id} edge={edge} />
          ))}

          {/* Nodes via foreignObject */}
          <AnimatePresence>
            {layoutNodes.map((ln) => (
              <motion.g
                key={ln.id}
                initial={{ opacity: 0, x: ln.x, y: ln.y }}
                animate={{ opacity: 1, x: ln.x, y: ln.y }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                <foreignObject
                  x={0}
                  y={0}
                  width={ln.width}
                  height={ln.height}
                  overflow="visible"
                >
                  <MindmapNodeComponent
                    layoutNode={ln}
                    onAddChild={handleAddChild}
                  />
                </foreignObject>
              </motion.g>
            ))}
          </AnimatePresence>
        </g>
      </svg>
    </div>
  );
};

export default MindmapCanvas;
