import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface GitHubCommit {
  sha: string;
  message: string;
  repo: string;
  date: string;
  url: string;
}

interface DashboardStats {
  todaysCommits: number;
  weeklyCommits: number;
  monthlyCommits: number;
  recentCommits: GitHubCommit[];
  commitActivity: { [date: string]: number };
  codingTime: { hours: number; minutes: number };
}

interface DashboardContextType {
  stats: DashboardStats;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  lastUpdated: Date | null;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    todaysCommits: 0,
    weeklyCommits: 0,
    monthlyCommits: 0,
    recentCommits: [],
    commitActivity: {},
    codingTime: { hours: 0, minutes: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Helper function to format date for API
  const formatDateForAPI = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // Helper function to check if date is today
  const isToday = (date: string) => {
    const today = new Date();
    const checkDate = new Date(date);
    return checkDate.toDateString() === today.toDateString();
  };

  // Helper function to check if date is within last week
  const isThisWeek = (date: string) => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const checkDate = new Date(date);
    return checkDate >= weekAgo;
  };

  // Helper function to check if date is within last month
  const isThisMonth = (date: string) => {
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const checkDate = new Date(date);
    return checkDate >= monthAgo;
  };

  // Helper function to calculate coding time based on commit intervals
  const calculateCodingTime = (commits: GitHubCommit[]): { hours: number; minutes: number } => {
    if (commits.length === 0) return { hours: 0, minutes: 0 };

    // Filter commits from today
    const todayCommits = commits.filter(commit => isToday(commit.date));
    
    if (todayCommits.length === 0) return { hours: 0, minutes: 0 };

    // Sort commits by time
    const sortedCommits = todayCommits.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let totalMinutes = 0;
    let sessionStart: Date | null = null;
    let lastCommitTime: Date | null = null;

    for (const commit of sortedCommits) {
      const commitTime = new Date(commit.date);
      
      if (sessionStart === null) {
        // First commit of the day - start a session
        sessionStart = commitTime;
        lastCommitTime = commitTime;
        continue;
      }

      const timeDiff = commitTime.getTime() - lastCommitTime!.getTime();
      const minutesDiff = timeDiff / (1000 * 60);

      if (minutesDiff <= 15) {
        // Within 15 minutes - continue the session
        lastCommitTime = commitTime;
      } else if (minutesDiff <= 60) {
        // Between 15-60 minutes - count as working time
        totalMinutes += minutesDiff;
        lastCommitTime = commitTime;
      } else {
        // More than 60 minutes - end session, start new one
        if (sessionStart && lastCommitTime) {
          const sessionDuration = lastCommitTime.getTime() - sessionStart.getTime();
          totalMinutes += sessionDuration / (1000 * 60);
        }
        sessionStart = commitTime;
        lastCommitTime = commitTime;
      }
    }

    // Add the last session if it's still active
    if (sessionStart && lastCommitTime) {
      const now = new Date();
      const timeSinceLastCommit = now.getTime() - lastCommitTime.getTime();
      const minutesSinceLastCommit = timeSinceLastCommit / (1000 * 60);
      
      if (minutesSinceLastCommit <= 60) {
        // If last commit was within an hour, count the session
        const sessionDuration = lastCommitTime.getTime() - sessionStart.getTime();
        totalMinutes += sessionDuration / (1000 * 60);
      }
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);

    return { hours, minutes };
  };

  const fetchGitHubData = async () => {
    if (!user?.username) return;

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('github_token');
      if (!token) {
        throw new Error('No GitHub token found');
      }

      // Fetch recent events (commits)
      const eventsResponse = await fetch(`https://api.github.com/users/${user.username}/events?per_page=100`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!eventsResponse.ok) {
        throw new Error('Failed to fetch GitHub events');
      }

      const events = await eventsResponse.json();
      
      // Filter push events and extract commits
      const pushEvents = events.filter((event: any) => event.type === 'PushEvent');
      
      let allCommits: GitHubCommit[] = [];
      let commitActivity: { [date: string]: number } = {};
      
      // Process commits from events
      for (const event of pushEvents) {
        const { payload, repo, created_at } = event;
        const commits = payload.commits || [];
        
        for (const commit of commits) {
          const commitDate = new Date(created_at);
          const dateKey = formatDateForAPI(commitDate);
          
          // Count commits per day
          commitActivity[dateKey] = (commitActivity[dateKey] || 0) + 1;
          
          // Add to recent commits list
          allCommits.push({
            sha: commit.sha,
            message: commit.message,
            repo: repo.name,
            date: created_at,
            url: `https://github.com/${repo.name}/commit/${commit.sha}`,
          });
        }
      }

      // Sort commits by date (most recent first)
      allCommits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Calculate stats
      const todaysCommits = allCommits.filter(commit => isToday(commit.date)).length;
      const weeklyCommits = allCommits.filter(commit => isThisWeek(commit.date)).length;
      const monthlyCommits = allCommits.filter(commit => isThisMonth(commit.date)).length;
      
      // Calculate coding time
      const codingTime = calculateCodingTime(allCommits);
      
      // Take only the most recent 10 commits for display
      const recentCommits = allCommits.slice(0, 10);

      setStats({
        todaysCommits,
        weeklyCommits,
        monthlyCommits,
        recentCommits,
        commitActivity,
        codingTime,
      });

      setLastUpdated(new Date());
      console.log('Dashboard data refreshed successfully');

    } catch (err) {
      console.error('Error fetching GitHub data:', err);
      setError('Failed to fetch GitHub data');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh data when user changes or component mounts
  useEffect(() => {
    if (user?.username) {
      fetchGitHubData();
    }
  }, [user?.username]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (user?.username) {
        fetchGitHubData();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user?.username]);

  const refreshData = async () => {
    await fetchGitHubData();
  };

  return (
    <DashboardContext.Provider value={{
      stats,
      loading,
      error,
      refreshData,
      lastUpdated,
    }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
} 