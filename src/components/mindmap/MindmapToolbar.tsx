import {
  PlusIcon,
  MinusIcon,
  ArrowsPointingOutIcon,
} from '@heroicons/react/24/outline';
import { useMindmapStore } from '../../store/mindmapStore';

interface MindmapToolbarProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
}

const MindmapToolbar = ({ zoom, onZoomIn, onZoomOut, onFitView }: MindmapToolbarProps) => {
  const { collapseAll, expandAll } = useMindmapStore();

  return (
    <div className="absolute top-4 left-4 z-10 flex items-center space-x-1 bg-white border border-gray-200 rounded-lg shadow-sm px-2 py-1.5">
      {/* Zoom controls */}
      <button
        onClick={onZoomIn}
        className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
        title="Zoom in"
      >
        <PlusIcon className="w-4 h-4" />
      </button>
      <span className="text-xs text-gray-500 w-10 text-center select-none">
        {Math.round(zoom * 100)}%
      </span>
      <button
        onClick={onZoomOut}
        className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
        title="Zoom out"
      >
        <MinusIcon className="w-4 h-4" />
      </button>

      <div className="w-px h-5 bg-gray-200 mx-1" />

      <button
        onClick={onFitView}
        className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
        title="Fit view"
      >
        <ArrowsPointingOutIcon className="w-4 h-4" />
      </button>

      <div className="w-px h-5 bg-gray-200 mx-1" />

      <button
        onClick={expandAll}
        className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
        title="Expand all"
      >
        Expand
      </button>
      <button
        onClick={collapseAll}
        className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
        title="Collapse all"
      >
        Collapse
      </button>
    </div>
  );
};

export default MindmapToolbar;
