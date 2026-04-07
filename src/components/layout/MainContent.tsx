import { useTaskStore } from '../../store/taskStore';
import TaskList from '../tasks/TaskList';
import SearchBar from '../common/SearchBar';
import ProfileDropdown from '../common/ProfileDropdown';
import { format } from 'date-fns';
import { Bars3Icon } from '@heroicons/react/24/outline';

interface MainContentProps {
  isMobile: boolean;
  toggleSidebar: () => void;
}

const MainContent = ({ isMobile, toggleSidebar }: MainContentProps) => {
  const { currentView, currentProjectId, currentLabelId, projects, labels } = useTaskStore();

  const getViewTitle = () => {
    switch (currentView) {
      case 'inbox':
        return 'Inbox';
      case 'today':
        return 'Today';
      case 'upcoming':
        return 'Upcoming';
      case 'project': {
        const project = projects.find(p => p.id === currentProjectId);
        return project?.name || 'Project';
      }
      case 'label': {
        const label = labels.find(l => l.id === currentLabelId);
        return label?.name || 'Label';
      }
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
      <div className="border-b border-gray-200 bg-white p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {isMobile && (
              <button
                onClick={toggleSidebar}
                className="rounded-lg p-2 hover:bg-gray-100 lg:hidden"
              >
                <Bars3Icon className="h-6 w-6 text-gray-500" />
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900 md:text-2xl">{getViewTitle()}</h1>
              {getViewSubtitle() && (
                <p className="mt-1 text-sm text-gray-500">{getViewSubtitle()}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className={isMobile ? 'w-40' : 'w-64'}>
              <SearchBar />
            </div>
            <ProfileDropdown />
          </div>
        </div>
      </div>
      <div className="flex-1 bg-gray-50">
        <TaskList />
      </div>
    </div>
  );
};

export default MainContent;
