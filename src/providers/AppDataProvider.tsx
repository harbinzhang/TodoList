import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAuthSession } from './useAuthSession';
import { useLabels } from '../hooks/queries/useLabels';
import { useProjects } from '../hooks/queries/useProjects';
import { useSavedFilters } from '../hooks/queries/useSavedFilters';
import { useSections } from '../hooks/queries/useSections';
import { useTasks } from '../hooks/queries/useTasks';
import type { Label, Project, SavedFilter, Section, Task } from '../types';

interface AppDataValue {
  tasks: Task[];
  projects: Project[];
  labels: Label[];
  sections: Section[];
  savedFilters: SavedFilter[];
  isLoading: boolean;
}

const AppDataContext = createContext<AppDataValue | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthSession();
  const tasksQuery = useTasks();
  const projectsQuery = useProjects();
  const labelsQuery = useLabels();
  const sectionsQuery = useSections();
  const savedFiltersQuery = useSavedFilters();

  const value = useMemo<AppDataValue>(
    () => ({
      tasks: tasksQuery.tasks,
      projects: projectsQuery.projects,
      labels: labelsQuery.labels,
      sections: sectionsQuery.sections,
      savedFilters: savedFiltersQuery.savedFilters,
      isLoading: !!user && [
        tasksQuery.isPending,
        projectsQuery.isPending,
        labelsQuery.isPending,
        sectionsQuery.isPending,
        savedFiltersQuery.isPending,
      ].some(Boolean),
    }),
    [
      labelsQuery.isPending,
      labelsQuery.labels,
      projectsQuery.isPending,
      projectsQuery.projects,
      savedFiltersQuery.isPending,
      savedFiltersQuery.savedFilters,
      sectionsQuery.isPending,
      sectionsQuery.sections,
      tasksQuery.isPending,
      tasksQuery.tasks,
      user,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppDataContext() {
  const value = useContext(AppDataContext);

  if (!value) {
    throw new Error('useAppDataContext must be used within AppDataProvider');
  }

  return value;
}
