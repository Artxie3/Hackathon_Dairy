import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface SettingsContextType {
  timezone: string;
  setTimezone: (timezone: string) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [timezone, setTimezoneState] = useState<string>('GMT-5');

  // Load settings from localStorage
  useEffect(() => {
    if (!user?.username) return;

    const savedSettings = localStorage.getItem(`settings_${user.username}`);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed.timezone) {
          setTimezoneState(parsed.timezone);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, [user?.username]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (user?.username) {
      const settings = { timezone };
      localStorage.setItem(`settings_${user.username}`, JSON.stringify(settings));
    }
  }, [timezone, user?.username]);

  const setTimezone = (newTimezone: string) => {
    setTimezoneState(newTimezone);
  };

  return (
    <SettingsContext.Provider value={{
      timezone,
      setTimezone,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
} 