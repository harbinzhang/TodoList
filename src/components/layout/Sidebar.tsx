import { useState } from 'react';
import { useTaskStore } from '../../store/taskStore';
import ProjectForm from '../projects/ProjectForm';
import LabelForm from '../labels/LabelForm';
import {
  HomeIcon,
  CalendarIcon,
  ClockIcon,
  TagIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import type { ViewType } from '../../types';

interface SidebarProps {
  isMobile: boolean;
  sidebarOpen: boolean;
  closeSidebar: () => void;
}

const Sidebar = ({ isMobile, sidebarOpen, closeSidebar }: SidebarProps) => {
  const { currentView, currentProjectId, currentLabelId, projects, labels, tasks, setCurrentView } = useTaskStore();
  const [isProjectsOpen, setIsProjectsOpen] = useState(true);
  const [isLabelsOpen, setIsLabelsOpen] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showLabelForm, setShowLabelForm] = useState(false);

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
          task.dueDate && 
          task.dueDate > new Date()
        ).length;
      case 'project':
        return tasks.filter(task => !task.completed && task.projectId === id).length;
      case 'label':
        return tasks.filter(task => !task.completed && task.labels.includes(id!)).length;
      default:
        return 0;
    }
  };

  const handleNavClick = (view: ViewType, id?: string) => {
    setCurrentView(view, id);
    if (isMobile) {
      closeSidebar();
    }
  };

  return (
    <div
      className={`
        ${isMobile
          ? `fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`
          : 'w-64'}
        flex h-screen flex-col border-r border-gray-200 bg-gray-50
      `}
    >
      {isMobile && (
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
          <button
            onClick={closeSidebar}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>
      )}

      <div className={`border-b border-gray-200 p-4 ${isMobile ? '' : 'mt-4'}`}>
        <button className="w-full flex items-center space-x-2 text-red-500 hover:bg-red-50 rounded-lg p-2">
          <PlusIcon className="w-5 h-5" />
          <span className="font-medium">Add task</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <nav className="p-2 space-y-1">
          <button
            onClick={() => handleNavClick('inbox')}
            className={`w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 ${
              currentView === 'inbox' ? 'bg-red-50 text-red-700' : 'text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-3">
              <HomeIcon className="w-5 h-5" />
              <span>Inbox</span>
            </div>
            <span className="text-sm text-gray-500">{getTaskCount('inbox')}</span>
          </button>

          <button
            onClick={() => handleNavClick('today')}
            className={`w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 ${
              currentView === 'today' ? 'bg-red-50 text-red-700' : 'text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-3">
              <CalendarIcon className="w-5 h-5" />
              <span>Today</span>
            </div>
            <span className="text-sm text-gray-500">{getTaskCount('today')}</span>
          </button>

          <button
            onClick={() => handleNavClick('upcoming')}
            className={`w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 ${
              currentView === 'upcoming' ? 'bg-red-50 text-red-700' : 'text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-3">
              <ClockIcon className="w-5 h-5" />
              <span>Upcoming</span>
            </div>
            <span className="text-sm text-gray-500">{getTaskCount('upcoming')}</span>
          </button>
        </nav>

        <div className="p-2 mt-4">
          <button
            onClick={() => setIsProjectsOpen(!isProjectsOpen)}
            className="w-full flex items-center justify-between p-2 text-gray-700 hover:bg-gray-100 rounded-lg"
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
                  onClick={() => handleNavClick('project', project.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 ${
                    currentView === 'project' && currentProjectId === project.id
                      ? 'bg-red-50 text-red-700'
                      : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="truncate">{project.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {getTaskCount('project', project.id)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-2">
          <button
            onClick={() => setIsLabelsOpen(!isLabelsOpen)}
            className="w-full flex items-center justify-between p-2 text-gray-700 hover:bg-gray-100 rounded-lg"
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
                  onClick={() => handleNavClick('label', label.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 ${
                    currentView === 'label' && currentLabelId === label.id
                      ? 'bg-red-50 text-red-700'
                      : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <TagIcon className="w-4 h-4" style={{ color: label.color }} />
                    <span className="truncate">{label.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {getTaskCount('label', label.id)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <ProjectForm 
        isOpen={showProjectForm} 
        onClose={() => setShowProjectForm(false)} 
      />
      <LabelForm 
        isOpen={showLabelForm} 
        onClose={() => setShowLabelForm(false)} 
      />
    </div>
  );
};

export default Sidebar;
