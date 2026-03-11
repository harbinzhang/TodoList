import { useTaskStore } from '../../store/taskStore';
import { useViewPreference } from '../../hooks/useViewPreference';
import TaskList from '../tasks/TaskList';
import TaskDetailPanel from '../tasks/TaskDetailPanel';
import SearchBar from '../common/SearchBar';
import ProfileDropdown from '../common/ProfileDropdown';
import ThemeToggle from '../common/ThemeToggle';
import CompletedList from '../archive/CompletedList';
import ArchiveStats from '../archive/ArchiveStats';
import ViewSwitcher from './ViewSwitcher';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { lazy, Suspense } from 'react';

// Lazy load view components
const UpcomingView = lazy(() => import('../views/UpcomingView'));
const CalendarView = lazy(() => import('../views/CalendarView'));
const BoardView = lazy(() => import('../views/BoardView'));

const viewTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2 },
};

const ViewFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 dark:border-blue-400"></div>
  </div>
);

const MainContent = () => {
  const { currentView, currentProjectId, currentLabelId, currentFilterId, projects, labels, savedFilters } = useTaskStore();
  const { currentViewMode, setViewMode, availableViews } = useViewPreference();

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
      case 'completed':
        return 'Completed';
      case 'filter':
        const filter = savedFilters?.find(f => f.id === currentFilterId);
        return filter?.name || 'Filter';
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

  const renderContent = () => {
    // Completed view is always its own thing
    if (currentView === 'completed') {
      return (
        <>
          <ArchiveStats />
          <CompletedList />
        </>
      );
    }

    // Upcoming view with its own enhanced component
    if (currentView === 'upcoming') {
      if (currentViewMode === 'calendar') {
        return (
          <Suspense fallback={<ViewFallback />}>
            <CalendarView />
          </Suspense>
        );
      }
      return (
        <Suspense fallback={<ViewFallback />}>
          <UpcomingView />
        </Suspense>
      );
    }

    // Board view
    if (currentViewMode === 'board') {
      return (
        <Suspense fallback={<ViewFallback />}>
          <BoardView />
        </Suspense>
      );
    }

    // Calendar view
    if (currentViewMode === 'calendar') {
      return (
        <Suspense fallback={<ViewFallback />}>
          <CalendarView />
        </Suspense>
      );
    }

    // Default: list view
    return <TaskList />;
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
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
            <ViewSwitcher
              availableViews={availableViews}
              currentViewMode={currentViewMode}
              onViewChange={setViewMode}
            />
            <div className="w-64">
              <SearchBar />
            </div>
            <ThemeToggle />
            <ProfileDropdown />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-gray-50 dark:bg-gray-900 overflow-auto min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentView}-${currentViewMode}`}
            {...viewTransition}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Task Detail Panel */}
      <TaskDetailPanel />
    </div>
  );
};

export default MainContent;