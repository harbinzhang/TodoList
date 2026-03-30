import { useState, useCallback, useRef, type RefObject } from 'react';
import { useMindmapStore } from '../../../store/mindmapStore';
import { useUndoStore } from '../../../store/undoStore';
import { treeService } from '../../../services/treeService';
import type { Item } from '../../../types';
import type { LayoutNode } from './useTreeLayout';

const DRAG_THRESHOLD = 5;

interface DragState {
  isDragging: boolean;
  dragNodeId: string;
  ghostX: number;
  ghostY: number;
  ghostTitle: string;
}

interface UseDragDropParams {
  layoutNodes: LayoutNode[];
  panX: number;
  panY: number;
  zoom: number;
  svgRef: RefObject<SVGSVGElement | null>;
  nodes: Item[];
}

function screenToSvg(
  clientX: number,
  clientY: number,
  svgRect: DOMRect,
  panX: number,
  panY: number,
  zoom: number
) {
  return {
    svgX: (clientX - svgRect.left - panX) / zoom,
    svgY: (clientY - svgRect.top - panY) / zoom,
  };
}

function hitTest(svgX: number, svgY: number, layoutNodes: LayoutNode[]): LayoutNode | null {
  for (const ln of layoutNodes) {
    if (svgX >= ln.x && svgX <= ln.x + ln.width && svgY >= ln.y && svgY <= ln.y + ln.height) {
      return ln;
    }
  }
  return null;
}

export function useDragDrop({ layoutNodes, panX, panY, zoom, svgRef, nodes }: UseDragDropParams) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const dragNodeIdRef = useRef<string | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const thresholdMet = useRef(false);
  const descendantIds = useRef<Set<string>>(new Set());

  const handleNodePointerDown = useCallback(
    (nodeId: string, e: React.PointerEvent) => {
      // Don't drag root nodes or nodes being edited
      const node = nodes.find((n) => n.id === nodeId);
      if (!node || node.parentId == null) return;
      const { editingNodeId } = useMindmapStore.getState();
      if (editingNodeId === nodeId) return;

      dragNodeIdRef.current = nodeId;
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      thresholdMet.current = false;
    },
    [nodes]
  );

  const handleCanvasPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragNodeIdRef.current) return;

      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;

      if (!thresholdMet.current) {
        if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;

        // Threshold met — start dragging
        thresholdMet.current = true;
        const nodeId = dragNodeIdRef.current;
        const layoutNode = layoutNodes.find((ln) => ln.id === nodeId);
        const title = layoutNode?.node.title ?? '';

        // Precompute descendants for validation
        const descIds = treeService.getDescendantIds(nodeId, nodes);
        descendantIds.current = new Set(descIds);

        // Capture pointer on SVG for smooth dragging
        if (svgRef.current) {
          svgRef.current.setPointerCapture(e.pointerId);
        }

        setDragState({
          isDragging: true,
          dragNodeId: nodeId,
          ghostX: e.clientX,
          ghostY: e.clientY,
          ghostTitle: title,
        });
        return;
      }

      // Update ghost position
      setDragState((prev) =>
        prev ? { ...prev, ghostX: e.clientX, ghostY: e.clientY } : prev
      );

      // Hit-test for drop target
      const svgRect = svgRef.current?.getBoundingClientRect();
      if (!svgRect) return;
      const { svgX, svgY } = screenToSvg(e.clientX, e.clientY, svgRect, panX, panY, zoom);
      const hit = hitTest(svgX, svgY, layoutNodes);

      if (
        hit &&
        hit.id !== dragNodeIdRef.current &&
        !descendantIds.current.has(hit.id)
      ) {
        setDropTargetId(hit.id);
      } else {
        setDropTargetId(null);
      }
    },
    [layoutNodes, panX, panY, zoom, svgRef, nodes]
  );

  const handleCanvasPointerUp = useCallback(
    async (e: React.PointerEvent) => {
      const nodeId = dragNodeIdRef.current;
      const wasDragging = thresholdMet.current;
      const currentDropTarget = dropTargetId;

      // Release pointer capture
      if (wasDragging && svgRef.current) {
        svgRef.current.releasePointerCapture(e.pointerId);
      }

      // Reset all drag state
      dragNodeIdRef.current = null;
      thresholdMet.current = false;
      descendantIds.current = new Set();
      setDragState(null);
      setDropTargetId(null);

      if (!wasDragging || !nodeId || !currentDropTarget) return;

      // Prevent click from firing after a drag
      e.stopPropagation();

      // Execute reparent
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const oldParentId = node.parentId ?? null;
      const oldSortOrder = node.sortOrder ?? 0;

      // Compute new sort order (append as last child)
      const targetChildren = nodes.filter((n) => n.parentId === currentDropTarget);
      const newSortOrder =
        targetChildren.length > 0
          ? Math.max(...targetChildren.map((c) => c.sortOrder ?? 0)) + 1
          : 0;

      await treeService.moveNode(nodeId, currentDropTarget, newSortOrder, []);

      // Expand new parent if collapsed
      const { collapsedNodeIds, toggleNodeExpanded, setSelectedNodeId } =
        useMindmapStore.getState();
      if (collapsedNodeIds.has(currentDropTarget)) {
        toggleNodeExpanded(currentDropTarget);
      }
      setSelectedNodeId(nodeId);

      // Undo/redo
      useUndoStore.getState().push({
        description: 'Move node',
        undo: async () => {
          await treeService.moveNode(nodeId, oldParentId, oldSortOrder, []);
          useMindmapStore.getState().setSelectedNodeId(nodeId);
        },
        redo: async () => {
          await treeService.moveNode(nodeId, currentDropTarget, newSortOrder, []);
          const state = useMindmapStore.getState();
          if (state.collapsedNodeIds.has(currentDropTarget)) {
            state.toggleNodeExpanded(currentDropTarget);
          }
          state.setSelectedNodeId(nodeId);
        },
      });
    },
    [nodes, dropTargetId, svgRef]
  );

  return {
    dragState,
    dropTargetId,
    handleNodePointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
  };
}
