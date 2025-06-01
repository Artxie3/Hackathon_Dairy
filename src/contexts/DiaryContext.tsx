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
  syncGitHubCommits: () => Promise<void>;
  isSyncing: boolean;
  lastSyncTime: Date | null;
}

const DiaryContext = createContext<DiaryContextType | undefined>(undefined);

export function DiaryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

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

  // Auto-sync GitHub commits on load and periodically
  useEffect(() => {
    if (!user?.username) return;

    // Load settings from localStorage
    const getSettings = () => {
      try {
        const savedSettings = localStorage.getItem('diary-settings');
        return savedSettings ? JSON.parse(savedSettings) : { autoSyncEnabled: true, syncInterval: 10, excludedRepos: [] };
      } catch {
        return { autoSyncEnabled: true, syncInterval: 10, excludedRepos: [] };
      }
    };

    const settings = getSettings();
    
    if (!settings.autoSyncEnabled) {
      console.log('Auto-sync disabled in settings');
      return;
    }

    // Initial sync
    syncGitHubCommits();

    // Set up periodic sync based on user settings
    const interval = setInterval(() => {
      const currentSettings = getSettings();
      if (currentSettings.autoSyncEnabled) {
        syncGitHubCommits();
      }
    }, settings.syncInterval * 60 * 1000);

    return () => clearInterval(interval);
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
      // Check for existing entry for this commit
      const existingEntry = entries.find(entry => entry.commit_hash === commitHash);
      
      if (!existingEntry) {
        await createEntry({
          title: message.split('\n')[0] || 'New Commit',
          content: message.split('\n').slice(1).join('\n').trim() || '',
          commit_hash: commitHash,
          commit_repo: repo,
          is_draft: true,
          tags: ['commit', 'auto-generated'],
        });
      }
    } catch (err) {
      console.error('Error handling commit event:', err);
      setError('Failed to create entry for commit');
    }
  };

  const syncGitHubCommits = async () => {
    if (!user?.username || isSyncing) return;

    try {
      setIsSyncing(true);
      console.log('Syncing GitHub commits...');

      // Load settings for repository exclusions
      const getSettings = () => {
        try {
          const savedSettings = localStorage.getItem('diary-settings');
          return savedSettings ? JSON.parse(savedSettings) : { excludedRepos: [] };
        } catch {
          return { excludedRepos: [] };
        }
      };

      const settings = getSettings();
      const excludedRepos = settings.excludedRepos || [];

      const token = localStorage.getItem('github_token');
      if (!token) {
        console.log('No GitHub token found');
        return;
      }

      // Fetch recent events from GitHub API
      const eventsResponse = await fetch(`https://api.github.com/users/${user.username}/events?per_page=50`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!eventsResponse.ok) {
        throw new Error('Failed to fetch GitHub events');
      }

      const events = await eventsResponse.json();
      console.log('Fetched GitHub events:', events.length);

      // Filter push events (commits)
      const pushEvents = events.filter((event: any) => event.type === 'PushEvent');
      console.log('Found push events:', pushEvents.length);

      let newEntriesCount = 0;

      for (const event of pushEvents) {
        const { payload, repo, created_at } = event;
        const repoName = repo.name;

        // Check if this repository is excluded
        if (excludedRepos.includes(repoName)) {
          console.log(`Skipping excluded repository: ${repoName}`);
          continue;
        }

        const commits = payload.commits || [];

        for (const commit of commits) {
          // Check if we already have an entry for this commit
          const existingEntry = entries.find(entry => 
            entry.commit_hash === commit.sha
          );

          if (!existingEntry) {
            console.log('Creating entry for commit:', commit.sha);
            
            // Extract meaningful content from commit message
            const lines = commit.message.split('\n');
            const title = lines[0] || 'Commit';
            const content = lines.slice(1).filter((line: string) => line.trim()).join('\n').trim();

            // Determine tags based on commit message
            const tags = ['commit', 'auto-generated'];
            const message = commit.message.toLowerCase();
            
            if (message.includes('fix') || message.includes('bug')) {
              tags.push('bug-fix');
            }
            if (message.includes('feat') || message.includes('feature')) {
              tags.push('feature');
            }
            if (message.includes('refactor')) {
              tags.push('refactor');
            }
            if (message.includes('test')) {
              tags.push('testing');
            }
            if (message.includes('doc')) {
              tags.push('documentation');
            }

            try {
              await createEntry({
                title,
                content: content || `Committed changes to ${repoName}`,
                commit_hash: commit.sha,
                commit_repo: repoName,
                is_draft: true,
                tags,
                created_at: created_at,
              });
              newEntriesCount++;
            } catch (createError) {
              console.error('Error creating entry for commit:', commit.sha, createError);
            }
          }
        }
      }

      setLastSyncTime(new Date());
      console.log(`Sync completed. Created ${newEntriesCount} new entries.`);
      
      if (newEntriesCount > 0) {
        setError(null);
      }

    } catch (err) {
      console.error('Error syncing GitHub commits:', err);
      setError('Failed to sync GitHub commits');
    } finally {
      setIsSyncing(false);
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
      syncGitHubCommits,
      isSyncing,
      lastSyncTime,
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