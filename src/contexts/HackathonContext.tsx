import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { hackathonEntries, type HackathonEntry } from '../utils/supabase';

export interface Hackathon {
  id: string;
  title: string;
  organizer: string;
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
  prizes: string[];
  notes: string;
  created_at: string;
  updated_at: string;
  timezone?: string;
  attachments?: string[]; // URLs to uploaded files
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
  uploadFile: (file: File, hackathonId: string) => Promise<string>;
  deleteFile: (fileUrl: string, hackathonId: string) => Promise<void>;
  syncFromLocalStorage: () => Promise<void>;
}

const HackathonContext = createContext<HackathonContextType | undefined>(undefined);

// Helper function to convert between interface formats
const convertToHackathon = (entry: HackathonEntry): Hackathon => ({
  id: entry.id,
  title: entry.title,
  organizer: entry.organizer,
  description: entry.description,
  startDate: entry.start_date,
  endDate: entry.end_date,
  submissionDeadline: entry.submission_deadline,
  status: entry.status,
  devpostUrl: entry.devpost_url,
  projectTitle: entry.project_title,
  projectDescription: entry.project_description,
  projectUrl: entry.project_url,
  teamMembers: entry.team_members || [],
  technologies: entry.technologies || [],
  prizes: entry.prizes || [],
  notes: entry.notes || '',
  created_at: entry.created_at,
  updated_at: entry.updated_at,
  timezone: entry.timezone,
  attachments: entry.attachments || []
});

const convertToHackathonEntry = (hackathon: Partial<Hackathon>, userId: string): Partial<HackathonEntry> => ({
  user_id: userId,
  title: hackathon.title,
  organizer: hackathon.organizer,
  description: hackathon.description,
  start_date: hackathon.startDate,
  end_date: hackathon.endDate,
  submission_deadline: hackathon.submissionDeadline,
  status: hackathon.status,
  devpost_url: hackathon.devpostUrl,
  project_title: hackathon.projectTitle,
  project_description: hackathon.projectDescription,
  project_url: hackathon.projectUrl,
  team_members: hackathon.teamMembers || [],
  technologies: hackathon.technologies || [],
  prizes: hackathon.prizes || [],
  notes: hackathon.notes || '',
  timezone: hackathon.timezone,
  attachments: hackathon.attachments || []
});

export function HackathonProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load hackathons from Supabase
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const loadHackathons = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const entries = await hackathonEntries.getByUser(String(user.id));
        const convertedHackathons = entries.map(convertToHackathon);
        setHackathons(convertedHackathons);
      } catch (err) {
        console.error('Error loading hackathons:', err);
        setError('Failed to load hackathons from database. Falling back to local storage.');
        
        // Fallback to localStorage if Supabase fails
        try {
          const savedHackathons = localStorage.getItem(`hackathons_${user.username}`);
          if (savedHackathons) {
            const parsed = JSON.parse(savedHackathons);
            setHackathons(parsed);
          }
        } catch (localErr) {
          console.error('Error loading from localStorage:', localErr);
          setError('Failed to load hackathons');
        }
      } finally {
        setLoading(false);
      }
    };

    loadHackathons();
  }, [user?.id, user?.username]);

  // Sync data from localStorage to Supabase (migration helper)
  const syncFromLocalStorage = async () => {
    if (!user?.id || !user?.username) return;

    try {
      const savedHackathons = localStorage.getItem(`hackathons_${user.username}`);
      if (!savedHackathons) return;

      const localHackathons: Hackathon[] = JSON.parse(savedHackathons);
      console.log(`Found ${localHackathons.length} hackathons in localStorage, syncing to Supabase...`);

      for (const hackathon of localHackathons) {
        try {
          // Check if this hackathon already exists in Supabase
          const existingEntries = await hackathonEntries.getByUser(String(user.id));
          const exists = existingEntries.some(entry => 
            entry.title === hackathon.title && 
            entry.start_date === hackathon.startDate
          );

          if (!exists) {
            const entryData = convertToHackathonEntry(hackathon, String(user.id));
            await hackathonEntries.create(entryData);
            console.log(`Synced hackathon: ${hackathon.title}`);
          }
        } catch (syncErr) {
          console.error(`Failed to sync hackathon ${hackathon.title}:`, syncErr);
        }
      }

      // Reload hackathons from Supabase
      const entries = await hackathonEntries.getByUser(String(user.id));
      const convertedHackathons = entries.map(convertToHackathon);
      setHackathons(convertedHackathons);

      console.log('Sync from localStorage completed successfully');
    } catch (err) {
      console.error('Error syncing from localStorage:', err);
      throw err;
    }
  };

  const addHackathon = async (hackathonData: Omit<Hackathon, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      const entryData = convertToHackathonEntry(hackathonData, String(user.id));
      const newEntry = await hackathonEntries.create(entryData);
      const newHackathon = convertToHackathon(newEntry);
      
      setHackathons(prev => [newHackathon, ...prev]);
      return newHackathon;
    } catch (err) {
      console.error('Error adding hackathon:', err);
      
      // Fallback to localStorage
      const fallbackHackathon: Hackathon = {
        ...hackathonData,
        id: `hackathon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        attachments: hackathonData.attachments || []
      };
      
      setHackathons(prev => {
        const updated = [fallbackHackathon, ...prev];
        localStorage.setItem(`hackathons_${user.username}`, JSON.stringify(updated));
        return updated;
      });
      
      setError('Hackathon saved locally. Will sync when connection is restored.');
      return fallbackHackathon;
    }
  };

  const updateHackathon = async (id: string, updates: Partial<Hackathon>) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      const entryUpdates = convertToHackathonEntry(updates, String(user.id));
      const updatedEntry = await hackathonEntries.update(id, entryUpdates);
      const updatedHackathon = convertToHackathon(updatedEntry);
      
      setHackathons(prev => prev.map(h => h.id === id ? updatedHackathon : h));
      return updatedHackathon;
    } catch (err) {
      console.error('Error updating hackathon:', err);
      
      // Fallback to localStorage
      const updatedHackathon = {
        ...hackathons.find(h => h.id === id)!,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      
      setHackathons(prev => {
        const updated = prev.map(h => h.id === id ? updatedHackathon : h);
        localStorage.setItem(`hackathons_${user.username}`, JSON.stringify(updated));
        return updated;
      });
      
      setError('Hackathon updated locally. Will sync when connection is restored.');
      return updatedHackathon;
    }
  };

  const deleteHackathon = async (id: string) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      await hackathonEntries.delete(id);
      setHackathons(prev => prev.filter(h => h.id !== id));
    } catch (err) {
      console.error('Error deleting hackathon:', err);
      
      // Fallback to localStorage
      setHackathons(prev => {
        const updated = prev.filter(h => h.id !== id);
        localStorage.setItem(`hackathons_${user.username}`, JSON.stringify(updated));
        return updated;
      });
      
      setError('Hackathon deleted locally. Will sync when connection is restored.');
    }
  };

  const uploadFile = async (file: File, hackathonId: string): Promise<string> => {
    const { uploadHackathonFile } = await import('../utils/supabase');
    
    try {
      const fileUrl = await uploadHackathonFile(file, hackathonId);
      
      // Update the hackathon with the new attachment
      const hackathon = hackathons.find(h => h.id === hackathonId);
      if (hackathon) {
        const updatedAttachments = [...(hackathon.attachments || []), fileUrl];
        await updateHackathon(hackathonId, { attachments: updatedAttachments });
      }
      
      return fileUrl;
    } catch (err) {
      console.error('Error uploading file:', err);
      throw new Error('Failed to upload file. Please try again.');
    }
  };

  const deleteFile = async (fileUrl: string, hackathonId: string): Promise<void> => {
    const { deleteHackathonFile } = await import('../utils/supabase');
    
    try {
      await deleteHackathonFile(fileUrl);
      
      // Update the hackathon to remove the attachment
      const hackathon = hackathons.find(h => h.id === hackathonId);
      if (hackathon) {
        const updatedAttachments = (hackathon.attachments || []).filter(url => url !== fileUrl);
        await updateHackathon(hackathonId, { attachments: updatedAttachments });
      }
    } catch (err) {
      console.error('Error deleting file:', err);
      throw new Error('Failed to delete file. Please try again.');
    }
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
      uploadFile,
      deleteFile,
      syncFromLocalStorage,
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