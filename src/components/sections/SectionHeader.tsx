import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { sectionService } from '../../services/sectionService';
import { useConfirmationDialog } from '../../providers/ConfirmationDialogProvider';
import { useToast } from '../../providers/ToastProvider';

interface SectionHeaderProps {
  sectionId: string;
  name: string;
  projectId: string;
  userId: string;
  completedCount: number;
  totalCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const SectionHeader = ({
  sectionId,
  name,
  projectId,
  userId,
  completedCount,
  totalCount,
  isCollapsed,
  onToggleCollapse,
}: SectionHeaderProps) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [editName, setEditName] = useState(name);
  const { confirm } = useConfirmationDialog();
  const { toast } = useToast();

  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleSaveRename = async () => {
    if (editName.trim() && editName.trim() !== name) {
      try {
        await sectionService.updateSection(sectionId, { name: editName.trim() });
      } catch (error) {
        console.error('Error renaming section:', error);
        toast({
          title: 'Could not rename section',
          description: 'The latest section name was not saved.',
          tone: 'error',
        });
        setEditName(name);
      }
    } else {
      setEditName(name);
    }
    setIsRenaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveRename();
    } else if (e.key === 'Escape') {
      setEditName(name);
      setIsRenaming(false);
    }
  };

  const handleDelete = async () => {
    const shouldDelete = await confirm({
      title: `Delete section "${name}"?`,
      message: 'Tasks in this section will be moved to "No section".',
      confirmLabel: 'Delete section',
      cancelLabel: 'Keep section',
      tone: 'danger',
    });

    if (!shouldDelete) {
      return;
    }

    try {
      await sectionService.deleteSection(sectionId, projectId, userId);
      toast({
        title: 'Section deleted',
        description: 'Tasks were moved to "No section".',
        tone: 'success',
      });
    } catch (error) {
      console.error('Error deleting section:', error);
      toast({
        title: 'Could not delete section',
        description: 'Please try again.',
        tone: 'error',
      });
    }
  };

  return (
    <div className="group/section">
      <div className="flex items-center space-x-2 py-2 px-1">
        <button
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? `Expand section ${name}` : `Collapse section ${name}`}
          className="flex-shrink-0 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          {isCollapsed ? (
            <ChevronRightIcon className="w-4 h-4" />
          ) : (
            <ChevronDownIcon className="w-4 h-4" />
          )}
        </button>

        {isRenaming ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveRename}
            onKeyDown={handleKeyDown}
            className="flex-1 text-sm font-semibold px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            autoFocus
          />
        ) : (
          <h4
            className="flex-1 text-sm font-semibold text-gray-700 dark:text-gray-200 cursor-pointer hover:text-gray-900 dark:hover:text-white"
            onClick={() => setIsRenaming(true)}
          >
            {name}
          </h4>
        )}

        <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
          {completedCount}/{totalCount}
        </span>

        <div className="opacity-0 group-hover/section:opacity-100 transition-opacity flex items-center space-x-1">
          <button
            onClick={() => setIsRenaming(true)}
            aria-label={`Rename section ${name}`}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
          >
            <PencilIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            aria-label={`Delete section ${name}`}
            className="p-1 text-gray-400 hover:text-red-500 rounded"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="ml-6 h-0.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default SectionHeader;
