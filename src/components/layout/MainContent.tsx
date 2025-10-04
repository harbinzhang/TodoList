import { useTaskStore } from '../../store/taskStore';
import TaskList from '../tasks/TaskList';
import SearchBar from '../common/SearchBar';
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
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{getViewTitle()}</h1>
            {getViewSubtitle() && (
              <p className="text-sm text-gray-500 mt-1">{getViewSubtitle()}</p>
            )}
          </div>
          <div className="w-64">
            <SearchBar />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-gray-50">
        <TaskList />
      </div>
    </div>
  );
};

export default MainContent;