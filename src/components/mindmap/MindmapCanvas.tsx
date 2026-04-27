import { useRef } from 'react';
import { useMindmapStore } from '../../store/mindmapStore';
import { useAuthStore } from '../../store/authStore';
import { useMindmapKeyboard } from './hooks/useMindmapKeyboard';
import TreeRenderer from './TreeRenderer';

const MindmapCanvas = () => {
  const {
    nodes, collapsedNodeIds, currentMindmapId,
    selectedNodeId, editingNodeId,
    setSelectedNodeId, setEditingNode, toggleNodeExpanded,
  } = useMindmapStore();
  const { user } = useAuthStore();
  const containerRef = useRef<HTMLDivElement>(null);
  useMindmapKeyboard(containerRef);

  if (!currentMindmapId || !user) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <p>No nodes yet. Loading...</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 flex flex-col overflow-hidden outline-none" tabIndex={-1}>
      <TreeRenderer
        items={nodes}
        itemContext="mindmap"
        contextId={currentMindmapId}
        userId={user.uid}
        autoFitKey={currentMindmapId}
        selectedNodeId={selectedNodeId}
        editingNodeId={editingNodeId}
        collapsedNodeIds={collapsedNodeIds}
        onSelectNode={setSelectedNodeId}
        onEditNode={setEditingNode}
        onToggleExpand={toggleNodeExpanded}
      />
    </div>
  );
};

export default MindmapCanvas;
