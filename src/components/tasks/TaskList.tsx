import { useTaskStore } from '../../store/taskStore';
import TaskItem from './TaskItem';
import TaskForm from './TaskForm';
import type { Task } from '../../types';
import { isToday } from 'date-fns';

const TaskList = () => {
  const { 
    tasks, 
    currentView, 
    currentProjectId, 
    currentLabelId, 
    filter,
    loading 
  } = useTaskStore();

  const getFilteredTasks = (): Task[] => {
    let filteredTasks = [...tasks];

    // Filter by view
    switch (currentView) {
      case 'inbox':
        filteredTasks = filteredTasks.filter(task => !task.projectId);
        break;
      case 'today':
        filteredTasks = filteredTasks.filter(task => {
          if (!task.dueDate) return false;
          const dueDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
          return isToday(dueDate);
        });
        break;
      case 'upcoming':
        filteredTasks = filteredTasks.filter(task => {
          if (!task.dueDate) return false;
          const dueDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
          return dueDate > new Date();
        });
        break;
      case 'project':
        filteredTasks = filteredTasks.filter(task => task.projectId === currentProjectId);
        break;
      case 'label':
        filteredTasks = filteredTasks.filter(task => task.labels.includes(currentLabelId!));
        break;
    }

    // Apply additional filters
    if (filter.completed !== undefined) {
      filteredTasks = filteredTasks.filter(task => task.completed === filter.completed);
    }

    if (filter.priority) {
      filteredTasks = filteredTasks.filter(task => task.priority === filter.priority);
    }

    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filteredTasks = filteredTasks.filter(task => 
        task.title.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by priority, then by due date, then by creation date
    return filteredTasks.sort((a, b) => {
      // First by completion status
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
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
  };

  const filteredTasks = getFilteredTasks();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* Quick Add Form */}
      <TaskForm />
      
      {/* Tasks */}
      <div className="mt-4 md:mt-6 space-y-3 md:space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-2">
              {currentView === 'today' ? '🎉' : '📝'}
            </div>
            <p className="text-gray-500">
              {currentView === 'today' 
                ? 'All done for today!' 
                : 'No tasks yet. Add one above to get started.'}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))
        )}
      </div>
    </div>
  );
};

export default TaskList;