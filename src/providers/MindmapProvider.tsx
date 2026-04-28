import { useEffect, type ReactNode } from 'react';
import { mindmapService } from '../services/mindmapService';
import { useAuthSession } from './useAuthSession';
import { useMindmapStore } from '../store/mindmapStore';

export function MindmapProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthSession();
  const setMindmaps = useMindmapStore((state) => state.setMindmaps);
  const setNodes = useMindmapStore((state) => state.setNodes);
  const setCurrentMindmapId = useMindmapStore((state) => state.setCurrentMindmapId);
  const setSelectedNodeId = useMindmapStore((state) => state.setSelectedNodeId);
  const setEditingNode = useMindmapStore((state) => state.setEditingNode);

  useEffect(() => {
    if (!user?.uid) {
      setMindmaps([]);
      setNodes([]);
      setCurrentMindmapId(null);
      setSelectedNodeId(null);
      setEditingNode(null);
      return;
    }

    return mindmapService.subscribeToUserMindmaps(user.uid, setMindmaps);
  }, [setCurrentMindmapId, setEditingNode, setMindmaps, setNodes, setSelectedNodeId, user?.uid]);

  return <>{children}</>;
}
