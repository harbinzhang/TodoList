import { useEffect, useRef, createContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/config';
import { useAuthStore } from './store/authStore';
import { useTaskStore } from './store/taskStore';
import { taskService } from './services/taskService';
import { projectService } from './services/projectService';
import { labelService } from './services/labelService';
import { sectionService } from './services/sectionService';
import { filterService } from './services/filterService';
import { useTheme } from './hooks/useTheme';
import { useUndoQueue } from './hooks/useUndoQueue';
import type { UndoQueueItem } from './hooks/useUndoQueue';
import AuthForm from './components/auth/AuthForm';
import Sidebar from './components/layout/Sidebar';
import MainContent from './components/layout/MainContent';
import SettingsModal from './components/common/SettingsModal';
import UndoToast from './components/common/UndoToast';

import type { Task } from './types';

// Context for undo queue so child components can enqueue
interface UndoQueueContextType {
  enqueue: (task: Task) => void;
  pendingItems: UndoQueueItem[];
}
export const UndoQueueContext = createContext<UndoQueueContextType>({
  enqueue: () => {},
  pendingItems: [],
});

function App() {
  const { user, loading, setUser, setLoading } = useAuthStore();
  useTheme(); // Activate theme management
  const { setTasks, setProjects, setLabels, setSections, setSavedFilters } = useTaskStore();
  const unsubscribersRef = useRef<(() => void)[]>([]);
  const undoQueue = useUndoQueue();

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
        const unsubSections = sectionService.subscribeToUserSections(firebaseUser.uid, setSections);
        const unsubFilters = filterService.subscribeToUserFilters(firebaseUser.uid, setSavedFilters);
        unsubscribersRef.current = [unsubTasks, unsubProjects, unsubLabels, unsubSections, unsubFilters];
      } else {
        // Clean up subscriptions on logout
        unsubscribersRef.current.forEach((unsub) => unsub());
        unsubscribersRef.current = [];
        setUser(null);
        setTasks([]);
        setProjects([]);
        setLabels([]);
        setSections([]);
        setSavedFilters([]);
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 dark:border-blue-400"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <UndoQueueContext.Provider value={undoQueue}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <MainContent />
        <SettingsModal />
        <UndoToast
          items={undoQueue.pendingItems}
          onUndo={undoQueue.undo}
          onDismiss={undoQueue.dismiss}
        />
      </div>
    </UndoQueueContext.Provider>
  );
}

export default App;
