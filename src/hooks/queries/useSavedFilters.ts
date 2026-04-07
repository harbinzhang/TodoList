import { useMemo } from 'react';
import type { SavedFilter } from '../../types';
import { filterService } from '../../services/filterService';
import { useAuthSession } from '../../providers/AuthProvider';
import { useRealtimeCollection } from './useRealtimeCollection';

export function useSavedFilters() {
  const { user } = useAuthSession();
  const queryKey = useMemo(() => ['savedFilters', user?.uid ?? 'anonymous'], [user?.uid]);

  const query = useRealtimeCollection<SavedFilter>({
    enabled: Boolean(user?.uid),
    queryKey,
    getInitial: () => filterService.getUserFilters(user!.uid),
    subscribe: (callback) => filterService.subscribeToUserFilters(user!.uid, callback),
  });

  return {
    ...query,
    savedFilters: query.data ?? [],
  };
}
