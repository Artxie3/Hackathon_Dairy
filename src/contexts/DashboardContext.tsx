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
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Helper function to get date range
  const getDateRange = (days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    return { startDate, endDate };
  };

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
      
      // Take only the most recent 10 commits for display
      const recentCommits = allCommits.slice(0, 10);

      setStats({
        todaysCommits,
        weeklyCommits,
        monthlyCommits,
        recentCommits,
        commitActivity,
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