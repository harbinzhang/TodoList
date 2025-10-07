import { useState, useRef, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { useAuthStore } from '../../store/authStore';
import { useTaskStore } from '../../store/taskStore';
import {
  UserIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  PrinterIcon,
  GiftIcon,
  ArrowRightOnRectangleIcon,
  ArrowPathIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

const ProfileDropdown = () => {
  const { user } = useAuthStore();
  const { tasks } = useTaskStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const completedTasks = tasks.filter(task => task.completed).length;
  const totalTasks = tasks.length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = () => {
    signOut(auth);
    setIsOpen(false);
  };

  const getInitials = () => {
    if (user?.displayName) {
      return user.displayName.split(' ').map(name => name[0]).join('').toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  const menuItems = [
    {
      icon: UserIcon,
      label: user?.displayName || user?.email || 'User',
      subtitle: `${completedTasks}/${totalTasks} tasks`,
      isHeader: true,
    },
    { type: 'divider' },
    {
      icon: Cog6ToothIcon,
      label: 'Settings',
      shortcut: 'O then S',
      onClick: () => {
        // Settings functionality
        setIsOpen(false);
      },
    },
    {
      icon: ChartBarIcon,
      label: 'Activity log',
      shortcut: 'G then A',
      onClick: () => {
        // Activity log functionality
        setIsOpen(false);
      },
    },
    {
      icon: PrinterIcon,
      label: 'Print',
      shortcut: '⌘ P',
      onClick: () => {
        window.print();
        setIsOpen(false);
      },
    },
    {
      icon: GiftIcon,
      label: "What's new",
      onClick: () => {
        // What's new functionality
        setIsOpen(false);
      },
    },
    { type: 'divider' },
    {
      icon: ArrowPathIcon,
      label: 'Sync',
      subtitle: '9 seconds ago',
      onClick: () => {
        // Sync functionality
        setIsOpen(false);
      },
    },
    { type: 'divider' },
    {
      icon: ArrowRightOnRectangleIcon,
      label: 'Log out',
      onClick: handleSignOut,
      danger: true,
    },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation min-h-[44px]"
      >
        <div className="flex items-center space-x-2 md:space-x-3">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt="Profile"
              className="w-8 h-8 md:w-9 md:h-9 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 md:w-9 md:h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {getInitials()}
            </div>
          )}
          <span className="hidden sm:block font-medium text-gray-900 text-sm md:text-base">
            {user?.displayName?.split(' ')[0] || 'Haibin'}
          </span>
        </div>
        <ChevronDownIcon 
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 md:w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {menuItems.map((item, index) => {
            if (item.type === 'divider') {
              return <div key={index} className="my-1 border-t border-gray-100" />;
            }

            if (item.isHeader) {
              return (
                <div key={index} className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    {user?.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="Profile"
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                        {getInitials()}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-gray-900">{item.label}</div>
                      <div className="text-sm text-gray-500">{item.subtitle}</div>
                    </div>
                  </div>
                </div>
              );
            }

            const Icon = item.icon!;
            return (
              <button
                key={index}
                onClick={item.onClick}
                className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors touch-manipulation ${
                  item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-5 h-5" />
                  <div>
                    <span className="block">{item.label}</span>
                    {item.subtitle && (
                      <span className="text-xs text-gray-500">{item.subtitle}</span>
                    )}
                  </div>
                </div>
                {item.shortcut && (
                  <span className="text-xs text-gray-400">{item.shortcut}</span>
                )}
              </button>
            );
          })}
          
          <div className="px-4 py-2 border-t border-gray-100 mt-1">
            <div className="text-xs text-gray-400">
              v8951 · <span className="hover:text-gray-600 cursor-pointer">Changelog</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;