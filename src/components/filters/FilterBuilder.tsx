import { useMemo } from 'react';
import type { FilterCondition } from '../../types';
import { useAppData } from '../../hooks/useAppData';
import { getFilterMatchCount } from '../../utils/filterEngine';
import FilterConditionRow from './FilterConditionRow';
import { PlusIcon } from '@heroicons/react/24/outline';

interface FilterBuilderProps {
  conditions: FilterCondition[];
  onChange: (conditions: FilterCondition[]) => void;
}

const FilterBuilder = ({ conditions, onChange }: FilterBuilderProps) => {
  const { tasks, projects, labels } = useAppData();

  const matchCount = useMemo(
    () => getFilterMatchCount(tasks, conditions, { projects, labels }),
    [tasks, conditions, projects, labels]
  );

  const handleAddCondition = () => {
    const newCondition: FilterCondition = {
      field: 'priority',
      operator: 'is',
      value: undefined,
    };
    onChange([...conditions, newCondition]);
  };

  const handleUpdateCondition = (index: number, updated: FilterCondition) => {
    const newConditions = [...conditions];
    newConditions[index] = updated;
    onChange(newConditions);
  };

  const handleRemoveCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {/* Condition rows */}
      <div className="space-y-2">
        {conditions.map((condition, index) => (
          <FilterConditionRow
            key={index}
            condition={condition}
            index={index}
            onChange={handleUpdateCondition}
            onRemove={handleRemoveCondition}
          />
        ))}
      </div>

      {/* Add condition */}
      <button
        type="button"
        onClick={handleAddCondition}
        className="flex items-center space-x-1.5 text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 font-medium"
      >
        <PlusIcon className="w-3.5 h-3.5" />
        <span>Add condition</span>
      </button>

      {/* Live preview */}
      <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
        <span className="font-medium text-gray-700 dark:text-gray-300">{matchCount}</span>
        {' '}task{matchCount !== 1 ? 's' : ''} match{matchCount === 1 ? 'es' : ''}
      </div>
    </div>
  );
};

export default FilterBuilder;
