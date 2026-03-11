import { useEffect } from 'react';
import { useTaskStore } from '../store/taskStore';
import type { TaskViewMode, ViewType } from '../types';

const STORAGE_PREFIX = 'viewPref:';

function getContextKey(currentView: ViewType, contextId?: string): string {
  return `${STORAGE_PREFIX}${currentView}${contextId ? `:${contextId}` : ''}`;
}

function getAvailableViews(currentView: ViewType): TaskViewMode[] {
  switch (currentView) {
    case 'today':
      return ['list'];
    case 'upcoming':
      return ['list', 'calendar'];
    case 'inbox':
    case 'project':
    case 'label':
    case 'filter':
      return ['list', 'board'];
    default:
      return ['list'];
  }
}

/**
 * Reads/writes per-context view preference to localStorage.
 * Returns the list of available views for the current navigation context.
 */
export function useViewPreference() {
  const {
    currentView,
    currentProjectId,
    currentLabelId,
    currentFilterId,
    currentViewMode,
    setCurrentViewMode,
  } = useTaskStore();

  const contextId = currentProjectId || currentLabelId || currentFilterId;
  const key = getContextKey(currentView, contextId);
  const availableViews = getAvailableViews(currentView);

  // On context change, restore the persisted preference
  useEffect(() => {
    const saved = localStorage.getItem(key) as TaskViewMode | null;
    if (saved && availableViews.includes(saved)) {
      setCurrentViewMode(saved);
    } else {
      // Reset to list if saved preference isn't available in this context
      setCurrentViewMode('list');
    }
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const setViewMode = (mode: TaskViewMode) => {
    localStorage.setItem(key, mode);
    setCurrentViewMode(mode);
  };

  return {
    currentViewMode,
    setViewMode,
    availableViews,
  };
}
