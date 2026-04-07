import { useState } from 'react';
import { useTaskStore } from '../../store/taskStore';
import { useMindmapStore } from '../../store/mindmapStore';
import { useAppData } from '../../hooks/useAppData';
import ProjectForm from '../projects/ProjectForm';
import LabelForm from '../labels/LabelForm';
import FilterForm from '../filters/FilterForm';
import MindmapForm from '../mindmap/MindmapForm';
import {
  HomeIcon,
  CalendarIcon,
  ClockIcon,
  TagIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArchiveBoxIcon,
  FunnelIcon,
  ShareIcon,
} from '@heroicons/react/24/outline';
import CompletionSpark from '../common/CompletionSpark';

const Sidebar = () => {
  const {
    currentView,
    currentProjectId,
    currentLabelId,
    currentFilterId,
    currentMindmapId,
    setCurrentView,
  } = useTaskStore();
  const { mindmaps } = useMindmapStore();
  const { projects, labels, tasks, savedFilters } = useAppData();
  const [isProjectsOpen, setIsProjectsOpen] = useState(true);
  const [isLabelsOpen, setIsLabelsOpen] = useState(false);
  const [isMindmapsOpen, setIsMindmapsOpen] = useState(true);
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showLabelForm, setShowLabelForm] = useState(false);
  const [showMindmapForm, setShowMindmapForm] = useState(false);
  const [showFilterForm, setShowFilterForm] = useState(false);

  const getTaskCount = (type: string, id?: string) => {
    switch (type) {
      case 'inbox':
        return tasks.filter(task => !task.completed && !task.projectId).length;
      case 'today': {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tasks.filter(task => 
          !task.completed && 
          task.dueDate && 
          task.dueDate >= today && 
          task.dueDate < tomorrow
        ).length;
      }
      case 'upcoming':
        return tasks.filter(task => 
          !task.completed && 
          task.dueDate != null
        ).length;
      case 'project':
        return tasks.filter(task => !task.completed && task.projectId === id).length;
      case 'label':
        return tasks.filter(task => !task.completed && task.labels.includes(id!)).length;
      case 'completed':
        return tasks.filter(task => task.completed).length;
      default:
        return 0;
    }
  };


  return (
    <div className="w-64 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-screen flex flex-col">

      {/* Quick Add */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 mt-4">
        <button className="w-full flex items-center space-x-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg p-2">
          <PlusIcon className="w-5 h-5" />
          <span className="font-medium">Add task</span>
        </button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto">
        <nav className="p-2 space-y-1">
          {/* Inbox */}
          <button
            onClick={() => setCurrentView('inbox')}
            className={`w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
              currentView === 'inbox' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <HomeIcon className="w-5 h-5" />
              <span>Inbox</span>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">{getTaskCount('inbox')}</span>
          </button>

          {/* Today */}
          <button
            onClick={() => setCurrentView('today')}
            className={`w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
              currentView === 'today' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <CalendarIcon className="w-5 h-5" />
              <span>Today</span>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">{getTaskCount('today')}</span>
          </button>

          {/* Upcoming */}
          <button
            onClick={() => setCurrentView('upcoming')}
            className={`w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
              currentView === 'upcoming' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <ClockIcon className="w-5 h-5" />
              <span>Upcoming</span>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">{getTaskCount('upcoming')}</span>
          </button>

          {/* Completed */}
          <button
            onClick={() => setCurrentView('completed')}
            className={`w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
              currentView === 'completed' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <ArchiveBoxIcon className="w-5 h-5" />
              <span>Completed</span>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">{getTaskCount('completed')}</span>
          </button>
        </nav>

        {/* Projects Section */}
        <div className="p-2 mt-4">
          <button
            onClick={() => setIsProjectsOpen(!isProjectsOpen)}
            className="w-full flex items-center justify-between p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <div className="flex items-center space-x-2">
              {isProjectsOpen ? (
                <ChevronDownIcon className="w-4 h-4" />
              ) : (
                <ChevronRightIcon className="w-4 h-4" />
              )}
              <span className="font-medium">Projects</span>
            </div>
            <PlusIcon 
              className="w-4 h-4 cursor-pointer hover:text-blue-500" 
              onClick={(e) => {
                e.stopPropagation();
                setShowProjectForm(true);
              }}
            />
          </button>

          {isProjectsOpen && (
            <div className="ml-6 mt-1 space-y-1">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => setCurrentView('project', project.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    currentView === 'project' && currentProjectId === project.id
                      ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="truncate">{project.name}</span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {getTaskCount('project', project.id)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Labels Section */}
        <div className="p-2">
          <button
            onClick={() => setIsLabelsOpen(!isLabelsOpen)}
            className="w-full flex items-center justify-between p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <div className="flex items-center space-x-2">
              {isLabelsOpen ? (
                <ChevronDownIcon className="w-4 h-4" />
              ) : (
                <ChevronRightIcon className="w-4 h-4" />
              )}
              <span className="font-medium">Labels</span>
            </div>
            <PlusIcon 
              className="w-4 h-4 cursor-pointer hover:text-blue-500" 
              onClick={(e) => {
                e.stopPropagation();
                setShowLabelForm(true);
              }}
            />
          </button>

          {isLabelsOpen && (
            <div className="ml-6 mt-1 space-y-1">
              {labels.map((label) => (
                <button
                  key={label.id}
                  onClick={() => setCurrentView('label', label.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    currentView === 'label' && currentLabelId === label.id
                      ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <TagIcon className="w-4 h-4" style={{ color: label.color }} />
                    <span className="truncate">{label.name}</span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {getTaskCount('label', label.id)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mindmaps Section */}
        <div className="p-2">
          <button
            onClick={() => setIsMindmapsOpen(!isMindmapsOpen)}
            className="w-full flex items-center justify-between p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <div className="flex items-center space-x-2">
              {isMindmapsOpen ? (
                <ChevronDownIcon className="w-4 h-4" />
              ) : (
                <ChevronRightIcon className="w-4 h-4" />
              )}
              <span className="font-medium">Mindmaps</span>
            </div>
            <PlusIcon
              className="w-4 h-4 cursor-pointer hover:text-blue-500"
              onClick={(e) => {
                e.stopPropagation();
                setShowMindmapForm(true);
              }}
            />
          </button>

          {isMindmapsOpen && (
            <div className="ml-6 mt-1 space-y-1">
              {mindmaps.map((mindmap) => (
                <button
                  key={mindmap.id}
                  onClick={() => setCurrentView('mindmap', mindmap.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    currentView === 'mindmap' && currentMindmapId === mindmap.id
                      ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <ShareIcon className="w-4 h-4" style={{ color: mindmap.color }} />
                    <span className="truncate">{mindmap.name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Saved Filters Section */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className="flex items-center space-x-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-200"
          >
            {isFiltersOpen ? <ChevronDownIcon className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
            <span>Filters</span>
          </button>
          <button
            onClick={() => setShowFilterForm(true)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>
        {isFiltersOpen && savedFilters.length > 0 && (
          <div className="space-y-0.5">
            {savedFilters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setCurrentView('filter', filter.id)}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  currentView === 'filter' && currentFilterId === filter.id
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <FunnelIcon className="w-4 h-4" style={{ color: filter.color }} />
                  <span className="truncate">{filter.name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {/* Sparkline widget */}
      <CompletionSpark />

      {/* Modals */}
      <ProjectForm 
        isOpen={showProjectForm} 
        onClose={() => setShowProjectForm(false)} 
      />
      <LabelForm 
        isOpen={showLabelForm} 
        onClose={() => setShowLabelForm(false)} 
      />
      <MindmapForm
        isOpen={showMindmapForm}
        onClose={() => setShowMindmapForm(false)}
      />
      <FilterForm
        isOpen={showFilterForm}
        onClose={() => setShowFilterForm(false)}
      />
    </div>
  );
};

export default Sidebar;
