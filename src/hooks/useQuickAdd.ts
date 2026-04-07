import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useTaskStore } from '../store/taskStore';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { taskService } from '../services/taskService';
import { parseTaskInput } from '../utils/taskParser';
import { getTodayStringInTz } from '../utils/dateUtils';
import type { ParsedTask } from '../utils/taskParser';

interface QuickAddOverrides {
  dueDate?: Date | null; // null = explicitly cleared
  priority?: 1 | 2 | 3 | 4 | null;
  projectId?: string | null;
  labelIds?: string[] | null;
}

interface UseQuickAddOptions {
  /** Called after a successful submission */
  onSubmit?: () => void;
  /** Called when the user cancels */
  onCancel?: () => void;
}

export function useQuickAdd(options: UseQuickAddOptions = {}) {
  const { user } = useAuthStore();
  const { currentView, currentProjectId, currentLabelId, projects, labels } = useTaskStore();
  const { timezone } = useSettingsStore();

  const [inputText, setInputText] = useState('');
  const [parsed, setParsed] = useState<ParsedTask>({
    cleanTitle: '',
    parsedTokens: [],
  });
  const [overrides, setOverrides] = useState<QuickAddOverrides>({});
  const [loading, setLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounced parsing (150ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!inputText.trim()) {
      setParsed({ cleanTitle: '', parsedTokens: [] });
      return;
    }

    debounceRef.current = setTimeout(() => {
      const result = parseTaskInput(inputText, projects, labels);
      setParsed(result);
    }, 150);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputText, projects, labels]);

  // Merged result: parsed values + user overrides (overrides win)
  const mergedDueDate = useMemo(() => (
    overrides.dueDate !== undefined
      ? overrides.dueDate ?? undefined
      : parsed.dueDate
  ), [overrides.dueDate, parsed.dueDate]);

  const mergedPriority = useMemo(() => (
    overrides.priority !== undefined
      ? overrides.priority ?? undefined
      : parsed.priority
  ), [overrides.priority, parsed.priority]);

  const mergedProjectId = useMemo(() => (
    overrides.projectId !== undefined
      ? overrides.projectId ?? undefined
      : parsed.projectId ?? (currentView === 'project' ? currentProjectId : undefined)
  ), [overrides.projectId, parsed.projectId, currentView, currentProjectId]);

  const mergedLabelIds = useMemo(() => (
    overrides.labelIds !== undefined
      ? overrides.labelIds ?? undefined
      : parsed.labelIds ?? (currentView === 'label' && currentLabelId ? [currentLabelId] : undefined)
  ), [overrides.labelIds, parsed.labelIds, currentView, currentLabelId]);

  const canSubmit = parsed.cleanTitle.trim().length > 0 && !loading;

  const submit = useCallback(async () => {
    if (!canSubmit || !user) return;

    setLoading(true);
    try {
      // If in today view and no date set, default to today
      let finalDueDate = mergedDueDate;
      if (!finalDueDate && currentView === 'today') {
        const todayStr = getTodayStringInTz(timezone);
        finalDueDate = new Date(todayStr + 'T00:00:00');
      }

      await taskService.createTask({
        title: parsed.cleanTitle.trim(),
        completed: false,
        priority: mergedPriority ?? 4,
        dueDate: finalDueDate,
        userId: user.uid,
        projectId: mergedProjectId,
        labels: mergedLabelIds ?? [],
        subtasks: [],
      });

      // Reset for next task
      setInputText('');
      setParsed({ cleanTitle: '', parsedTokens: [] });
      setOverrides({});
      options.onSubmit?.();
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setLoading(false);
    }
  }, [canSubmit, user, parsed.cleanTitle, mergedDueDate, mergedPriority, mergedProjectId, mergedLabelIds, currentView, timezone, options]);

  const cancel = useCallback(() => {
    setInputText('');
    setParsed({ cleanTitle: '', parsedTokens: [] });
    setOverrides({});
    options.onCancel?.();
  }, [options]);

  const setOverrideDueDate = useCallback((date: Date | null) => {
    setOverrides((prev) => ({ ...prev, dueDate: date }));
  }, []);

  const setOverridePriority = useCallback((priority: 1 | 2 | 3 | 4 | null) => {
    setOverrides((prev) => ({ ...prev, priority }));
  }, []);

  const setOverrideProjectId = useCallback((projectId: string | null) => {
    setOverrides((prev) => ({ ...prev, projectId }));
  }, []);

  const setOverrideLabelIds = useCallback((labelIds: string[] | null) => {
    setOverrides((prev) => ({ ...prev, labelIds }));
  }, []);

  return {
    // State
    inputText,
    setInputText,
    parsed,
    loading,
    canSubmit,

    // Merged values (parsed + overrides)
    dueDate: mergedDueDate,
    priority: mergedPriority,
    projectId: mergedProjectId,
    labelIds: mergedLabelIds,

    // Actions
    submit,
    cancel,

    // Override setters
    setOverrideDueDate,
    setOverridePriority,
    setOverrideProjectId,
    setOverrideLabelIds,
  };
}
