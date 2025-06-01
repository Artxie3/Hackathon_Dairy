import React, { useState } from 'react';
import { Clock, Globe, Save, AlertCircle } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

const Settings: React.FC = () => {
  const { timezone, darkMode, updateSettings } = useSettings();
  const [tempSettings, setTempSettings] = useState({
    timezone,
    darkMode,
  });
  const [saved, setSaved] = useState(false);

  const timezones = [
    { value: 'GMT-12', label: 'GMT-12 (Baker Island)' },
    { value: 'GMT-11', label: 'GMT-11 (American Samoa)' },
    { value: 'GMT-10', label: 'GMT-10 (Hawaii)' },
    { value: 'GMT-9', label: 'GMT-9 (Alaska)' },
    { value: 'GMT-8', label: 'GMT-8 (Pacific Time)' },
    { value: 'GMT-7', label: 'GMT-7 (Mountain Time)' },
    { value: 'GMT-6', label: 'GMT-6 (Central Time)' },
    { value: 'GMT-5', label: 'GMT-5 (Eastern Time) - Hackathon Default', important: true },
    { value: 'GMT-4', label: 'GMT-4 (Atlantic Time)' },
    { value: 'GMT-3', label: 'GMT-3 (Brazil)' },
    { value: 'GMT-2', label: 'GMT-2 (South Georgia)' },
    { value: 'GMT-1', label: 'GMT-1 (Azores)' },
    { value: 'GMT+0', label: 'GMT+0 (London, Dublin)' },
    { value: 'GMT+1', label: 'GMT+1 (Berlin, Paris, Rome)' },
    { value: 'GMT+2', label: 'GMT+2 (Cairo, Helsinki)' },
    { value: 'GMT+3', label: 'GMT+3 (Moscow, Istanbul)' },
    { value: 'GMT+4', label: 'GMT+4 (Dubai, Baku)' },
    { value: 'GMT+5', label: 'GMT+5 (Karachi, Tashkent)' },
    { value: 'GMT+5:30', label: 'GMT+5:30 (India, Sri Lanka)' },
    { value: 'GMT+6', label: 'GMT+6 (Dhaka, Almaty)' },
    { value: 'GMT+7', label: 'GMT+7 (Bangkok, Jakarta)' },
    { value: 'GMT+8', label: 'GMT+8 (Beijing, Singapore)' },
    { value: 'GMT+9', label: 'GMT+9 (Tokyo, Seoul)' },
    { value: 'GMT+10', label: 'GMT+10 (Sydney, Melbourne)' },
    { value: 'GMT+11', label: 'GMT+11 (Noumea, Solomon Islands)' },
    { value: 'GMT+12', label: 'GMT+12 (Fiji, New Zealand)' },
  ];

  const handleSave = () => {
    updateSettings(tempSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const getCurrentTime = (tz: string) => {
    const now = new Date();
    const offset = parseFloat(tz.replace('GMT', ''));
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const targetTime = new Date(utc + (offset * 3600000));
    return targetTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>
        
        {/* Timezone Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="text-blue-500" size={20} />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Timezone Configuration</h2>
          </div>
          
          {/* Timezone Warning */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-amber-600 dark:text-amber-400 mt-0.5" size={16} />
              <div>
                <h3 className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                  Important: Hackathon Deadlines
                </h3>
                <p className="text-amber-700 dark:text-amber-300 text-sm">
                  Most hackathons use GMT-5 (Eastern Time) for their deadlines. Setting your correct timezone 
                  ensures you see accurate deadline times and don't miss submissions.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Timezone
              </label>
              <select
                value={tempSettings.timezone}
                onChange={(e) => setTempSettings({ ...tempSettings, timezone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {timezones.map((tz) => (
                  <option key={tz.value} value={tz.value} className={tz.important ? 'font-bold' : ''}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Time in Your Timezone
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 
                            rounded-md text-gray-900 dark:text-white font-mono">
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  {getCurrentTime(tempSettings.timezone)}
                </div>
              </div>
            </div>
          </div>

          {/* Time Comparison */}
          {tempSettings.timezone !== 'GMT-5' && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">Time Comparison</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 dark:text-blue-300">Your Time ({tempSettings.timezone}):</span>
                  <div className="font-mono font-bold">{getCurrentTime(tempSettings.timezone)}</div>
                </div>
                <div>
                  <span className="text-blue-700 dark:text-blue-300">Hackathon Time (GMT-5):</span>
                  <div className="font-mono font-bold">{getCurrentTime('GMT-5')}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Theme Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Appearance</h2>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="darkMode"
              checked={tempSettings.darkMode}
              onChange={(e) => setTempSettings({ ...tempSettings, darkMode: e.target.checked })}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded 
                       focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 
                       focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="darkMode" className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
              Enable Dark Mode
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 
                     text-white rounded-md transition-colors focus:ring-2 focus:ring-blue-500 
                     focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            <Save size={16} />
            Save Settings
          </button>
          
          {saved && (
            <span className="text-green-600 dark:text-green-400 text-sm font-medium">
              ✓ Settings saved successfully!
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings; 