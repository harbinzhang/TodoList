import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UndoQueueItem } from '../../hooks/useUndoQueue';

interface UndoToastProps {
  items: UndoQueueItem[];
  onUndo: (taskId: string) => void;
  onDismiss: (taskId: string) => void;
}

const TOAST_DURATION = 5000; // ms

const UndoToast = ({ items, onUndo, onDismiss }: UndoToastProps) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] space-y-2 pointer-events-none">
      <AnimatePresence>
        {items.map((item) => (
          <UndoToastItem
            key={item.taskId}
            item={item}
            onUndo={() => onUndo(item.taskId)}
            onDismiss={() => onDismiss(item.taskId)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

function UndoToastItem({
  item,
  onUndo,
  onDismiss,
}: {
  item: UndoQueueItem;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / TOAST_DURATION) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onDismiss();
      }
    }, 50);
    return () => clearInterval(interval);
  }, [item.taskId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="pointer-events-auto bg-gray-900 dark:bg-gray-700 text-white rounded-lg shadow-2xl px-4 py-3 min-w-[320px] max-w-md"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-green-400">✓</span>
          <span className="text-sm font-medium truncate max-w-[200px]">
            {item.taskTitle}
          </span>
          <span className="text-sm text-gray-400">completed</span>
        </div>
        <button
          onClick={onUndo}
          className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors ml-3"
        >
          Undo
        </button>
      </div>
      {/* Timer bar */}
      <div className="mt-2 h-0.5 bg-gray-700 dark:bg-gray-600 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-blue-400 rounded-full"
          initial={{ width: '100%' }}
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
}

export default UndoToast;
