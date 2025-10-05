import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/config';
import { useAuthStore } from './store/authStore';
import { useTaskStore } from './store/taskStore';
import AuthForm from './components/auth/AuthForm';
import Sidebar from './components/layout/Sidebar';
import MainContent from './components/layout/MainContent';

function App() {
  const { user, loading, setUser, setLoading } = useAuthStore();
  const { setTasks, setProjects, setLabels } = useTaskStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser({
          uid: user.uid,
          email: user.email!,
          displayName: user.displayName || undefined,
          photoURL: user.photoURL || undefined,
        });
        // Load user data here (tasks, projects, labels)
        loadUserData(user.uid);
      } else {
        setUser(null);
        // Clear data when user logs out
        setTasks([]);
        setProjects([]);
        setLabels([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setLoading, setTasks, setProjects, setLabels]);

  const loadUserData = async (userId: string) => {
    // Mock data for now - will be replaced with Firebase queries
    const mockTasks = [
      {
        id: '1',
        title: 'Complete project proposal',
        description: 'Write and submit the Q4 project proposal',
        completed: false,
        priority: 1 as const,
        dueDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        userId,
        labels: ['work'],
        subtasks: [],
      },
      {
        id: '2',
        title: 'Buy groceries',
        description: 'Milk, bread, eggs, fruits',
        completed: false,
        priority: 3 as const,
        dueDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        userId,
        labels: ['personal'],
        subtasks: [],
      },
      {
        id: '3',
        title: 'Review team performance',
        completed: true,
        priority: 2 as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId,
        labels: ['work'],
        subtasks: [],
      },
    ];

    const mockProjects = [
      {
        id: '1',
        name: 'Work Projects',
        color: '#3b82f6',
        userId,
        createdAt: new Date(),
        taskCount: 2,
      },
      {
        id: '2',
        name: 'Personal',
        color: '#10b981',
        userId,
        createdAt: new Date(),
        taskCount: 1,
      },
    ];

    const mockLabels = [
      {
        id: '1',
        name: 'work',
        color: '#3b82f6',
        userId,
      },
      {
        id: '2',
        name: 'personal',
        color: '#10b981',
        userId,
      },
    ];

    setTasks(mockTasks);
    setProjects(mockProjects);
    setLabels(mockLabels);
  };


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
