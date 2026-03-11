import { useState, useRef, useEffect } from 'react';
import type { RecurrenceRule } from '../../types';
import {
  createPresetRule,
  createWeekdayPreset,
  formatRecurrenceLabel,
} from '../../utils/recurrence';
import { ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface RecurrencePickerProps {
  value?: RecurrenceRule;
  onChange: (rule: RecurrenceRule | undefined) => void;
}

const PRESETS = [
  { label: 'Daily', key: 'daily' as const },
  { label: 'Weekdays', key: 'weekdays' as const },
  { label: 'Weekly', key: 'weekly' as const },
  { label: 'Monthly', key: 'monthly' as const },
  { label: 'Yearly', key: 'yearly' as const },
] as const;

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_FULL_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const RecurrencePicker = ({ value, onChange }: RecurrencePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customFreq, setCustomFreq] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('weekly');
  const [customInterval, setCustomInterval] = useState(1);
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [endType, setEndType] = useState<'never' | 'date' | 'count'>('never');
  const [endDateStr, setEndDateStr] = useState('');
  const [endCount, setEndCount] = useState(5);

  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const handlePreset = (key: typeof PRESETS[number]['key']) => {
    if (key === 'weekdays') {
      onChange(createWeekdayPreset());
    } else {
      onChange(createPresetRule(key));
    }
    setIsOpen(false);
    setShowCustom(false);
  };

  const handleCustomApply = () => {
    const rule: RecurrenceRule = {
      frequency: customFreq,
      interval: customInterval,
    };
    if (customFreq === 'weekly' && customDays.length > 0) {
      rule.daysOfWeek = customDays;
    }
    if (endType === 'date' && endDateStr) {
      rule.endDate = new Date(endDateStr + 'T00:00:00');
    }
    if (endType === 'count') {
      rule.endAfterCount = endCount;
    }
    onChange(rule);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
    setIsOpen(false);
    setShowCustom(false);
  };

  const toggleDay = (day: number) => {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-1 px-2 py-1 rounded border text-xs transition-colors ${
          value
            ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
            : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
        title="Set recurrence"
      >
        <ArrowPathIcon className="w-4 h-4" />
        {value && (
          <>
            <span>{formatRecurrenceLabel(value)}</span>
            <button
              type="button"
              onClick={handleClear}
              className="ml-1 hover:text-red-500"
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          </>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3 space-y-3">
          {/* Presets */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
              Presets
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((preset) => {
                const isActive =
                  value &&
                  ((preset.key === 'weekdays' &&
                    value.frequency === 'weekly' &&
                    value.daysOfWeek?.length === 5) ||
                    (preset.key !== 'weekdays' &&
                      value.frequency === preset.key &&
                      value.interval === 1 &&
                      !value.daysOfWeek?.length));
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => handlePreset(preset.key)}
                    className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom toggle */}
          <button
            type="button"
            onClick={() => setShowCustom(!showCustom)}
            className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 font-medium"
          >
            {showCustom ? '▾ Hide custom' : '▸ Custom...'}
          </button>

          {/* Custom builder */}
          {showCustom && (
            <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3">
              {/* Frequency + Interval */}
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-600 dark:text-gray-400">Every</span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={customInterval}
                  onChange={(e) => setCustomInterval(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-14 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <select
                  value={customFreq}
                  onChange={(e) => setCustomFreq(e.target.value as typeof customFreq)}
                  className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="daily">{customInterval > 1 ? 'days' : 'day'}</option>
                  <option value="weekly">{customInterval > 1 ? 'weeks' : 'week'}</option>
                  <option value="monthly">{customInterval > 1 ? 'months' : 'month'}</option>
                  <option value="yearly">{customInterval > 1 ? 'years' : 'year'}</option>
                </select>
              </div>

              {/* Day-of-week selector (weekly only) */}
              {customFreq === 'weekly' && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">On days:</p>
                  <div className="flex space-x-1">
                    {DAY_LABELS.map((label, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleDay(i)}
                        title={DAY_FULL_LABELS[i]}
                        className={`w-7 h-7 rounded-full text-xs font-medium transition-colors ${
                          customDays.includes(i)
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* End condition */}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Ends:</p>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="radio"
                      name="end"
                      checked={endType === 'never'}
                      onChange={() => setEndType('never')}
                      className="text-blue-500 focus:ring-blue-500"
                    />
                    <span>Never</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="radio"
                      name="end"
                      checked={endType === 'date'}
                      onChange={() => setEndType('date')}
                      className="text-blue-500 focus:ring-blue-500"
                    />
                    <span>On date</span>
                    {endType === 'date' && (
                      <input
                        type="date"
                        value={endDateStr}
                        onChange={(e) => setEndDateStr(e.target.value)}
                        className="text-xs border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    )}
                  </label>
                  <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="radio"
                      name="end"
                      checked={endType === 'count'}
                      onChange={() => setEndType('count')}
                      className="text-blue-500 focus:ring-blue-500"
                    />
                    <span>After</span>
                    {endType === 'count' && (
                      <>
                        <input
                          type="number"
                          min={1}
                          max={999}
                          value={endCount}
                          onChange={(e) => setEndCount(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-14 text-xs border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <span>times</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Apply button */}
              <button
                type="button"
                onClick={handleCustomApply}
                className="w-full text-xs bg-blue-500 text-white rounded-lg py-1.5 hover:bg-blue-600 transition-colors font-medium"
              >
                Apply custom
              </button>
            </div>
          )}

          {/* Clear / Remove */}
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="w-full text-xs text-red-500 hover:text-red-600 py-1 text-center"
            >
              Remove recurrence
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default RecurrencePicker;
