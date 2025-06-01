import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Github, ExternalLink, Headphones, Music, GitCommit, SmilePlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Dashboard.css';
import ActivityCalendar from '../components/ActivityCalendar';

interface GitHubCommit {
  sha: string;
  repo: string;
  message: string;
  timestamp: string;
}

interface DailyStats {
  commits: number;
  codingTime: string;
  listenedTime: string;
  mood: string;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [recentCommits, setRecentCommits] = useState<GitHubCommit[]>([]);
  const [todayStats, setTodayStats] = useState<DailyStats>({
    commits: 0,
    codingTime: '0h 0m',
    listenedTime: '0h 0m',
    mood: 'Productive'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGitHubData = async () => {
      if (!user?.username) return;

      try {
        setIsLoading(true);
        const token = localStorage.getItem('github_token');
        if (!token) {
          throw new Error('GitHub token not found');
        }

        // Fetch user's events from GitHub
        const eventsResponse = await fetch(
          `https://api.github.com/users/${user.username}/events?per_page=30`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );

        if (!eventsResponse.ok) {
          throw new Error('Failed to fetch GitHub events');
        }

        const events = await eventsResponse.json();
        
        // Process push events to get commits
        const today = new Date().toDateString();
        let todayCommitsCount = 0;
        const processedCommits: GitHubCommit[] = [];

        events.forEach((event: any) => {
          if (event.type === 'PushEvent') {
            const eventDate = new Date(event.created_at).toDateString();
            if (eventDate === today) {
              todayCommitsCount += event.payload.commits?.length || 0;
            }

            event.payload.commits?.forEach((commit: any) => {
              processedCommits.push({
                sha: commit.sha,
                repo: event.repo.name,
                message: commit.message,
                timestamp: event.created_at
              });
            });
          }
        });

        // Update state with processed data
        setRecentCommits(processedCommits.slice(0, 5)); // Keep only 5 most recent commits
        setTodayStats(prev => ({
          ...prev,
          commits: todayCommitsCount
        }));

        setError(null);
      } catch (err) {
        console.error('Error fetching GitHub data:', err);
        setError('Failed to load GitHub data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGitHubData();
    // Refresh data every 5 minutes
    const interval = setInterval(fetchGitHubData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.username]);

  const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'just now';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        Welcome back, {user?.username || 'Developer'}
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        {new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </p>

      {/* Today's Stats */}
      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-white mb-6">Today's Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-700/50 rounded-lg p-4 flex items-center">
            <div className="bg-indigo-500/20 p-3 rounded-lg mr-4">
              <Clock className="h-6 w-6 text-indigo-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Coding Time</p>
              <p className="text-white text-xl font-semibold">{todayStats.codingTime}</p>
            </div>
          </div>

          <div className="bg-gray-700/50 rounded-lg p-4 flex items-center">
            <div className="bg-indigo-500/20 p-3 rounded-lg mr-4">
              <GitCommit className="h-6 w-6 text-indigo-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Commits</p>
              <p className="text-white text-xl font-semibold">{todayStats.commits}</p>
            </div>
          </div>

          <div className="bg-gray-700/50 rounded-lg p-4 flex items-center">
            <div className="bg-indigo-500/20 p-3 rounded-lg mr-4">
              <Headphones className="h-6 w-6 text-indigo-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Listened</p>
              <p className="text-white text-xl font-semibold">{todayStats.listenedTime}</p>
            </div>
          </div>

          <div className="bg-gray-700/50 rounded-lg p-4 flex items-center">
            <div className="bg-indigo-500/20 p-3 rounded-lg mr-4">
              <SmilePlus className="h-6 w-6 text-indigo-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Mood</p>
              <p className="text-white text-xl font-semibold">{todayStats.mood}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Commits */}
      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Recent Commits</h2>
          <a
            href={`https://github.com/${user?.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 text-sm"
          >
            View all
          </a>
        </div>
        <div className="space-y-4">
          {recentCommits.map(commit => (
            <div key={commit.sha} className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-white font-medium">{commit.message.split('\n')[0]}</h3>
                <span className="text-gray-400 text-sm">{formatTimeAgo(commit.timestamp)}</span>
              </div>
              <p className="text-gray-400 text-sm">{commit.repo}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Activity Calendar</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <span className="text-gray-400 text-sm">Less</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-sm bg-gray-700/50"></div>
                <div className="w-3 h-3 rounded-sm bg-indigo-900/40"></div>
                <div className="w-3 h-3 rounded-sm bg-indigo-700/60"></div>
                <div className="w-3 h-3 rounded-sm bg-indigo-500/80"></div>
                <div className="w-3 h-3 rounded-sm bg-indigo-400"></div>
              </div>
              <span className="text-gray-400 text-sm">More</span>
            </div>
          </div>
        </div>
        <ActivityCalendar className="h-64" />
      </div>
    </div>
  );
};

export default Dashboard;