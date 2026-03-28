import { useState, useCallback, useRef, type WheelEvent, type PointerEvent } from 'react';

interface PanZoomState {
  panX: number;
  panY: number;
  zoom: number;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const ZOOM_SENSITIVITY = 0.001;

export function usePanZoom(initialPanX = 60, initialPanY = 60) {
  const [state, setState] = useState<PanZoomState>({
    panX: initialPanX,
    panY: initialPanY,
    zoom: 1,
  });

  const isPanning = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  const handleWheel = useCallback((e: WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    setState((prev) => {
      const delta = -e.deltaY * ZOOM_SENSITIVITY;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.zoom + delta));
      const zoomRatio = newZoom / prev.zoom;

      const rect = (e.target as SVGSVGElement).closest('svg')?.getBoundingClientRect();
      if (!rect) return { ...prev, zoom: newZoom };

      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      return {
        zoom: newZoom,
        panX: cursorX - (cursorX - prev.panX) * zoomRatio,
        panY: cursorY - (cursorY - prev.panY) * zoomRatio,
      };
    });
  }, []);

  const handlePointerDown = useCallback((e: PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 && e.button !== 1) return;
    const target = e.target as Element;
    if (target.closest('[data-mindmap-node]')) return;

    isPanning.current = true;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent<SVGSVGElement>) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    setState((prev) => ({
      ...prev,
      panX: prev.panX + dx,
      panY: prev.panY + dy,
    }));
  }, []);

  const handlePointerUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const zoomIn = useCallback(() => {
    setState((prev) => ({
      ...prev,
      zoom: Math.min(MAX_ZOOM, prev.zoom + 0.15),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setState((prev) => ({
      ...prev,
      zoom: Math.max(MIN_ZOOM, prev.zoom - 0.15),
    }));
  }, []);

  const fitView = useCallback(
    (nodes: Array<{ x: number; y: number; width: number; height: number }>, containerWidth: number, containerHeight: number) => {
      if (nodes.length === 0) return;
      const padding = 60;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const n of nodes) {
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x + n.width);
        maxY = Math.max(maxY, n.y + n.height);
      }
      const contentW = maxX - minX;
      const contentH = maxY - minY;
      const scaleX = (containerWidth - padding * 2) / contentW;
      const scaleY = (containerHeight - padding * 2) / contentH;
      const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.min(scaleX, scaleY)));
      const panX = (containerWidth - contentW * zoom) / 2 - minX * zoom;
      const panY = (containerHeight - contentH * zoom) / 2 - minY * zoom;
      setState({ zoom, panX, panY });
    },
    []
  );

  return {
    ...state,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    zoomIn,
    zoomOut,
    fitView,
  };
}
