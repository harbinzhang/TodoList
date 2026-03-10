import { useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/config';
import { useAuthStore } from './store/authStore';
import { useTaskStore } from './store/taskStore';
import { taskService } from './services/taskService';
import { projectService } from './services/projectService';
import { labelService } from './services/labelService';
import AuthForm from './components/auth/AuthForm';
import Sidebar from './components/layout/Sidebar';
import MainContent from './components/layout/MainContent';

function App() {
  const { user, loading, setUser, setLoading } = useAuthStore();
  const { setTasks, setProjects, setLabels } = useTaskStore();
  const unsubscribersRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: firebaseUser.displayName || undefined,
          photoURL: firebaseUser.photoURL || undefined,
        });

        // Subscribe to real-time Firestore data
        const unsubTasks = taskService.subscribeToUserTasks(firebaseUser.uid, setTasks);
        const unsubProjects = projectService.subscribeToUserProjects(firebaseUser.uid, setProjects);
        const unsubLabels = labelService.subscribeToUserLabels(firebaseUser.uid, setLabels);
        unsubscribersRef.current = [unsubTasks, unsubProjects, unsubLabels];
      } else {
        // Clean up subscriptions on logout
        unsubscribersRef.current.forEach((unsub) => unsub());
        unsubscribersRef.current = [];
        setUser(null);
        setTasks([]);
        setProjects([]);
        setLabels([]);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      unsubscribersRef.current.forEach((unsub) => unsub());
    };
  }, [setUser, setLoading, setTasks, setProjects, setLabels]);

  if (loading) {
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
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <MainContent />
    </div>
  );
}

export default App;
