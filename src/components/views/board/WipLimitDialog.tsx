import { useState } from 'react';

interface WipLimitDialogProps {
  columnId: string;
  currentLimit: number | undefined;
  onSave: (limit: number | undefined) => void;
  onClose: () => void;
}

const WipLimitDialog = ({
  columnId,
  currentLimit,
  onSave,
  onClose,
}: WipLimitDialogProps) => {
  void columnId;
  const [value, setValue] = useState<string>(
    currentLimit !== undefined ? String(currentLimit) : ''
  );

  const handleSave = () => {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed > 0) {
      onSave(parsed);
    }
    onClose();
  };

  const handleRemove = () => {
    onSave(undefined);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
        WIP Limit
      </p>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="e.g. 5"
        autoFocus
        className="mb-2 w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
      />
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={handleRemove}
          className="text-xs text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
        >
          Remove limit
        </button>
        <div className="flex gap-1.5">
          <button
            onClick={onClose}
            className="rounded-md px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default WipLimitDialog;
