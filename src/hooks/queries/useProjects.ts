import { useMemo } from 'react';
import type { Project } from '../../types';
import { projectService } from '../../services/projectService';
import { useAuthSession } from '../../providers/AuthProvider';
import { useRealtimeCollection } from './useRealtimeCollection';

export function useProjects() {
  const { user } = useAuthSession();
  const queryKey = useMemo(() => ['projects', user?.uid ?? 'anonymous'], [user?.uid]);

  const query = useRealtimeCollection<Project>({
    enabled: Boolean(user?.uid),
    queryKey,
    getInitial: () => projectService.getUserProjects(user!.uid),
    subscribe: (callback) => projectService.subscribeToUserProjects(user!.uid, callback),
  });

  return {
    ...query,
    projects: query.data ?? [],
  };
}
