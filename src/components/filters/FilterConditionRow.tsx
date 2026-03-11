import type { FilterCondition } from '../../types';
import { useTaskStore } from '../../store/taskStore';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface FilterConditionRowProps {
  condition: FilterCondition;
  index: number;
  onChange: (index: number, updated: FilterCondition) => void;
  onRemove: (index: number) => void;
}

const FIELD_OPTIONS: { value: FilterCondition['field']; label: string }[] = [
  { value: 'priority', label: 'Priority' },
  { value: 'dueDate', label: 'Due date' },
  { value: 'project', label: 'Project' },
  { value: 'label', label: 'Label' },
  { value: 'completed', label: 'Status' },
];

const OPERATORS_BY_FIELD: Record<FilterCondition['field'], { value: FilterCondition['operator']; label: string }[]> = {
  priority: [
    { value: 'is', label: 'is' },
    { value: 'isNot', label: 'is not' },
  ],
  dueDate: [
    { value: 'thisWeek', label: 'this week' },
    { value: 'next7Days', label: 'next 7 days' },
    { value: 'overdue', label: 'overdue' },
    { value: 'noDate', label: 'no date' },
    { value: 'hasDate', label: 'has date' },
    { value: 'before', label: 'before' },
    { value: 'after', label: 'after' },
  ],
  project: [
    { value: 'is', label: 'is' },
    { value: 'isNot', label: 'is not' },
  ],
  label: [
    { value: 'is', label: 'is' },
    { value: 'isNot', label: 'is not' },
  ],
  completed: [
    { value: 'is', label: 'is' },
    { value: 'isNot', label: 'is not' },
  ],
};

// Operators that don't need a value input
const NO_VALUE_OPERATORS = new Set(['thisWeek', 'next7Days', 'overdue', 'noDate', 'hasDate']);

const FilterConditionRow = ({
  condition,
  index,
  onChange,
  onRemove,
}: FilterConditionRowProps) => {
  const { projects, labels } = useTaskStore();

  const operators = OPERATORS_BY_FIELD[condition.field] || [];
  const needsValue = !NO_VALUE_OPERATORS.has(condition.operator);

  const handleFieldChange = (field: FilterCondition['field']) => {
    const newOps = OPERATORS_BY_FIELD[field];
    onChange(index, {
      field,
      operator: newOps[0]?.value || 'is',
      value: undefined,
    });
  };

  const handleOperatorChange = (operator: FilterCondition['operator']) => {
    onChange(index, { ...condition, operator, value: NO_VALUE_OPERATORS.has(operator) ? undefined : condition.value });
  };

  const handleValueChange = (value: string | number | boolean) => {
    onChange(index, { ...condition, value });
  };

  const renderValueInput = () => {
    if (!needsValue) return null;

    switch (condition.field) {
      case 'priority':
        return (
          <select
            value={String(condition.value || '')}
            onChange={(e) => handleValueChange(Number(e.target.value))}
            className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            <option value="1">P1 (Urgent)</option>
            <option value="2">P2 (High)</option>
            <option value="3">P3 (Medium)</option>
            <option value="4">P4 (Low)</option>
          </select>
        );
      case 'project':
        return (
          <select
            value={String(condition.value || '')}
            onChange={(e) => handleValueChange(e.target.value)}
            className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        );
      case 'label':
        return (
          <select
            value={String(condition.value || '')}
            onChange={(e) => handleValueChange(e.target.value)}
            className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            {labels.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        );
      case 'completed':
        return (
          <select
            value={String(condition.value ?? '')}
            onChange={(e) => handleValueChange(e.target.value === 'true')}
            className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            <option value="true">Completed</option>
            <option value="false">Active</option>
          </select>
        );
      case 'dueDate':
        if (condition.operator === 'before' || condition.operator === 'after') {
          return (
            <input
              type="date"
              value={String(condition.value || '')}
              onChange={(e) => handleValueChange(e.target.value)}
              className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          );
        }
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Field */}
      <select
        value={condition.field}
        onChange={(e) => handleFieldChange(e.target.value as FilterCondition['field'])}
        className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {FIELD_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {/* Operator */}
      <select
        value={condition.operator}
        onChange={(e) => handleOperatorChange(e.target.value as FilterCondition['operator'])}
        className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {operators.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {/* Value */}
      {renderValueInput()}

      {/* Remove */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

export default FilterConditionRow;
