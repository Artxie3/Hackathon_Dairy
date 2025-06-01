import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface DevpostAchievement {
  achievedOn: string;
  description: string;
  icon: string;
  name: string;
}

interface DevpostProject {
  name: string;
  description: string;
  url: string;
  built_with: string[];
  submitted_to: string[];
  likes: number;
  created_at: string;
  gallery?: Array<{
    caption: string;
    url: string;
  }>;
}

interface DevpostHackathon {
  name: string;
  url: string;
  submission_deadline?: string;
  status: 'upcoming' | 'active' | 'completed';
  projects?: DevpostProject[];
}

interface DevpostUserData {
  username: string;
  name: string;
  bio: string;
  location: string;
  followers: number;
  following: number;
  projects: DevpostProject[];
  hackathons: DevpostHackathon[];
  achievements: DevpostAchievement[];
  skills: string[];
  links: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
}

interface UpcomingDeadline {
  hackathon: string;
  deadline: Date;
  daysLeft: number;
  url: string;
}

interface DevpostContextType {
  userData: DevpostUserData | null;
  upcomingDeadlines: UpcomingDeadline[];
  loading: boolean;
  error: string | null;
  refreshDevpostData: () => Promise<void>;
  connectDevpost: (username: string) => Promise<void>;
  lastUpdated: Date | null;
  isConnected: boolean;
}

const DevpostContext = createContext<DevpostContextType | undefined>(undefined);

const DEVPOST_API_BASE = 'https://devpost-user-and-project-information-api.epiccodewizard2.repl.co';

export function DevpostProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [userData, setUserData] = useState<DevpostUserData | null>(null);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<UpcomingDeadline[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Load saved Devpost username from localStorage
  useEffect(() => {
    const savedUsername = localStorage.getItem('devpost_username');
    if (savedUsername && user) {
      setIsConnected(true);
      // Auto-fetch data if we have a saved username
      fetchDevpostData(savedUsername);
    }
  }, [user]);

  // Calculate upcoming deadlines from hackathons
  const calculateUpcomingDeadlines = (hackathons: DevpostHackathon[]): UpcomingDeadline[] => {
    const now = new Date();
    const deadlines: UpcomingDeadline[] = [];

    hackathons.forEach(hackathon => {
      if (hackathon.submission_deadline && hackathon.status !== 'completed') {
        const deadline = new Date(hackathon.submission_deadline);
        const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysLeft >= 0) { // Only include future deadlines
          deadlines.push({
            hackathon: hackathon.name,
            deadline,
            daysLeft,
            url: hackathon.url,
          });
        }
      }
    });

    // Sort by closest deadline first
    return deadlines.sort((a, b) => a.daysLeft - b.daysLeft);
  };

  const fetchDevpostData = async (username: string) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch user data from the API
      const response = await fetch(`${DEVPOST_API_BASE}/user/${username}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Devpost data: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform the data to match our interface
      const transformedData: DevpostUserData = {
        username: data.username || username,
        name: data.name || '',
        bio: data.bio || '',
        location: data.location || '',
        followers: data.followers || 0,
        following: data.following || 0,
        projects: data.projects || [],
        hackathons: data.hackathons || [],
        achievements: data.achievements || [],
        skills: data.skills || [],
        links: data.links || {},
      };

      setUserData(transformedData);
      setUpcomingDeadlines(calculateUpcomingDeadlines(transformedData.hackathons));
      setLastUpdated(new Date());
      setIsConnected(true);

      console.log('Devpost data fetched successfully:', transformedData);

    } catch (err) {
      console.error('Error fetching Devpost data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch Devpost data');
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const connectDevpost = async (username: string) => {
    // Save username to localStorage
    localStorage.setItem('devpost_username', username);
    await fetchDevpostData(username);
  };

  const refreshDevpostData = async () => {
    const savedUsername = localStorage.getItem('devpost_username');
    if (savedUsername) {
      await fetchDevpostData(savedUsername);
    } else {
      setError('No Devpost username configured');
    }
  };

  // Auto-refresh data every 30 minutes
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      refreshDevpostData();
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isConnected]);

  return (
    <DevpostContext.Provider value={{
      userData,
      upcomingDeadlines,
      loading,
      error,
      refreshDevpostData,
      connectDevpost,
      lastUpdated,
      isConnected,
    }}>
      {children}
    </DevpostContext.Provider>
  );
}

export function useDevpost() {
  const context = useContext(DevpostContext);
  if (context === undefined) {
    throw new Error('useDevpost must be used within a DevpostProvider');
  }
  return context;
} 