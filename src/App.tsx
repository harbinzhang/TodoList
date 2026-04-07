import { useEffect, useState } from 'react';
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
  const [dataReady, setDataReady] = useState({
    tasks: false,
    projects: false,
    labels: false,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser({
          uid: user.uid,
          email: user.email!,
          displayName: user.displayName || undefined,
          photoURL: user.photoURL || undefined,
        });
      } else {
        setUser(null);
        setTasks([]);
        setProjects([]);
        setLabels([]);
        setDataReady({
          tasks: false,
          projects: false,
          labels: false,
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setLoading, setTasks, setProjects, setLabels]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setDataReady({
      tasks: false,
      projects: false,
      labels: false,
    });

    const unsubscribeTasks = taskService.subscribeToUserTasks(user.uid, (tasks) => {
      setTasks(tasks);
      setDataReady((current) => (current.tasks ? current : { ...current, tasks: true }));
    });

    const unsubscribeProjects = projectService.subscribeToUserProjects(user.uid, (projects) => {
      setProjects(projects);
      setDataReady((current) => (current.projects ? current : { ...current, projects: true }));
    });

    const unsubscribeLabels = labelService.subscribeToUserLabels(user.uid, (labels) => {
      setLabels(labels);
      setDataReady((current) => (current.labels ? current : { ...current, labels: true }));
    });

    return () => {
      unsubscribeTasks();
      unsubscribeProjects();
      unsubscribeLabels();
    };
  }, [user, setTasks, setProjects, setLabels]);

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
    <div className="safe-area-top safe-area-bottom flex h-screen bg-gray-50">
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
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
