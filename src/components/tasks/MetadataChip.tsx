import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  XMarkIcon,
  CalendarIcon,
  FlagIcon,
  FolderIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { useTaskStore } from '../../store/taskStore';

// ──────────── Types ────────────

type ChipType = 'date' | 'priority' | 'project' | 'label';

interface MetadataChipProps {
  type: ChipType;
  value: string; // display text
  color?: string; // tailwind bg color class
  onRemove: () => void;
  onClick?: () => void;
}

// ──────────── Priority config ────────────

const PRIORITY_CONFIG: Record<1 | 2 | 3 | 4, { label: string; color: string; dot: string }> = {
  1: { label: 'P1', color: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300', dot: '🔴' },
  2: { label: 'P2', color: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300', dot: '🟠' },
  3: { label: 'P3', color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300', dot: '🔵' },
  4: { label: 'P4', color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300', dot: '' },
};

// ──────────── Chip Component ────────────

function MetadataChip({ type, value, color, onRemove, onClick }: MetadataChipProps) {
  const icon = {
    date: <CalendarIcon className="w-3.5 h-3.5" />,
    priority: <FlagIcon className="w-3.5 h-3.5" />,
    project: <FolderIcon className="w-3.5 h-3.5" />,
    label: <TagIcon className="w-3.5 h-3.5" />,
  }[type];

  const baseColor = color || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';

  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.15 }}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer select-none ${baseColor}`}
      onClick={onClick}
    >
      {icon}
      <span>{value}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        aria-label={`Remove ${type}`}
      >
        <XMarkIcon className="w-3 h-3" />
      </button>
    </motion.span>
  );
}

// ──────────── Inline Editors ────────────

function DateEditor({ value, onChange, onClose }: {
  value?: Date;
  onChange: (date: Date | null) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const formatted = value ? format(value, 'yyyy-MM-dd') : '';
  const timeFormatted = value ? format(value, 'HH:mm') : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="absolute z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-3 flex flex-col gap-2"
    >
      <input
        ref={inputRef}
        type="date"
        value={formatted}
        onChange={(e) => {
          if (e.target.value) {
            const [y, m, d] = e.target.value.split('-').map(Number);
            const newDate = value ? new Date(value) : new Date();
            newDate.setFullYear(y, m - 1, d);
            onChange(newDate);
          }
        }}
        className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-700 dark:text-white"
      />
      <input
        type="time"
        value={timeFormatted}
        onChange={(e) => {
          if (e.target.value) {
            const [h, min] = e.target.value.split(':').map(Number);
            const newDate = value ? new Date(value) : new Date();
            newDate.setHours(h, min, 0, 0);
            onChange(newDate);
          }
        }}
        className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-700 dark:text-white"
      />
      <button
        type="button"
        onClick={onClose}
        className="text-xs text-blue-600 dark:text-blue-400 hover:underline self-end"
      >
        Done
      </button>
    </motion.div>
  );
}

function PriorityEditor({ value, onChange, onClose }: {
  value?: 1 | 2 | 3 | 4;
  onChange: (priority: 1 | 2 | 3 | 4 | null) => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="absolute z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-1 min-w-[120px]"
    >
      {([1, 2, 3, 4] as const).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => { onChange(p); onClose(); }}
          className={`w-full text-left px-3 py-1.5 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${value === p ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
        >
          <span>{PRIORITY_CONFIG[p].dot || '⚪'}</span>
          <span className="text-gray-700 dark:text-gray-300">Priority {p}</span>
        </button>
      ))}
    </motion.div>
  );
}

function ProjectEditor({ value, onChange, onClose }: {
  value?: string;
  onChange: (projectId: string | null) => void;
  onClose: () => void;
}) {
  const { projects } = useTaskStore();
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="absolute z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-1 min-w-[140px] max-h-48 overflow-y-auto"
    >
      <button
        type="button"
        onClick={() => { onChange(null); onClose(); }}
        className="w-full text-left px-3 py-1.5 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
      >
        No project
      </button>
      {projects.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => { onChange(p.id); onClose(); }}
          className={`w-full text-left px-3 py-1.5 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${value === p.id ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
        >
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-700 dark:text-gray-300">{p.name}</span>
        </button>
      ))}
    </motion.div>
  );
}

// ──────────── Exports ────────────

export { MetadataChip, DateEditor, PriorityEditor, ProjectEditor, PRIORITY_CONFIG };
export type { ChipType };
