import type { Task, Section } from '../types';

export type BoardColumnSource = 'section' | 'priority' | 'status';

export interface ColumnDef {
  id: string;
  title: string;
  color: string;
}

export interface BoardColumn {
  def: ColumnDef;
  tasks: Task[];
}

/**
 * Returns column definitions for a given source type.
 */
export function getColumnDefs(
  source: BoardColumnSource,
  sections: Section[] = []
): ColumnDef[] {
  switch (source) {
    case 'section':
      return [
        { id: '__no_section__', title: 'No section', color: '#6b7280' },
        ...sections
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((s) => ({
            id: s.id,
            title: s.name,
            color: '#3b82f6',
          })),
      ];
    case 'priority':
      return [
        { id: 'p1', title: 'Priority 1', color: '#ef4444' },
        { id: 'p2', title: 'Priority 2', color: '#f97316' },
        { id: 'p3', title: 'Priority 3', color: '#3b82f6' },
        { id: 'p4', title: 'Priority 4', color: '#6b7280' },
      ];
    case 'status':
      return [
        { id: 'active', title: 'Active', color: '#3b82f6' },
        { id: 'completed', title: 'Completed', color: '#22c55e' },
      ];
  }
}

/**
 * Groups tasks into board columns based on the source.
 */
export function groupTasksBySource(
  tasks: Task[],
  source: BoardColumnSource,
  sections: Section[] = []
): BoardColumn[] {
  const defs = getColumnDefs(source, sections);

  return defs.map((def) => {
    let columnTasks: Task[];

    switch (source) {
      case 'section':
        columnTasks =
          def.id === '__no_section__'
            ? tasks.filter((t) => !t.sectionId)
            : tasks.filter((t) => t.sectionId === def.id);
        break;
      case 'priority':
        const priorityNum = parseInt(def.id.replace('p', ''));
        columnTasks = tasks.filter((t) => t.priority === priorityNum);
        break;
      case 'status':
        columnTasks =
          def.id === 'active'
            ? tasks.filter((t) => !t.completed)
            : tasks.filter((t) => t.completed);
        break;
    }

    // Sort within column
    columnTasks.sort((a, b) => {
      if (a.sortOrder != null && b.sortOrder != null) return a.sortOrder - b.sortOrder;
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return { def, tasks: columnTasks };
  });
}

/**
 * Given a column source and a column ID, returns the field name and value
 * that should be updated when a task is dropped into that column.
 */
export function getDropFieldUpdate(
  source: BoardColumnSource,
  columnId: string
): Partial<Task> {
  switch (source) {
    case 'section':
      return {
        sectionId: columnId === '__no_section__' ? undefined : columnId,
      };
    case 'priority': {
      const p = parseInt(columnId.replace('p', '')) as 1 | 2 | 3 | 4;
      return { priority: p };
    }
    case 'status':
      return { completed: columnId === 'completed' };
  }
}
