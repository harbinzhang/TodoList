import { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useTaskStore } from '../../store/taskStore';
import { useAuthStore } from '../../store/authStore';
import SortableTaskItem from './SortableTaskItem';
import TaskForm from './TaskForm';
import SectionHeader from '../sections/SectionHeader';
import SectionForm from '../sections/SectionForm';
import { taskService } from '../../services/taskService';
import type { Task } from '../../types';
import { useSettingsStore } from '../../store/settingsStore';
import { isDateTodayInTz } from '../../utils/dateUtils';
import { applyFilters } from '../../utils/filterEngine';

const TaskList = () => {
  const { user } = useAuthStore();
  const { 
    tasks, 
    sections,
    currentView, 
    currentProjectId, 
    currentLabelId,
    currentFilterId,
    savedFilters,
    projects,
    labels,
    filter,
    loading 
  } = useTaskStore();
  const { timezone } = useSettingsStore();

  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleSectionCollapse = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const sortTasks = useCallback((tasksToSort: Task[]): Task[] => {
    return [...tasksToSort].sort((a, b) => {
      // First by completion status
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }

      // If both have sortOrder, use that
      if (a.sortOrder != null && b.sortOrder != null) {
        return a.sortOrder - b.sortOrder;
      }

      // Then by priority (1 is highest priority)
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }

      // Then by due date
      if (a.dueDate && b.dueDate) {
        const aDate = a.dueDate instanceof Date ? a.dueDate : new Date(a.dueDate);
        const bDate = b.dueDate instanceof Date ? b.dueDate : new Date(b.dueDate);
        return aDate.getTime() - bDate.getTime();
      }
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;

      // Finally by creation date
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }, []);

  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Filter by view
    switch (currentView) {
      case 'inbox':
        // Show all tasks
        break;
      case 'today':
        result = result.filter(task => {
          if (!task.dueDate) return false;
          const dueDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
          return isDateTodayInTz(dueDate, timezone);
        });
        break;
      case 'upcoming':
        result = result.filter(task => {
          if (!task.dueDate) return false;
          const dueDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
          return dueDate > new Date();
        });
        break;
      case 'project':
        result = result.filter(task => task.projectId === currentProjectId);
        break;
      case 'label':
        result = result.filter(task => task.labels.includes(currentLabelId!));
        break;
      case 'filter': {
        const activeFilter = savedFilters.find(f => f.id === currentFilterId);
        if (activeFilter) {
          result = applyFilters(result, activeFilter.conditions, { projects, labels });
        }
        break;
      }
    }

    // Apply additional filters
    if (filter.completed !== undefined) {
      result = result.filter(task => task.completed === filter.completed);
    }

    if (filter.priority) {
      result = result.filter(task => task.priority === filter.priority);
    }

    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      result = result.filter(task => 
        task.title.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower)
      );
    }

    return sortTasks(result);
  }, [tasks, currentView, currentProjectId, currentLabelId, filter, sortTasks]);

  // Handle drag end — compute new sort orders using midpoint strategy
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeIndex = filteredTasks.findIndex(t => t.id === active.id);
    const overIndex = filteredTasks.findIndex(t => t.id === over.id);
    if (activeIndex === -1 || overIndex === -1) return;

    // Compute new order for all tasks after reordering
    const reordered = [...filteredTasks];
    const [moved] = reordered.splice(activeIndex, 1);
    reordered.splice(overIndex, 0, moved);

    // Assign new sortOrder values (simple sequential)
    const updates = reordered.map((task, index) => ({
      taskId: task.id,
      sortOrder: index + 1,
    }));

    try {
      await taskService.batchUpdateSortOrder(updates);
    } catch (error) {
      console.error('Error updating sort order:', error);
    }
  }, [filteredTasks]);

  // Group tasks by section — applies in project view, and also in other views
  // if the filtered tasks happen to have sectionIds
  const isProjectView = currentView === 'project';
  const projectSections = isProjectView && currentProjectId
    ? sections.filter(s => s.projectId === currentProjectId).sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  // For non-project views, gather sections from the filtered tasks
  const viewSections = useMemo(() => {
    if (isProjectView) return projectSections;
    // Collect unique sectionIds from filtered tasks
    const sectionIds = new Set(filteredTasks.map(t => t.sectionId).filter(Boolean) as string[]);
    if (sectionIds.size === 0) return [];
    return sections
      .filter(s => sectionIds.has(s.id))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [isProjectView, projectSections, filteredTasks, sections]);

  const hasSections = viewSections.length > 0;

  const unsectionedTasks = hasSections
    ? filteredTasks.filter(t => !t.sectionId)
    : filteredTasks;

  const getTasksForSection = (sectionId: string) =>
    filteredTasks.filter(t => t.sectionId === sectionId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 dark:border-blue-400"></div>
      </div>
    );
  }

  const renderTaskList = (taskList: Task[]) => (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={taskList.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {taskList.map((task) => (
            <SortableTaskItem key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );

  return (
    <div className="p-6">
      {/* Quick Add Form */}
      <TaskForm />
      
      {/* Tasks */}
      <div className="mt-6">
        {filteredTasks.length === 0 && viewSections.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 dark:text-gray-500 text-lg mb-2">
              {currentView === 'today' ? '🎉' : '📝'}
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              {currentView === 'today' 
                ? 'All done for today!' 
                : 'No tasks yet. Add one above to get started.'}
            </p>
          </div>
        ) : hasSections ? (
          <>
            {/* Unsectioned tasks */}
            {unsectionedTasks.length > 0 && (
              <div>
                {viewSections.length > 0 && (
                  <h4 className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 py-1">
                    No section
                  </h4>
                )}
                {renderTaskList(unsectionedTasks)}
              </div>
            )}

            {/* Sectioned tasks */}
            {viewSections.map((section) => {
              const sectionTasks = getTasksForSection(section.id);
              const completedCount = sectionTasks.filter(t => t.completed).length;
              const isCollapsed = collapsedSections.has(section.id);

              return (
                <div key={section.id} className="mt-4">
                  <SectionHeader
                    sectionId={section.id}
                    name={section.name}
                    projectId={section.projectId}
                    userId={user?.uid || ''}
                    completedCount={completedCount}
                    totalCount={sectionTasks.length}
                    isCollapsed={isCollapsed}
                    onToggleCollapse={() => toggleSectionCollapse(section.id)}
                  />
                  {!isCollapsed && (
                    <div className="mt-2 ml-6">
                      {sectionTasks.length > 0 ? (
                        renderTaskList(sectionTasks)
                      ) : (
                        <p className="text-xs text-gray-400 dark:text-gray-500 py-2 px-1">
                          No tasks in this section
                        </p>
                      )}
                      <div className="mt-2">
                        <TaskForm sectionId={section.id} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add Section — in project view */}
            {isProjectView && currentProjectId && (
              <SectionForm projectId={currentProjectId} />
            )}
          </>
        ) : (
          renderTaskList(filteredTasks)
        )}
      </div>
    </div>
  );
};

export default TaskList;