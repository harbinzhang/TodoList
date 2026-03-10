import { useState, useMemo, useEffect } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import {
  XMarkIcon,
  GlobeAltIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon,
  SwatchIcon,
  UserCircleIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

type SettingsTab = 'general' | 'appearance' | 'account';

const SettingsModal = () => {
  const { timezone, setTimezone, isSettingsOpen, closeSettings } = useSettingsStore();
  const { theme, setTheme } = useTheme();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [search, setSearch] = useState('');
  const [showTimezoneList, setShowTimezoneList] = useState(false);

  // Reset tab and search when modal opens
  useEffect(() => {
    if (isSettingsOpen) {
      setActiveTab('general');
      setSearch('');
      setShowTimezoneList(false);
    }
  }, [isSettingsOpen]);

  const allTimezones = useMemo(() => {
    try {
      return Intl.supportedValuesOf('timeZone');
    } catch {
      return [
        'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
        'America/Anchorage', 'Pacific/Honolulu', 'Europe/London', 'Europe/Paris',
        'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata',
        'Australia/Sydney', 'Pacific/Auckland', 'UTC',
      ];
    }
  }, []);

  const filteredTimezones = useMemo(() => {
    if (!search.trim()) return allTimezones;
    const searchLower = search.toLowerCase();
    return allTimezones.filter(tz => tz.toLowerCase().includes(searchLower));
  }, [allTimezones, search]);

  if (!isSettingsOpen) return null;

  const tabs: { id: SettingsTab; label: string; icon: typeof Cog6ToothIcon }[] = [
    { id: 'general', label: 'General', icon: Cog6ToothIcon },
    { id: 'appearance', label: 'Appearance', icon: SwatchIcon },
    { id: 'account', label: 'Account', icon: UserCircleIcon },
  ];

  const themeOptions: { value: 'light' | 'dark' | 'system'; label: string; icon: typeof SunIcon }[] = [
    { value: 'light', label: 'Light', icon: SunIcon },
    { value: 'dark', label: 'Dark', icon: MoonIcon },
    { value: 'system', label: 'System', icon: ComputerDesktopIcon },
  ];

  const formatTimezone = (tz: string) => {
    const parts = tz.split('/');
    const city = (parts[parts.length - 1] || tz).replace(/_/g, ' ');
    const region = parts.length > 1 ? parts[0].replace(/_/g, ' ') : '';
    return { city, region };
  };

  const currentTzFormatted = formatTimezone(timezone);

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={(e) => { if (e.target === e.currentTarget) closeSettings(); }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[80vh] border border-gray-200/50 dark:border-gray-700/50">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h2>
          <button
            onClick={closeSettings}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar Tabs */}
          <div className="w-48 flex-shrink-0 border-r border-gray-100 dark:border-gray-800 py-3 px-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                    activeTab === tab.id
                      ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto py-5 px-6">
            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">General</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Manage your timezone and regional preferences.</p>
                </div>

                {/* Timezone Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <GlobeAltIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Timezone</label>
                  </div>

                  {/* Current timezone display — click to expand */}
                  <button
                    onClick={() => setShowTimezoneList(!showTimezoneList)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-100 dark:border-blue-500/20 hover:bg-blue-100/60 dark:hover:bg-blue-500/15 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CheckIcon className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300 truncate">{currentTzFormatted.city}</p>
                        {currentTzFormatted.region && (
                          <p className="text-xs text-blue-500/70 dark:text-blue-400/60">{currentTzFormatted.region}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-blue-500 dark:text-blue-400 flex-shrink-0">{showTimezoneList ? 'Hide' : 'Change'}</span>
                  </button>

                  {showTimezoneList && (
                    <>
                      {/* Search */}
                      <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search timezones..."
                          className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 transition-colors"
                          autoFocus
                        />
                      </div>

                      {/* Timezone List */}
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden max-h-52 overflow-y-auto">
                        {filteredTimezones.length === 0 ? (
                          <div className="px-4 py-6 text-center text-sm text-gray-400">No timezones found</div>
                        ) : (
                          filteredTimezones.map((tz) => {
                            const fmt = formatTimezone(tz);
                            const isSelected = tz === timezone;
                            return (
                              <button
                                key={tz}
                                onClick={() => { setTimezone(tz); setShowTimezoneList(false); }}
                                className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm transition-colors border-b border-gray-100 dark:border-gray-800 last:border-b-0 ${
                                  isSelected
                                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <span className="font-medium">{fmt.city}</span>
                                  {fmt.region && (
                                    <span className="text-gray-400 dark:text-gray-500 ml-1.5 text-xs">{fmt.region}</span>
                                  )}
                                </div>
                                {isSelected && <CheckIcon className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0 ml-2" />}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Appearance</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Customize how the app looks and feels.</p>
                </div>

                {/* Theme Switcher */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Theme</label>
                  <div className="grid grid-cols-3 gap-2">
                    {themeOptions.map((opt) => {
                      const Icon = opt.icon;
                      const isActive = theme === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setTheme(opt.value)}
                          className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                            isActive
                              ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-500/10 shadow-sm'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isActive
                              ? 'bg-blue-100 dark:bg-blue-500/20'
                              : 'bg-gray-100 dark:bg-gray-800'
                          }`}>
                            <Icon className={`w-5 h-5 ${
                              isActive
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-gray-500 dark:text-gray-400'
                            }`} />
                          </div>
                          <span className={`text-sm font-medium ${
                            isActive
                              ? 'text-blue-700 dark:text-blue-300'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}>
                            {opt.label}
                          </span>
                          {isActive && (
                            <div className="absolute top-2 right-2">
                              <div className="w-4 h-4 bg-blue-500 dark:bg-blue-400 rounded-full flex items-center justify-center">
                                <CheckIcon className="w-2.5 h-2.5 text-white" />
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {theme === 'system'
                      ? 'Automatically matches your operating system preference.'
                      : `The app will always use ${theme} mode.`}
                  </p>
                </div>
              </div>
            )}

            {/* Account Tab */}
            {activeTab === 'account' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Account</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Your account information and preferences.</p>
                </div>

                {/* Profile Card */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
                  <div className="flex items-center gap-4">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="Profile" className="w-12 h-12 rounded-full" />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                        {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {user?.displayName || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Account Details */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Email</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{user?.email || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Display name</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{user?.displayName || '—'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
