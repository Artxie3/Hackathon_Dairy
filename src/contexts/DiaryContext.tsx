import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { DiaryEntry, diaryEntries } from '../utils/supabase';

interface TemporaryDraft {
  id: string;
  title: string;
  content: string;
  commit_hash: string;
  commit_repo: string;
  commit_message: string;
  created_at: string;
  tags: string[];
  isTemporary: true;
}

interface DiaryContextType {
  entries: DiaryEntry[];
  temporaryDrafts: TemporaryDraft[];
  loading: boolean;
  error: string | null;
  createEntry: (entry: Partial<DiaryEntry>) => Promise<DiaryEntry>;
  updateEntry: (id: string, updates: Partial<DiaryEntry>) => Promise<DiaryEntry>;
  deleteEntry: (id: string) => Promise<void>;
  handleCommitEvent: (commitHash: string, repo: string, message: string) => Promise<void>;
  syncGitHubCommits: () => Promise<void>;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  convertTemporaryDraft: (draftId: string) => Promise<DiaryEntry>;
  dismissTemporaryDraft: (draftId: string) => void;
}

const DiaryContext = createContext<DiaryContextType | undefined>(undefined);

export function DiaryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [temporaryDrafts, setTemporaryDrafts] = useState<TemporaryDraft[]>([]);
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

  const convertTemporaryDraft = async (draftId: string): Promise<DiaryEntry> => {
    const draft = temporaryDrafts.find(d => d.id === draftId);
    if (!draft) throw new Error('Draft not found');

    // Create the actual entry in the database
    const newEntry = await createEntry({
      title: draft.title || 'Untitled Entry',
      content: draft.content || '', // Keep content empty if not filled by user
      commit_hash: draft.commit_hash,
      commit_repo: draft.commit_repo,
      is_draft: true,
      tags: draft.tags,
      created_at: draft.created_at,
    });

    // Remove from temporary drafts
    setTemporaryDrafts(prev => prev.filter(d => d.id !== draftId));

    return newEntry;
  };

  const dismissTemporaryDraft = (draftId: string) => {
    setTemporaryDrafts(prev => prev.filter(d => d.id !== draftId));
  };

  const handleCommitEvent = async (commitHash: string, repo: string, message: string) => {
    if (!user?.username) return;

    try {
      // Check for existing entry for this commit (both saved and temporary)
      const existingEntry = entries.find(entry => entry.commit_hash === commitHash);
      const existingDraft = temporaryDrafts.find(draft => draft.commit_hash === commitHash);
      
      if (!existingEntry && !existingDraft) {
        // Remove any existing automatic temporary drafts before creating a new one
        // This ensures only the latest commit has a temporary draft
        setTemporaryDrafts(prev => prev.filter(draft => !draft.tags.includes('commit')));

        // Create temporary draft instead of saving immediately
        const lines = message.split('\n');
        const commitMessage = lines[0] || '';

        // Ensure repo name is in owner/repo format
        const repoName = repo.includes('/') ? repo : `${user.username}/${repo}`;

        const temporaryDraft: TemporaryDraft = {
          id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: '', // Don't use commit message as title
          content: '', // Keep content empty for user to fill
          commit_hash: commitHash,
          commit_repo: repoName,
          commit_message: commitMessage,
          created_at: new Date().toISOString(),
          tags: ['commit'], // Only add "commit" tag
          isTemporary: true,
        };

        setTemporaryDrafts(prev => [temporaryDraft, ...prev]);
        console.log('Created temporary draft for commit (discarded previous automatic drafts):', commitHash);
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

      // First, get user's repositories
      const reposResponse = await fetch(`https://api.github.com/user/repos?sort=updated&per_page=10`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!reposResponse.ok) {
        throw new Error('Failed to fetch repositories');
      }

      const repos = await reposResponse.json();
      console.log('Fetched repositories:', repos.length);

      let latestCommitTime = null;
      let latestCommitData = null;

      // Check commits from each repository
      for (const repo of repos) {
        const repoName = repo.full_name;

        // Check if this repository is excluded
        if (excludedRepos.includes(repoName)) {
          console.log(`Skipping excluded repo: ${repoName}`);
          continue;
        }

        try {
          // Get recent commits from this repository
          const commitsResponse = await fetch(`https://api.github.com/repos/${repoName}/commits?per_page=10&author=${user.username}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/vnd.github.v3+json',
            },
          });

          if (!commitsResponse.ok) {
            console.log(`Failed to fetch commits for ${repoName}`);
            continue;
          }

          const commits = await commitsResponse.json();
          console.log(`Found ${commits.length} commits in ${repoName}`);

          for (const commit of commits) {
            // Use the commit date from the commit object
            const commitTime = new Date(commit.commit.committer.date);
            
            console.log(`Checking commit: ${commit.sha.substring(0, 7)} - ${commit.commit.message.split('\n')[0]} - ${commitTime.toISOString()}`);
            
            // Check if we already have an entry or draft for this commit
            const existingEntry = entries.find(entry => 
              entry.commit_hash === commit.sha
            );
            const existingDraft = temporaryDrafts.find(draft => 
              draft.commit_hash === commit.sha
            );

            if (!existingEntry && !existingDraft) {
              console.log(`  -> Commit ${commit.sha.substring(0, 7)} is new and eligible`);
              // Track the latest commit
              if (!latestCommitTime || commitTime > latestCommitTime) {
                console.log(`  -> This is now the latest commit (previous: ${latestCommitTime?.toISOString() || 'none'})`);
                latestCommitTime = commitTime;
                latestCommitData = {
                  commit: {
                    sha: commit.sha,
                    message: commit.commit.message,
                    timestamp: commit.commit.committer.date
                  },
                  repoName: repoName, // Use full repository name (owner/repo format)
                  created_at: commit.commit.committer.date
                };
              }
            } else {
              console.log(`  -> Commit ${commit.sha.substring(0, 7)} already exists, skipping`);
            }
          }
        } catch (err) {
          console.error(`Error fetching commits for ${repoName}:`, err);
        }
      }

      // If we found a latest commit, create a draft for it (and remove any existing automatic drafts)
      if (latestCommitData) {
        console.log('Creating temporary draft for latest commit:', latestCommitData.commit.sha);
        
        // Remove any existing automatic temporary drafts before creating the new one
        setTemporaryDrafts(prev => prev.filter(draft => !draft.tags.includes('commit')));
        
        // Extract meaningful content from commit message
        const lines = latestCommitData.commit.message.split('\n');
        const commitMessage = lines[0] || '';

        const temporaryDraft: TemporaryDraft = {
          id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: '', // Don't use commit message as title
          content: '', // Keep content empty for user to fill
          commit_hash: latestCommitData.commit.sha,
          commit_repo: latestCommitData.repoName, // Keep using repoName from latestCommitData
          commit_message: commitMessage,
          created_at: latestCommitData.created_at,
          tags: ['commit'], // Only add "commit" tag
          isTemporary: true,
        };

        setTemporaryDrafts(prev => [temporaryDraft, ...prev]);
      }

      setLastSyncTime(new Date());
      console.log(`Sync completed. ${latestCommitData ? `Created temporary draft for latest commit (1 draft total).` : 'No new commits found.'}`);
      
      if (latestCommitData) {
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
      temporaryDrafts,
      loading,
      error,
      createEntry,
      updateEntry,
      deleteEntry,
      handleCommitEvent,
      syncGitHubCommits,
      isSyncing,
      lastSyncTime,
      convertTemporaryDraft,
      dismissTemporaryDraft,
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