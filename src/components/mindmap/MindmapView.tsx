import { useEffect, useRef } from 'react';
import { useTaskStore } from '../../store/taskStore';
import { useMindmapStore } from '../../store/mindmapStore';
import { useAuthStore } from '../../store/authStore';
import { itemService } from '../../services/itemService';
import MindmapCanvas from './MindmapCanvas';

const MindmapView = () => {
  const { currentMindmapId } = useTaskStore();
  const { setNodes, setCurrentMindmapId, setLoading, loading } = useMindmapStore();
  const { user } = useAuthStore();
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    if (!currentMindmapId || !user) {
      setNodes([]);
      setCurrentMindmapId(null);
      return;
    }

    setCurrentMindmapId(currentMindmapId);
    setLoading(true);

    unsubRef.current = itemService.subscribeToMindmapNodes(
      currentMindmapId,
      user.uid,
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
  }, [currentMindmapId, user, setNodes, setCurrentMindmapId, setLoading]);

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
