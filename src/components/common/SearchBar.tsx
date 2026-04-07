import { useState } from 'react';
import { useTaskStore } from '../../store/taskStore';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const SearchBar = () => {
  const { filter, setFilter } = useTaskStore();
  const [searchTerm, setSearchTerm] = useState(filter.search || '');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setFilter({ search: value || undefined });
  };

  const handleClear = () => {
    setSearchTerm('');
    setFilter({ search: undefined });
  };

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
      </div>
      <input
        type="text"
        value={searchTerm}
        onChange={handleSearchChange}
        placeholder="Search tasks..."
        className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      />
      {searchTerm && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
        >
          <span className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm">✕</span>
        </button>
      )}
    </div>
  );
};

export default SearchBar;