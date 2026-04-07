import { createContext } from 'react';
import type { UndoQueueItem } from '../hooks/useUndoQueue';
import type { Task } from '../types';

interface UndoQueueContextType {
  enqueue: (task: Task) => void;
  pendingItems: UndoQueueItem[];
}

export const UndoQueueContext = createContext<UndoQueueContextType>({
  enqueue: () => {},
  pendingItems: [],
});
