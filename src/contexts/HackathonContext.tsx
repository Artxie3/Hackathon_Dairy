import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export interface Hackathon {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  submissionDeadline: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'submitted';
  devpostUrl?: string;
  projectTitle?: string;
  projectDescription?: string;
  projectUrl?: string;
  teamMembers: string[];
  technologies: string[];
  notes: string;
  created_at: string;
  updated_at: string;
}

interface HackathonContextType {
  hackathons: Hackathon[];
  loading: boolean;
  error: string | null;
  addHackathon: (hackathon: Omit<Hackathon, 'id' | 'created_at' | 'updated_at'>) => Promise<Hackathon>;
  updateHackathon: (id: string, updates: Partial<Hackathon>) => Promise<Hackathon>;
  deleteHackathon: (id: string) => Promise<void>;
  getUpcomingDeadlines: () => Hackathon[];
  getOngoingHackathons: () => Hackathon[];
  getCompletedHackathons: () => Hackathon[];
}

const HackathonContext = createContext<HackathonContextType | undefined>(undefined);

export function HackathonProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load hackathons from localStorage (since we don't have a backend for this demo)
  useEffect(() => {
    if (!user?.username) return;

    const loadHackathons = async () => {
      try {
        setLoading(true);
        const savedHackathons = localStorage.getItem(`hackathons_${user.username}`);
        if (savedHackathons) {
          const parsed = JSON.parse(savedHackathons);
          setHackathons(parsed);
        }
      } catch (err) {
        console.error('Error loading hackathons:', err);
        setError('Failed to load hackathons');
      } finally {
        setLoading(false);
      }
    };

    loadHackathons();
  }, [user?.username]);

  // Save hackathons to localStorage whenever they change
  useEffect(() => {
    if (user?.username && hackathons.length >= 0) {
      localStorage.setItem(`hackathons_${user.username}`, JSON.stringify(hackathons));
    }
  }, [hackathons, user?.username]);

  const addHackathon = async (hackathonData: Omit<Hackathon, 'id' | 'created_at' | 'updated_at'>) => {
    const newHackathon: Hackathon = {
      ...hackathonData,
      id: `hackathon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setHackathons(prev => [newHackathon, ...prev]);
    return newHackathon;
  };

  const updateHackathon = async (id: string, updates: Partial<Hackathon>) => {
    const updatedHackathon = {
      ...hackathons.find(h => h.id === id)!,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    setHackathons(prev => prev.map(h => h.id === id ? updatedHackathon : h));
    return updatedHackathon;
  };

  const deleteHackathon = async (id: string) => {
    setHackathons(prev => prev.filter(h => h.id !== id));
  };

  const getUpcomingDeadlines = () => {
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return hackathons.filter(hackathon => {
      const deadline = new Date(hackathon.submissionDeadline);
      return deadline >= now && deadline <= oneWeekFromNow && hackathon.status !== 'completed';
    }).sort((a, b) => new Date(a.submissionDeadline).getTime() - new Date(b.submissionDeadline).getTime());
  };

  const getOngoingHackathons = () => {
    const now = new Date();
    return hackathons.filter(hackathon => {
      const start = new Date(hackathon.startDate);
      const end = new Date(hackathon.endDate);
      return start <= now && end >= now;
    });
  };

  const getCompletedHackathons = () => {
    return hackathons.filter(hackathon => hackathon.status === 'completed' || hackathon.status === 'submitted')
      .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
  };

  return (
    <HackathonContext.Provider value={{
      hackathons,
      loading,
      error,
      addHackathon,
      updateHackathon,
      deleteHackathon,
      getUpcomingDeadlines,
      getOngoingHackathons,
      getCompletedHackathons,
    }}>
      {children}
    </HackathonContext.Provider>
  );
}

export function useHackathons() {
  const context = useContext(HackathonContext);
  if (context === undefined) {
    throw new Error('useHackathons must be used within a HackathonProvider');
  }
  return context;
} 