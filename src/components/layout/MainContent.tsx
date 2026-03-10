import { useTaskStore } from '../../store/taskStore';
import TaskList from '../tasks/TaskList';
import SearchBar from '../common/SearchBar';
import ProfileDropdown from '../common/ProfileDropdown';
import ThemeToggle from '../common/ThemeToggle';
import { format } from 'date-fns';

const MainContent = () => {
  const { currentView, currentProjectId, currentLabelId, projects, labels } = useTaskStore();

  const getViewTitle = () => {
    switch (currentView) {
      case 'inbox':
        return 'Inbox';
      case 'today':
        return 'Today';
      case 'upcoming':
        return 'Upcoming';
      case 'project':
        const project = projects.find(p => p.id === currentProjectId);
        return project?.name || 'Project';
      case 'label':
        const label = labels.find(l => l.id === currentLabelId);
        return label?.name || 'Label';
      default:
        return 'Tasks';
    }
  };

  const getViewSubtitle = () => {
    switch (currentView) {
      case 'today':
        return format(new Date(), 'EEEE, MMMM d');
      case 'upcoming':
        return 'Next 7 days';
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{getViewTitle()}</h1>
            {getViewSubtitle() && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{getViewSubtitle()}</p>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <div className="w-64">
              <SearchBar />
            </div>
            <ThemeToggle />
            <ProfileDropdown />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-gray-50 dark:bg-gray-900">
        <TaskList />
      </div>
    </div>
  );
};

export default MainContent;