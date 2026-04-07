import { useState, useRef, useEffect } from 'react';
import {
  ChevronRightIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';
import { useDraggable } from '@dnd-kit/core';

interface ColumnHeaderProps {
  title: string;
  color: string;
  taskCount: number;
  wipLimit?: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSetWipLimit: () => void;
  onRename?: (newName: string) => void;
  dragColumnId?: string;
}

const ColumnHeader = ({
  title,
  color,
  taskCount,
  wipLimit,
  isCollapsed,
  onToggleCollapse,
  onSetWipLimit,
  onRename,
  dragColumnId,
}: ColumnHeaderProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [editName, setEditName] = useState(title);
  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Column draggable — only when dragColumnId is provided
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragColumnId || '__disabled__',
    disabled: !dragColumnId,
  });

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  const handleSaveRename = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== title && onRename) {
      onRename(trimmed);
    } else {
      setEditName(title);
    }
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveRename();
    } else if (e.key === 'Escape') {
      setEditName(title);
      setIsRenaming(false);
    }
  };

  const isOverLimit = wipLimit !== undefined && taskCount > wipLimit;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  if (isCollapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="flex w-full flex-col items-center gap-2 py-3"
        title={`Expand ${title}`}
      >
        <ChevronRightIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        <span
          className="text-xs font-semibold tracking-wide"
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            color,
          }}
        >
          {title}
        </span>
        <span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
          {taskCount}
        </span>
      </button>
    );
  }

  return (
    <div
      ref={dragColumnId ? setNodeRef : undefined}
      className={`flex items-center justify-between rounded-t-lg px-3 py-2.5 ${dragColumnId ? 'cursor-grab active:cursor-grabbing' : ''} ${
        isOverLimit
          ? 'bg-amber-50 dark:bg-amber-900/20'
          : 'bg-gray-50 dark:bg-gray-800/50'
      }`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      {...(dragColumnId ? { ...attributes, ...listeners } : {})}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <button
          onClick={onToggleCollapse}
          className="flex-shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          title="Collapse column"
        >
          <ChevronRightIcon className="h-4 w-4 rotate-90 transform" />
        </button>
        <div
          className="h-3 w-3 flex-shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        {isRenaming ? (
          <input
            ref={renameInputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveRename}
            onKeyDown={handleRenameKeyDown}
            className="flex-1 min-w-0 text-sm font-semibold px-1 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        ) : (
          <h3
            className={`truncate text-sm font-semibold text-gray-800 dark:text-gray-100 ${onRename ? 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400' : ''}`}
            onClick={() => {
              if (onRename) {
                setEditName(title);
                setIsRenaming(true);
              }
            }}
          >
            {title}
          </h3>
        )}
      </div>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
        >
          <EllipsisHorizontalIcon className="h-5 w-5" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-40 mt-1 w-40 rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <button
              onClick={() => {
                setMenuOpen(false);
                onSetWipLimit();
              }}
              className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Set WIP limit
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ColumnHeader;
