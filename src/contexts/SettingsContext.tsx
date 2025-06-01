import React, { createContext, useContext, useState, useEffect } from 'react';

interface Settings {
  timezone: string;
  darkMode: boolean;
  // Add more settings as needed
}

interface SettingsContextType {
  timezone: string;
  darkMode: boolean;
  updateSettings: (settings: Partial<Settings>) => void;
}

const defaultSettings: Settings = {
  timezone: 'GMT-5', // Default to hackathon timezone
  darkMode: false,
};

const SettingsContext = createContext<SettingsContextType>({
  ...defaultSettings,
  updateSettings: () => {},
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(() => {
    // Load settings from localStorage on initial render
    const savedSettings = localStorage.getItem('journal_settings');
    if (savedSettings) {
      return JSON.parse(savedSettings);
    }
    return defaultSettings;
  });

  useEffect(() => {
    // Save settings to localStorage whenever they change
    localStorage.setItem('journal_settings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings,
    }));
  };

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        updateSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}; 