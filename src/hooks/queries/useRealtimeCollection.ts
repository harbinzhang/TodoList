import { useEffect } from 'react';
import { useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';

interface UseRealtimeCollectionOptions<T> {
  enabled: boolean;
  queryKey: QueryKey;
  getInitial: () => Promise<T[]>;
  subscribe: (callback: (items: T[]) => void) => () => void;
}

export function useRealtimeCollection<T>({
  enabled,
  queryKey,
  getInitial,
  subscribe,
}: UseRealtimeCollectionOptions<T>) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey,
    enabled,
    queryFn: getInitial,
    placeholderData: [],
  });

  useEffect(() => {
    if (!enabled) {
      queryClient.setQueryData(queryKey, []);
      return;
    }

    return subscribe((items) => {
      queryClient.setQueryData(queryKey, items);
    });
  }, [enabled, queryClient, queryKey, subscribe]);

  return query;
}
