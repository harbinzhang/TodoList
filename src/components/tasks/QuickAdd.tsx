import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { PlusIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useQuickAdd } from '../../hooks/useQuickAdd';
import { useAppData } from '../../hooks/useAppData';
import {
  MetadataChip,
  DateEditor,
  PriorityEditor,
  ProjectEditor,
  PRIORITY_CONFIG,
} from './MetadataChip';
import type { ParsedToken } from '../../utils/taskParser';

// ──────────── Types ────────────

interface QuickAddProps {
  variant: 'inline' | 'modal';
  onClose?: () => void;
  sectionId?: string;
}

type ActiveEditor = 'date' | 'priority' | 'project' | null;

// ──────────── Highlighted Input Overlay ────────────

function HighlightedInput({
  value,
  tokens,
  placeholder,
  onChange,
  onKeyDown,
  inputRef,
}: {
  value: string;
  tokens: ParsedToken[];
  placeholder: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const segments = buildSegments(value, tokens);

  return (
    <div className="relative w-full">
      {/* Mirror layer (non-interactive, shows colors) */}
      <div
        className="absolute inset-0 pointer-events-none flex items-center text-sm font-medium whitespace-pre overflow-hidden"
        aria-hidden="true"
      >
        {segments.map((seg, i) => (
          <span
            key={i}
            className={
              seg.isParsed
                ? 'text-gray-400 dark:text-gray-500'
                : 'text-gray-900 dark:text-white'
            }
          >
            {seg.text}
          </span>
        ))}
      </div>
      {/* Real input (transparent text, captures events) */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full text-sm font-medium border-none outline-none bg-transparent placeholder-gray-400 dark:placeholder-gray-500 caret-gray-900 dark:caret-white"
        style={{ color: 'transparent', WebkitTextFillColor: 'transparent' }}
        autoFocus
        autoComplete="off"
      />
    </div>
  );
}

function buildSegments(text: string, tokens: ParsedToken[]) {
  if (tokens.length === 0) return [{ text, isParsed: false }];

  const sorted = [...tokens].sort((a, b) => a.start - b.start);
  const segments: { text: string; isParsed: boolean }[] = [];
  let cursor = 0;

  for (const token of sorted) {
    if (token.start > cursor) {
      segments.push({ text: text.slice(cursor, token.start), isParsed: false });
    }
    segments.push({ text: text.slice(token.start, token.end), isParsed: true });
    cursor = token.end;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), isParsed: false });
  }

  return segments;
}

// ──────────── QuickAdd Component ────────────

export default function QuickAdd({ variant, onClose, sectionId: _sectionId }: QuickAddProps) {
  const {
    inputText,
    setInputText,
    parsed,
    loading,
    canSubmit,
    dueDate,
    priority,
    projectId,
    labelIds,
    submit,
    cancel,
    setOverrideDueDate,
    setOverridePriority,
    setOverrideProjectId,
    setOverrideLabelIds,
  } = useQuickAdd({
    onSubmit: () => {
      // In inline mode, stay open for rapid entry
      if (variant === 'modal') onClose?.();
    },
    onCancel: () => onClose?.(),
  });

  // Suppress unused variable lint — sectionId reserved for future use
  void _sectionId;

  const { projects, labels } = useAppData();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeEditor, setActiveEditor] = useState<ActiveEditor>(null);

  // Close editor when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveEditor(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSubmit) submit();
    } else if (e.key === 'Escape') {
      cancel();
      onClose?.();
    }
  };

  // Chip data
  const projectName = projects.find((p) => p.id === projectId)?.name;
  const labelNames = labelIds
    ?.map((id) => labels.find((l) => l.id === id))
    .filter(Boolean);

  const hasChips = dueDate || (priority && priority < 4) || projectId || (labelIds && labelIds.length > 0);

  const content = (
    <div
      ref={containerRef}
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-visible ${
        variant === 'modal' ? 'w-full max-w-xl' : ''
      }`}
    >
      {/* Input Area */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <SparklesIcon className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <HighlightedInput
              value={inputText}
              tokens={parsed.parsedTokens}
              placeholder='Try: "Buy groceries tomorrow p2 #Personal"'
              onChange={setInputText}
              onKeyDown={handleKeyDown}
              inputRef={inputRef}
            />
          </div>
        </div>
      </div>

      {/* Chip Bar */}
      <AnimatePresence>
        {(hasChips || inputText.trim()) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-100 dark:border-gray-700 overflow-visible"
          >
            <div className="px-4 py-2 flex flex-wrap items-center gap-2 relative">
              <AnimatePresence mode="popLayout">
                {/* Date chip */}
                {dueDate && (
                  <div key="date-chip" className="relative">
                    <MetadataChip
                      type="date"
                      value={format(dueDate, 'MMM d, h:mm a')}
                      color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                      onRemove={() => setOverrideDueDate(null)}
                      onClick={() => setActiveEditor(activeEditor === 'date' ? null : 'date')}
                    />
                    <AnimatePresence>
                      {activeEditor === 'date' && (
                        <DateEditor
                          value={dueDate}
                          onChange={(d) => {
                            if (d) setOverrideDueDate(d);
                          }}
                          onClose={() => setActiveEditor(null)}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Priority chip (only show if not P4) */}
                {priority && priority < 4 && (
                  <div key="priority-chip" className="relative">
                    <MetadataChip
                      type="priority"
                      value={PRIORITY_CONFIG[priority].label}
                      color={PRIORITY_CONFIG[priority].color}
                      onRemove={() => setOverridePriority(null)}
                      onClick={() => setActiveEditor(activeEditor === 'priority' ? null : 'priority')}
                    />
                    <AnimatePresence>
                      {activeEditor === 'priority' && (
                        <PriorityEditor
                          value={priority}
                          onChange={setOverridePriority}
                          onClose={() => setActiveEditor(null)}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Project chip */}
                {projectId && projectName && (
                  <div key="project-chip" className="relative">
                    <MetadataChip
                      type="project"
                      value={projectName}
                      color="bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300"
                      onRemove={() => setOverrideProjectId(null)}
                      onClick={() => setActiveEditor(activeEditor === 'project' ? null : 'project')}
                    />
                    <AnimatePresence>
                      {activeEditor === 'project' && (
                        <ProjectEditor
                          value={projectId}
                          onChange={setOverrideProjectId}
                          onClose={() => setActiveEditor(null)}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Label chips */}
                {labelNames?.map((label) =>
                  label ? (
                    <MetadataChip
                      key={`label-${label.id}`}
                      type="label"
                      value={label.name}
                      color="bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300"
                      onRemove={() => {
                        const remaining = labelIds?.filter((id) => id !== label.id) ?? [];
                        setOverrideLabelIds(remaining.length > 0 ? remaining : null);
                      }}
                    />
                  ) : null,
                )}
              </AnimatePresence>

              {/* Add metadata button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    if (!dueDate) setActiveEditor('date');
                    else if (!priority || priority === 4) setActiveEditor('priority');
                    else if (!projectId) setActiveEditor('project');
                  }}
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Add metadata"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty title warning */}
      <AnimatePresence>
        {inputText.trim() && !parsed.cleanTitle.trim() && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 pb-2"
          >
            <span className="text-xs text-amber-600 dark:text-amber-400">
              Task name required — add some text before the metadata
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="px-4 py-3 flex items-center justify-end gap-2 border-t border-gray-100 dark:border-gray-700">
        <button
          type="button"
          onClick={() => {
            cancel();
            onClose?.();
          }}
          className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="px-3 py-1.5 text-sm text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
        >
          {loading ? 'Adding...' : 'Add task'}
        </button>
      </div>
    </div>
  );

  if (variant === 'modal') {
    return (
      <motion.div
        className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => {
            cancel();
            onClose?.();
          }}
        />
        {/* Modal content */}
        <motion.div
          className="relative z-10 w-full max-w-xl mx-4"
          initial={{ opacity: 0, y: -20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.97 }}
          transition={{ duration: 0.2 }}
        >
          {content}
        </motion.div>
      </motion.div>
    );
  }

  return content;
}
