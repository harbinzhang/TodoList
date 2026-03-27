import { useEffect, useRef } from 'react';
import { useTaskStore } from '../../store/taskStore';
import { useMindmapStore } from '../../store/mindmapStore';
import { mindmapNodeService } from '../../services/mindmapNodeService';
import MindmapCanvas from './MindmapCanvas';

const MindmapView = () => {
  const { currentMindmapId } = useTaskStore();
  const { setNodes, setCurrentMindmapId, setLoading, loading } = useMindmapStore();
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Clean up previous subscription
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    if (!currentMindmapId) {
      setNodes([]);
      setCurrentMindmapId(null);
      return;
    }

    setCurrentMindmapId(currentMindmapId);
    setLoading(true);

    unsubRef.current = mindmapNodeService.subscribeToMindmapNodes(
      currentMindmapId,
      (nodes) => {
        setNodes(nodes);
        setLoading(false);
      }
    );

    return () => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [currentMindmapId, setNodes, setCurrentMindmapId, setLoading]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return <MindmapCanvas />;
};

export default MindmapView;
