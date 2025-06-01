import React, { useState, useEffect } from 'react';
import { GitBranch, RefreshCw, Save, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useDiary } from '../contexts/DiaryContext';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';

const Settings: React.FC = () => {
  const { syncGitHubCommits, isSyncing, lastSyncTime } = useDiary();
  const { user } = useAuth();
  const { timezone, updateSettings } = useSettings();
  const [localTimezone, setLocalTimezone] = useState(timezone);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [syncInterval, setSyncInterval] = useState(10); // minutes
  const [excludedRepos, setExcludedRepos] = useState<string[]>([]);
  const [newExcludedRepo, setNewExcludedRepo] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [desktopNotifications, setDesktopNotifications] = useState(false);
  const [theme, setTheme] = useState('system');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('diary-settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setAutoSyncEnabled(settings.autoSyncEnabled ?? true);
        setSyncInterval(settings.syncInterval ?? 10);
        setExcludedRepos(settings.excludedRepos ?? []);
        setEmailNotifications(settings.emailNotifications ?? false);
        setDesktopNotifications(settings.desktopNotifications ?? false);
        setTheme(settings.theme ?? 'system');
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, []);

  const handleSaveSettings = async () => {
    setSaveStatus('saving');
    
    const settings = {
      autoSyncEnabled,
      syncInterval,
      excludedRepos,
      emailNotifications,
      desktopNotifications,
      theme,
    };

    try {
      localStorage.setItem('diary-settings', JSON.stringify(settings));
      
      // Update timezone settings
      updateSettings({ timezone: localTimezone });
      
      setSaveStatus('saved');
      
      // Apply theme immediately
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        // System theme
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }

      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const handleAddExcludedRepo = () => {
    if (newExcludedRepo.trim() && !excludedRepos.includes(newExcludedRepo.trim())) {
      setExcludedRepos([...excludedRepos, newExcludedRepo.trim()]);
      setNewExcludedRepo('');
    }
  };

  const handleRemoveExcludedRepo = (repo: string) => {
    setExcludedRepos(excludedRepos.filter(r => r !== repo));
  };

  const formatLastSyncTime = (time: Date | null) => {
    if (!time) return 'Never';
    return time.toLocaleString();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Settings</h1>
      
      <div className="space-y-8">
        {/* Timezone Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="text-blue-600 dark:text-blue-400" size={24} />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Timezone Settings</h2>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="font-medium text-yellow-800 dark:text-yellow-300 mb-1">Important Notice</h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    Hackathon deadlines are displayed in GMT-5 timezone. Setting your local timezone helps you see equivalent times but doesn't change the actual deadlines.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Timezone
              </label>
              <select
                value={localTimezone}
                onChange={(e) => setLocalTimezone(e.target.value)}
                className="form-select block w-full max-w-md px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="GMT-12">GMT-12 (Baker Island)</option>
                <option value="GMT-11">GMT-11 (Samoa)</option>
                <option value="GMT-10">GMT-10 (Hawaii)</option>
                <option value="GMT-9">GMT-9 (Alaska)</option>
                <option value="GMT-8">GMT-8 (Pacific Time)</option>
                <option value="GMT-7">GMT-7 (Mountain Time)</option>
                <option value="GMT-6">GMT-6 (Central Time)</option>
                <option value="GMT-5">GMT-5 (Eastern Time / Hackathon Time)</option>
                <option value="GMT-4">GMT-4 (Atlantic Time)</option>
                <option value="GMT-3">GMT-3 (Brazil)</option>
                <option value="GMT-2">GMT-2 (Mid-Atlantic)</option>
                <option value="GMT-1">GMT-1 (Azores)</option>
                <option value="GMT+0">GMT+0 (London, Dublin)</option>
                <option value="GMT+1">GMT+1 (Central Europe)</option>
                <option value="GMT+2">GMT+2 (Eastern Europe)</option>
                <option value="GMT+3">GMT+3 (Moscow, Istanbul)</option>
                <option value="GMT+4">GMT+4 (Dubai, Baku)</option>
                <option value="GMT+5">GMT+5 (Pakistan, Uzbekistan)</option>
                <option value="GMT+5:30">GMT+5:30 (India, Sri Lanka)</option>
                <option value="GMT+6">GMT+6 (Bangladesh, Kazakhstan)</option>
                <option value="GMT+7">GMT+7 (Thailand, Vietnam)</option>
                <option value="GMT+8">GMT+8 (China, Singapore)</option>
                <option value="GMT+9">GMT+9 (Japan, Korea)</option>
                <option value="GMT+10">GMT+10 (Australia East)</option>
                <option value="GMT+11">GMT+11 (Solomon Islands)</option>
                <option value="GMT+12">GMT+12 (New Zealand)</option>
              </select>
              
              {localTimezone !== 'GMT-5' && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Time difference:</strong> Your timezone is {getTimeDifference(localTimezone)} from hackathon time (GMT-5).
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* GitHub Integration */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <GitBranch className="text-green-600 dark:text-green-400" size={24} />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">GitHub Integration</h2>
          </div>
          
          <div className="space-y-6">
            {/* Sync Status */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Sync Status</h3>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <p><strong>Connected Account:</strong> {user?.username || 'Not connected'}</p>
                <p><strong>Last Sync:</strong> {formatLastSyncTime(lastSyncTime)}</p>
                <button
                  onClick={syncGitHubCommits}
                  disabled={isSyncing}
                  className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSyncing ? (
                    <RefreshCw className="animate-spin" size={16} />
                  ) : (
                    <GitBranch size={16} />
                  )}
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
            </div>

            {/* Auto-sync Settings */}
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-4">Auto-sync Configuration</h3>
              <div className="space-y-4">
                <label className="flex items-center space-x-3">
                  <input 
                    type="checkbox" 
                    checked={autoSyncEnabled}
                    onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                    className="form-checkbox h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Enable automatic sync</span>
                </label>
                
                {autoSyncEnabled && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sync Interval
                    </label>
                    <select 
                      value={syncInterval}
                      onChange={(e) => setSyncInterval(Number(e.target.value))}
                      className="form-select block w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-green-500 focus:border-green-500"
                    >
                      <option value={5}>Every 5 minutes</option>
                      <option value={10}>Every 10 minutes</option>
                      <option value={15}>Every 15 minutes</option>
                      <option value={30}>Every 30 minutes</option>
                      <option value={60}>Every hour</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Repository Exclusions */}
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-4">Repository Exclusions</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Exclude specific repositories from automatic diary entry creation.
              </p>
              
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newExcludedRepo}
                    onChange={(e) => setNewExcludedRepo(e.target.value)}
                    placeholder="owner/repository-name"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-green-500 focus:border-green-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddExcludedRepo()}
                  />
                  <button
                    onClick={handleAddExcludedRepo}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                  >
                    Add
                  </button>
                </div>
                
                {excludedRepos.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Excluded repositories:</p>
                    <div className="flex flex-wrap gap-2">
                      {excludedRepos.map(repo => (
                        <span
                          key={repo}
                          className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-full text-sm"
                        >
                          {repo}
                          <button
                            onClick={() => handleRemoveExcludedRepo(repo)}
                            className="hover:text-red-900 dark:hover:text-red-100"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Application Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Application Settings</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-4">Notifications</h3>
              <div className="space-y-4">
                <label className="flex items-center space-x-3">
                  <input 
                    type="checkbox" 
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Enable email notifications</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input 
                    type="checkbox" 
                    checked={desktopNotifications}
                    onChange={(e) => setDesktopNotifications(e.target.checked)}
                    className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Enable desktop notifications</span>
                </label>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-4">Theme Preferences</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Theme Mode</label>
                <select 
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="form-select block w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button 
            onClick={handleSaveSettings}
            disabled={saveStatus === 'saving'}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saveStatus === 'saving' ? (
              <RefreshCw className="animate-spin" size={20} />
            ) : saveStatus === 'saved' ? (
              <CheckCircle size={20} />
            ) : saveStatus === 'error' ? (
              <AlertCircle size={20} />
            ) : (
              <Save size={20} />
            )}
            {saveStatus === 'saving' ? 'Saving...' : 
             saveStatus === 'saved' ? 'Saved!' : 
             saveStatus === 'error' ? 'Error!' : 
             'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper function to calculate time difference
const getTimeDifference = (userTimezone: string): string => {
  const hackathonOffset = -5; // GMT-5
  const userOffset = parseInt(userTimezone.replace('GMT', '').replace('+', ''));
  const difference = userOffset - hackathonOffset;
  
  if (difference > 0) {
    return `${difference} hours ahead`;
  } else if (difference < 0) {
    return `${Math.abs(difference)} hours behind`;
  } else {
    return 'the same';
  }
};

export default Settings; 