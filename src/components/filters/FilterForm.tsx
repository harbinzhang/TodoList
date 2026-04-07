import { useState, useEffect } from 'react';
import type { FilterCondition, SavedFilter } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { filterService } from '../../services/filterService';
import { useAppData } from '../../hooks/useAppData';
import FilterBuilder from './FilterBuilder';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface FilterFormProps {
  isOpen: boolean;
  onClose: () => void;
  editFilter?: SavedFilter; // If provided, we're editing
}

const COLOR_PRESETS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316',
];

const FilterForm = ({ isOpen, onClose, editFilter }: FilterFormProps) => {
  const { user } = useAuthStore();
  const { savedFilters } = useAppData();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [conditions, setConditions] = useState<FilterCondition[]>([
    { field: 'priority', operator: 'is', value: undefined },
  ]);
  const [loading, setLoading] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (editFilter) {
      setName(editFilter.name);
      setColor(editFilter.color || '#3b82f6');
      setConditions(editFilter.conditions);
    } else {
      setName('');
      setColor('#3b82f6');
      setConditions([{ field: 'priority', operator: 'is', value: undefined }]);
    }
  }, [editFilter, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;

    setLoading(true);
    try {
      if (editFilter) {
        await filterService.updateFilter(editFilter.id, {
          name: name.trim(),
          color,
          conditions,
        });
      } else {
        await filterService.createFilter({
          name: name.trim(),
          color,
          conditions,
          userId: user.uid,
          sortOrder: savedFilters.length,
        });
      }
      onClose();
    } catch (error) {
      console.error('Error saving filter:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editFilter ? 'Edit Filter' : 'Create Filter'}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">
                Filter name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Urgent This Week"
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                autoFocus
              />
            </div>

            {/* Color */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">
                Color
              </label>
              <div className="flex space-x-2">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      color === c ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800 scale-110' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Conditions */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">
                Conditions
              </label>
              <FilterBuilder conditions={conditions} onChange={setConditions} />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || loading}
                className="px-3 py-1.5 text-sm text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded"
              >
                {loading ? 'Saving...' : editFilter ? 'Save changes' : 'Create filter'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default FilterForm;
