import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { DiaryEntry, diaryEntries } from '../utils/supabase';

interface DiaryContextType {
  entries: DiaryEntry[];
  loading: boolean;
  error: string | null;
  createEntry: (entry: Partial<DiaryEntry>) => Promise<DiaryEntry>;
  updateEntry: (id: string, updates: Partial<DiaryEntry>) => Promise<DiaryEntry>;
  deleteEntry: (id: string) => Promise<void>;
  handleCommitEvent: (commitHash: string, repo: string, message: string) => Promise<void>;
}

const DiaryContext = createContext<DiaryContextType | undefined>(undefined);

export function DiaryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user's entries
  useEffect(() => {
    if (!user?.username) return;

    const loadEntries = async () => {
      try {
        setLoading(true);
        const data = await diaryEntries.getByUser(user.username);
        setEntries(data);
      } catch (err) {
        console.error('Error loading entries:', err);
        setError('Failed to load diary entries');
      } finally {
        setLoading(false);
      }
    };

    loadEntries();
  }, [user?.username]);

  const createEntry = async (entry: Partial<DiaryEntry>) => {
    if (!user?.username) throw new Error('User not authenticated');

    const newEntry = await diaryEntries.create({
      ...entry,
      user_id: user.username,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    setEntries(prev => [newEntry, ...prev]);
    return newEntry;
  };

  const updateEntry = async (id: string, updates: Partial<DiaryEntry>) => {
    const updatedEntry = await diaryEntries.update(id, {
      ...updates,
      updated_at: new Date().toISOString(),
    });

    setEntries(prev => prev.map(entry => 
      entry.id === id ? updatedEntry : entry
    ));

    return updatedEntry;
  };

  const deleteEntry = async (id: string) => {
    await diaryEntries.delete(id);
    setEntries(prev => prev.filter(entry => entry.id !== id));
  };

  const handleCommitEvent = async (commitHash: string, repo: string, message: string) => {
    if (!user?.username) return;

    try {
      // Check for existing draft entry for this commit
      const existingDraft = await diaryEntries.getDraftByCommit(user.username, commitHash);

      // If there's no draft, create one
      if (!existingDraft) {
        await createEntry({
          title: message,
          content: '',
          commit_hash: commitHash,
          commit_repo: repo,
          is_draft: true,
          tags: [],
        });
      }

      // Delete any other drafts that haven't been edited
      const oldDrafts = entries.filter(entry => 
        entry.is_draft && 
        entry.commit_hash !== commitHash && 
        !entry.content.trim()
      );

      for (const draft of oldDrafts) {
        await deleteEntry(draft.id);
      }
    } catch (err) {
      console.error('Error handling commit event:', err);
      setError('Failed to create entry for commit');
    }
  };

  return (
    <DiaryContext.Provider value={{
      entries,
      loading,
      error,
      createEntry,
      updateEntry,
      deleteEntry,
      handleCommitEvent,
    }}>
      {children}
    </DiaryContext.Provider>
  );
}

export function useDiary() {
  const context = useContext(DiaryContext);
  if (context === undefined) {
    throw new Error('useDiary must be used within a DiaryProvider');
  }
  return context;
} 