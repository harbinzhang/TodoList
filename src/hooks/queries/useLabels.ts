import { useMemo } from 'react';
import type { Label } from '../../types';
import { labelService } from '../../services/labelService';
import { useAuthSession } from '../../providers/useAuthSession';
import { useRealtimeCollection } from './useRealtimeCollection';

export function useLabels() {
  const { user } = useAuthSession();
  const queryKey = useMemo(() => ['labels', user?.uid ?? 'anonymous'], [user?.uid]);

  const query = useRealtimeCollection<Label>({
    enabled: Boolean(user?.uid),
    queryKey,
    getInitial: () => labelService.getUserLabels(user!.uid),
    subscribe: (callback) => labelService.subscribeToUserLabels(user!.uid, callback),
  });

  return {
    ...query,
    labels: query.data ?? [],
  };
}
