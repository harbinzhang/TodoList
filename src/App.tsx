import { useTheme } from './hooks/useTheme';
import { useUndoQueue } from './hooks/useUndoQueue';
import { useAuthSession } from './providers/useAuthSession';
import AuthForm from './components/auth/AuthForm';
import Sidebar from './components/layout/Sidebar';
import MainContent from './components/layout/MainContent';
import SettingsModal from './components/common/SettingsModal';
import UndoToast from './components/common/UndoToast';

import { UndoQueueContext } from './context/UndoQueueContext';

function App() {
  const { user, loading } = useAuthSession();
  useTheme(); // Activate theme management
  const undoQueue = useUndoQueue();

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
