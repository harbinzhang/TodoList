import { useMemo } from 'react';
import type { Section } from '../../types';
import { sectionService } from '../../services/sectionService';
import { useAuthSession } from '../../providers/useAuthSession';
import { useRealtimeCollection } from './useRealtimeCollection';

export function useSections() {
  const { user } = useAuthSession();
  const queryKey = useMemo(() => ['sections', user?.uid ?? 'anonymous'], [user?.uid]);

  const query = useRealtimeCollection<Section>({
    enabled: Boolean(user?.uid),
    queryKey,
    getInitial: () => sectionService.getUserSections(user!.uid),
    subscribe: (callback) => sectionService.subscribeToUserSections(user!.uid, callback),
  });

  return {
    ...query,
    sections: query.data ?? [],
  };
}
