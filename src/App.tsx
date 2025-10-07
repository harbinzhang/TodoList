import { useEffect, useState, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/config';
import { useAuthStore } from './store/authStore';
import { useTaskStore } from './store/taskStore';
import { useMobile } from './hooks/useMobile';
import { taskService } from './services/taskService';
import { projectService } from './services/projectService';
import { labelService } from './services/labelService';
import AuthForm from './components/auth/AuthForm';
import Sidebar from './components/layout/Sidebar';
import MainContent from './components/layout/MainContent';

function App() {
  const { user, loading, setUser, setLoading } = useAuthStore();
  const { setTasks, setProjects, setLabels } = useTaskStore();
  const { isMobile, sidebarOpen, toggleSidebar, closeSidebar } = useMobile();

  // Track initial data readiness to avoid duplicate fetch and show consistent loading state
  const [dataReady, setDataReady] = useState({ tasks: false, projects: false, labels: false });
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser({
          uid: user.uid,
          email: user.email!,
          displayName: user.displayName || undefined,
          photoURL: user.photoURL || undefined,
        });
        // Real-time subscriptions will populate data; no manual fetch to prevent duplication
      } else {
        setUser(null);
        // Clear data when user logs out
        setTasks([]);
        setProjects([]);
        setLabels([]);
        setDataReady({ tasks: false, projects: false, labels: false });
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, [setUser, setLoading, setTasks, setProjects, setLabels]);

  // Set up real-time subscriptions when user is logged in
  useEffect(() => {
    if (!user) return;

    const unsubscribeTasks = taskService.subscribeToUserTasks(user.uid, (tasks) => {
      setTasks(tasks);
      if (!dataReady.tasks) setDataReady(prev => ({ ...prev, tasks: true }));
    });
    const unsubscribeProjects = projectService.subscribeToUserProjects(user.uid, (projects) => {
      setProjects(projects);
      if (!dataReady.projects) setDataReady(prev => ({ ...prev, projects: true }));
    });
    const unsubscribeLabels = labelService.subscribeToUserLabels(user.uid, (labels) => {
      setLabels(labels);
      if (!dataReady.labels) setDataReady(prev => ({ ...prev, labels: true }));
    });

    return () => {
      unsubscribeTasks();
      unsubscribeProjects();
      unsubscribeLabels();
    };
  }, [user, setTasks, setProjects, setLabels, dataReady.tasks, dataReady.projects, dataReady.labels]);

  const allDataReady = user && dataReady.tasks && dataReady.projects && dataReady.labels;


  if (loading || (user && !allDataReady)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div className="flex h-screen bg-gray-50 safe-area-top safe-area-bottom">
      {/* Mobile backdrop overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}
      
      <Sidebar 
        isMobile={isMobile}
        sidebarOpen={sidebarOpen}
        closeSidebar={closeSidebar}
      />
      <MainContent 
        isMobile={isMobile}
        toggleSidebar={toggleSidebar}
      />
    </div>
  );
}

export default App;
