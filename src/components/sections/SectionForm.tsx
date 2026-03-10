import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useTaskStore } from '../../store/taskStore';
import { sectionService } from '../../services/sectionService';

interface SectionFormProps {
  projectId: string;
}

const SectionForm = ({ projectId }: SectionFormProps) => {
  const { user } = useAuthStore();
  const { sections } = useTaskStore();
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !user) return;

    setLoading(true);
    try {
      // Calculate next sortOrder
      const projectSections = sections.filter(s => s.projectId === projectId);
      const maxOrder = projectSections.reduce((max, s) => Math.max(max, s.sortOrder), 0);

      await sectionService.createSection({
        name: name.trim(),
        projectId,
        userId: user.uid,
        sortOrder: maxOrder + 1,
      });

      setName('');
      setIsAdding(false);
    } catch (error) {
      console.error('Error creating section:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setName('');
      setIsAdding(false);
    }
  };

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="w-full text-left text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 py-2 px-1 mt-2"
      >
        + Add section
      </button>
    );
  }

  return (
    <div className="mt-2 flex items-center space-x-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (!name.trim()) setIsAdding(false);
        }}
        placeholder="Section name"
        className="flex-1 text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
        autoFocus
        disabled={loading}
      />
      <button
        onClick={handleSubmit}
        disabled={!name.trim() || loading}
        className="px-3 py-1.5 text-xs text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded"
      >
        Add
      </button>
      <button
        onClick={() => { setName(''); setIsAdding(false); }}
        className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        Cancel
      </button>
    </div>
  );
};

export default SectionForm;
