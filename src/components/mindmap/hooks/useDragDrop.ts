import { useState, useCallback, useRef, type RefObject } from 'react';
import { useMindmapStore } from '../../../store/mindmapStore';
import { useUndoStore } from '../../../store/undoStore';
import { treeService } from '../../../services/treeService';
import type { Item } from '../../../types';
import type { LayoutNode } from './useTreeLayout';

const DRAG_THRESHOLD = 5;
const NODE_HEIGHT = 44;
const NODE_GAP_Y = 12;
// Fraction of node height used for sibling insertion zones (top/bottom)
const SIBLING_ZONE_RATIO = 0.25;

interface DragState {
  isDragging: boolean;
  dragNodeId: string;
  ghostX: number;
  ghostY: number;
  ghostTitle: string;
}

export type DropZone = 'child' | 'before' | 'after';

export interface DropIndicator {
  targetNodeId: string;
  zone: DropZone;
  // For 'before'/'after': the y-coordinate of the insertion line (SVG coords)
  // For 'child': not used
  insertionY: number;
  // x range for the insertion line
  insertionX: number;
  insertionWidth: number;
}

interface UseDragDropParams {
  layoutNodes: LayoutNode[];
  panX: number;
  panY: number;
  zoom: number;
  svgRef: RefObject<SVGSVGElement | null>;
  nodes: Item[];
  readOnly?: boolean;
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

/**
 * Enhanced hit-test that returns the target node and drop zone.
 *
 * For each visible node, the vertical area is split into 3 zones:
 *   top 25%   → 'before' (insert as sibling before this node)
 *   middle 50% → 'child'  (make child of this node)
 *   bottom 25% → 'after'  (insert as sibling after this node)
 *
 * The gap between sibling nodes (NODE_GAP_Y) is also checked and
 * attributed to the nearest sibling as 'after' (upper node) or
 * 'before' (lower node).
 *
 * Root nodes only support 'child' zone (cannot insert siblings of root).
 */
function hitTestWithZone(
  svgX: number,
  svgY: number,
  layoutNodes: LayoutNode[],
): { node: LayoutNode; zone: DropZone } | null {
  const siblingThreshold = NODE_HEIGHT * SIBLING_ZONE_RATIO; // 11px

  for (const ln of layoutNodes) {
    // Check within the node's bounding box (with extended gap area)
    const inX = svgX >= ln.x && svgX <= ln.x + ln.width;
    if (!inX) continue;

    const relY = svgY - ln.y;

    // Within node bounds
    if (relY >= 0 && relY <= ln.height) {
      const isRoot = ln.node.parentId == null;
      if (isRoot) {
        // Root only accepts 'child' drops
        return { node: ln, zone: 'child' };
      }
      if (relY < siblingThreshold) {
        return { node: ln, zone: 'before' };
      }
      if (relY > ln.height - siblingThreshold) {
        return { node: ln, zone: 'after' };
      }
      return { node: ln, zone: 'child' };
    }

    // Check gap below the node (up to NODE_GAP_Y / 2)
    if (relY > ln.height && relY <= ln.height + NODE_GAP_Y / 2) {
      if (ln.node.parentId != null) {
        return { node: ln, zone: 'after' };
      }
    }

    // Check gap above the node (up to NODE_GAP_Y / 2)
    if (relY < 0 && relY >= -(NODE_GAP_Y / 2)) {
      if (ln.node.parentId != null) {
        return { node: ln, zone: 'before' };
      }
    }
  }

  return null;
}

export function useDragDrop({ layoutNodes, panX, panY, zoom, svgRef, nodes, readOnly = false }: UseDragDropParams) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);

  const dragNodeIdRef = useRef<string | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const thresholdMet = useRef(false);
  const descendantIds = useRef<Set<string>>(new Set());

  const handleNodePointerDown = useCallback(
    (nodeId: string, e: React.PointerEvent) => {
      if (readOnly) return;
      const node = nodes.find((n) => n.id === nodeId);
      if (!node || node.parentId == null) return;
      const { editingNodeId } = useMindmapStore.getState();
      if (editingNodeId === nodeId) return;

      dragNodeIdRef.current = nodeId;
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      thresholdMet.current = false;
    },
    [nodes, readOnly]
  );

  const handleCanvasPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragNodeIdRef.current) return;

      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;

      if (!thresholdMet.current) {
        if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;

        thresholdMet.current = true;
        const nodeId = dragNodeIdRef.current;
        const layoutNode = layoutNodes.find((ln) => ln.id === nodeId);
        const title = layoutNode?.node.title ?? '';

        const descIds = treeService.getDescendantIds(nodeId, nodes);
        descendantIds.current = new Set(descIds);

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

      // Hit-test with zone detection
      const svgRect = svgRef.current?.getBoundingClientRect();
      if (!svgRect) return;
      const { svgX, svgY } = screenToSvg(e.clientX, e.clientY, svgRect, panX, panY, zoom);
      const hit = hitTestWithZone(svgX, svgY, layoutNodes);

      if (
        hit &&
        hit.node.id !== dragNodeIdRef.current &&
        !descendantIds.current.has(hit.node.id)
      ) {
        const ln = hit.node;
        const zone = hit.zone;

        if (zone === 'child') {
          setDropIndicator({
            targetNodeId: ln.id,
            zone: 'child',
            insertionY: 0,
            insertionX: 0,
            insertionWidth: 0,
          });
        } else {
          // 'before' or 'after' — compute insertion line position
          const insertionY = zone === 'before'
            ? ln.y - NODE_GAP_Y / 2
            : ln.y + ln.height + NODE_GAP_Y / 2;
          setDropIndicator({
            targetNodeId: ln.id,
            zone,
            insertionY,
            insertionX: ln.x,
            insertionWidth: ln.width,
          });
        }
      } else {
        setDropIndicator(null);
      }
    },
    [layoutNodes, panX, panY, zoom, svgRef, nodes]
  );

  const handleCanvasPointerUp = useCallback(
    async (e: React.PointerEvent) => {
      const nodeId = dragNodeIdRef.current;
      const wasDragging = thresholdMet.current;
      const currentIndicator = dropIndicator;

      if (wasDragging && svgRef.current) {
        svgRef.current.releasePointerCapture(e.pointerId);
      }

      // Reset all drag state
      dragNodeIdRef.current = null;
      thresholdMet.current = false;
      descendantIds.current = new Set();
      setDragState(null);
      setDropIndicator(null);

      if (!wasDragging || !nodeId || !currentIndicator) return;

      e.stopPropagation();

      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const oldParentId = node.parentId ?? null;
      const oldSortOrder = node.sortOrder ?? 0;

      const targetNode = nodes.find((n) => n.id === currentIndicator.targetNodeId);
      if (!targetNode) return;

      let newParentId: string | null;
      let newSortOrder: number;
      const affectedSiblings: Array<{ id: string; sortOrder: number }> = [];

      if (currentIndicator.zone === 'child') {
        // Make child of target — append as last child
        newParentId = targetNode.id;
        const targetChildren = nodes.filter(
          (n) => n.parentId === targetNode.id && n.id !== nodeId
        );
        newSortOrder = targetChildren.length > 0
          ? Math.max(...targetChildren.map((c) => c.sortOrder ?? 0)) + 1
          : 0;
      } else {
        // Insert as sibling — same parent as target
        newParentId = targetNode.parentId ?? null;
        const siblings = nodes
          .filter((n) => n.parentId === newParentId && n.id !== nodeId)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

        const targetIndex = siblings.findIndex((s) => s.id === targetNode.id);
        const insertIndex = currentIndicator.zone === 'before' ? targetIndex : targetIndex + 1;

        // Reassign sort orders: items before insertion keep their order,
        // items at and after insertion get shifted by 1
        for (let i = 0; i < siblings.length; i++) {
          const newOrder = i < insertIndex ? i : i + 1;
          if (newOrder !== (siblings[i].sortOrder ?? 0)) {
            affectedSiblings.push({ id: siblings[i].id, sortOrder: newOrder });
          }
        }
        newSortOrder = insertIndex;
      }

      await treeService.moveNode(nodeId, newParentId, newSortOrder, affectedSiblings);

      // Expand new parent if collapsed
      const { collapsedNodeIds, toggleNodeExpanded, setSelectedNodeId } =
        useMindmapStore.getState();
      if (newParentId && collapsedNodeIds.has(newParentId)) {
        toggleNodeExpanded(newParentId);
      }
      setSelectedNodeId(nodeId);

      // Undo/redo
      // For undo we need to restore old siblings' sort orders too
      const oldSiblings = nodes
        .filter((n) => n.parentId === newParentId && n.id !== nodeId)
        .map((n) => ({ id: n.id, sortOrder: n.sortOrder ?? 0 }));

      useUndoStore.getState().push({
        description: 'Move node',
        undo: async () => {
          await treeService.moveNode(nodeId, oldParentId, oldSortOrder, oldSiblings);
          useMindmapStore.getState().setSelectedNodeId(nodeId);
        },
        redo: async () => {
          await treeService.moveNode(nodeId, newParentId, newSortOrder, affectedSiblings);
          const state = useMindmapStore.getState();
          if (newParentId && state.collapsedNodeIds.has(newParentId)) {
            state.toggleNodeExpanded(newParentId);
          }
          state.setSelectedNodeId(nodeId);
        },
      });
    },
    [nodes, dropIndicator, svgRef]
  );

  return {
    dragState,
    dropIndicator,
    handleNodePointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
  };
}
