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

// Alternative API endpoints to try in order
const DEVPOST_API_ENDPOINTS = [
  'https://devpost-user-and-project-information-api.epiccodewizard2.repl.co',
  'https://hackathons-api.vall1.repl.co', // Alternative from search results
];

// Demo data for fallback when APIs are unavailable
const getDemoUserData = (username: string): DevpostUserData => {
  const now = new Date();
  const futureDate1 = new Date(now);
  futureDate1.setDate(now.getDate() + 5);
  const futureDate2 = new Date(now);
  futureDate2.setDate(now.getDate() + 12);

  return {
    username,
    name: username.charAt(0).toUpperCase() + username.slice(1),
    bio: "Passionate developer and hackathon enthusiast building innovative solutions.",
    location: "San Francisco, CA",
    followers: 42,
    following: 28,
    projects: [
      {
        name: "AI Task Manager",
        description: "An intelligent task management system that uses AI to prioritize and organize your daily workflow.",
        url: "https://devpost.com/software/ai-task-manager",
        built_with: ["React", "Node.js", "OpenAI API", "MongoDB"],
        submitted_to: ["TreeHacks 2024", "AI Hackathon"],
        likes: 24,
        created_at: "2024-02-16T00:00:00Z"
      },
      {
        name: "EcoTrack",
        description: "A mobile app that gamifies sustainable living by tracking your carbon footprint and suggesting eco-friendly alternatives.",
        url: "https://devpost.com/software/ecotrack",
        built_with: ["React Native", "Firebase", "Python", "TensorFlow"],
        submitted_to: ["Climate Change Hackathon", "Sustainability Challenge"],
        likes: 18,
        created_at: "2024-01-20T00:00:00Z"
      },
      {
        name: "CodeCollab",
        description: "Real-time collaborative coding platform with integrated video chat and AI-powered code review.",
        url: "https://devpost.com/software/codecollab",
        built_with: ["Vue.js", "WebRTC", "Socket.io", "GitHub API"],
        submitted_to: ["Developer Tools Hackathon"],
        likes: 31,
        created_at: "2023-12-10T00:00:00Z"
      }
    ],
    hackathons: [
      {
        name: "Global AI Challenge 2024",
        url: "https://devpost.com/hackathons/global-ai-challenge-2024",
        submission_deadline: futureDate1.toISOString(),
        status: 'upcoming'
      },
      {
        name: "FinTech Innovation Summit",
        url: "https://devpost.com/hackathons/fintech-innovation-summit",
        submission_deadline: futureDate2.toISOString(),
        status: 'active'
      },
      {
        name: "TreeHacks 2024",
        url: "https://treehacks-2024.devpost.com/",
        submission_deadline: "2024-02-18T23:59:59Z",
        status: 'completed'
      }
    ],
    achievements: [
      {
        name: "First Place Winner",
        description: "Won first place at TreeHacks 2024",
        icon: "🏆",
        achievedOn: "2024-02-18"
      },
      {
        name: "People's Choice Award",
        description: "Most popular project at Climate Change Hackathon",
        icon: "❤️",
        achievedOn: "2024-01-22"
      },
      {
        name: "Best Technical Implementation",
        description: "Outstanding technical achievement in Developer Tools Hackathon",
        icon: "⚙️",
        achievedOn: "2023-12-12"
      }
    ],
    skills: ["JavaScript", "Python", "React", "Node.js", "AI/ML", "Cloud Computing"],
    links: {
      github: "https://github.com/" + username,
      linkedin: "https://linkedin.com/in/" + username,
      twitter: "https://twitter.com/" + username,
      website: "https://" + username + ".dev"
    }
  };
};

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

  const tryFetchFromAPIs = async (username: string): Promise<DevpostUserData | null> => {
    for (const apiEndpoint of DEVPOST_API_ENDPOINTS) {
      try {
        console.log(`Trying to fetch from: ${apiEndpoint}`);
        const response = await fetch(`${apiEndpoint}/user/${username}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        if (!response.ok) {
          console.log(`API ${apiEndpoint} responded with status: ${response.status}`);
          continue;
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

        console.log(`Successfully fetched data from: ${apiEndpoint}`);
        return transformedData;

      } catch (err) {
        console.log(`Failed to fetch from ${apiEndpoint}:`, err);
        continue;
      }
    }
    
    return null; // All APIs failed
  };

  const fetchDevpostData = async (username: string) => {
    try {
      setLoading(true);
      setError(null);

      // Try to fetch from real APIs first
      let transformedData = await tryFetchFromAPIs(username);
      
      // If all APIs fail, use demo data
      if (!transformedData) {
        console.log('All APIs unavailable, using demo data');
        transformedData = getDemoUserData(username);
        setError('Using demo data - Devpost API currently unavailable');
      }

      setUserData(transformedData);
      setUpcomingDeadlines(calculateUpcomingDeadlines(transformedData.hackathons));
      setLastUpdated(new Date());
      setIsConnected(true);

      console.log('Devpost data loaded successfully:', transformedData);

    } catch (err) {
      console.error('Error in fetchDevpostData:', err);
      
      // Even if there's an error, try to use demo data
      const demoData = getDemoUserData(username);
      setUserData(demoData);
      setUpcomingDeadlines(calculateUpcomingDeadlines(demoData.hackathons));
      setLastUpdated(new Date());
      setIsConnected(true);
      setError('Using demo data - Unable to connect to Devpost APIs');
      
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