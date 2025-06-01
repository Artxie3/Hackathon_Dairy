import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Github, ExternalLink, Headphones, Music, GitBranch, GitCommit, GitPullRequest, Star, Users, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Dashboard.css';

interface GitHubStats {
  totalCommits: number;
  totalPRs: number;
  totalRepos: number;
  starredRepos: number;
  followers: number;
  following: number;
  topLanguages: { name: string; percentage: number }[];
  recentActivity: {
    type: string;
    repo: string;
    time: string;
    description: string;
  }[];
  commitsByDay: { day: string; count: number }[];
  commitsByHour: { hour: number; count: number }[];
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<GitHubStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Mock data for the dashboard
  const recentCommits = [
    { id: 1, message: 'Fix navbar responsiveness', repo: 'portfolio-website', time: '2 hours ago' },
    { id: 2, message: 'Add user authentication', repo: 'task-manager', time: '5 hours ago' },
    { id: 3, message: 'Update README with installation steps', repo: 'react-component-library', time: '1 day ago' },
  ];
  
  const projectsInProgress = [
    { id: 1, name: 'Task Manager App', progress: 70, deadline: '2023-05-15' },
    { id: 2, name: 'Portfolio Website', progress: 90, deadline: '2023-04-30' },
    { id: 3, name: 'React Component Library', progress: 40, deadline: '2023-06-10' },
  ];
  
  const listeningHistory = [
    { id: 1, title: 'Lofi Hip Hop Mix', platform: 'YouTube', duration: '2h 15m' },
    { id: 2, title: 'Coding Playlist', platform: 'Spotify', duration: '1h 45m' },
  ];

  useEffect(() => {
    const fetchGitHubStats = async () => {
      if (!user?.username) return;

      try {
        setLoading(true);
        setError(null);
        
        const token = localStorage.getItem('github_token');
        if (!token) {
          throw new Error('GitHub token not found');
        }

        // Fetch basic user info
        const userResponse = await fetch(`https://api.github.com/users/${user.username}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        });

        if (!userResponse.ok) {
          throw new Error('Failed to fetch user data');
        }

        const userData = await userResponse.json();

        // Fetch repositories
        const reposResponse = await fetch(`https://api.github.com/users/${user.username}/repos?per_page=100`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        });

        if (!reposResponse.ok) {
          throw new Error('Failed to fetch repositories');
        }

        const reposData = await reposResponse.json();

        // Fetch recent events
        const eventsResponse = await fetch(`https://api.github.com/users/${user.username}/events?per_page=30`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        });

        if (!eventsResponse.ok) {
          throw new Error('Failed to fetch events');
        }

        const eventsData = await eventsResponse.json();

        // Process languages
        const languagesMap = new Map<string, number>();
        for (const repo of reposData) {
          if (repo.language) {
            languagesMap.set(repo.language, (languagesMap.get(repo.language) || 0) + 1);
          }
        }

        const totalLanguages = Array.from(languagesMap.values()).reduce((a, b) => a + b, 0);
        const topLanguages = Array.from(languagesMap.entries())
          .map(([name, count]) => ({
            name,
            percentage: (count / totalLanguages) * 100
          }))
          .sort((a, b) => b.percentage - a.percentage)
          .slice(0, 5);

        // Process commit times
        const commitsByDay = new Array(7).fill(0);
        const commitsByHour = new Array(24).fill(0);
        const pushEvents = eventsData.filter((event: any) => event.type === 'PushEvent');
        
        pushEvents.forEach((event: any) => {
          const date = new Date(event.created_at);
          commitsByDay[date.getDay()]++;
          commitsByHour[date.getHours()]++;
        });

        // Format commit data
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const formattedCommitsByDay = commitsByDay.map((count, index) => ({
          day: daysOfWeek[index],
          count
        }));

        const formattedCommitsByHour = commitsByHour.map((count, hour) => ({
          hour,
          count
        }));

        // Process recent activity
        const recentActivity = eventsData.slice(0, 10).map((event: any) => ({
          type: event.type,
          repo: event.repo.name,
          time: new Date(event.created_at).toLocaleString(),
          description: event.type === 'PushEvent'
            ? `Pushed ${event.payload.commits?.length || 0} commits`
            : event.type === 'PullRequestEvent'
            ? `${event.payload.action} a pull request`
            : event.type === 'IssuesEvent'
            ? `${event.payload.action} an issue`
            : event.type
        }));

        // Calculate total commits from push events
        const totalCommits = pushEvents.reduce((total: number, event: any) => 
          total + (event.payload.commits?.length || 0), 0);

        // Count total PRs from events
        const totalPRs = eventsData.filter((event: any) => 
          event.type === 'PullRequestEvent' && event.payload.action === 'opened').length;

        setStats({
          totalCommits,
          totalPRs,
          totalRepos: reposData.length,
          starredRepos: userData.public_repos,
          followers: userData.followers,
          following: userData.following,
          topLanguages,
          recentActivity,
          commitsByDay: formattedCommitsByDay,
          commitsByHour: formattedCommitsByHour,
        });

      } catch (err) {
        console.error('Error fetching GitHub stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch GitHub data');
      } finally {
        setLoading(false);
      }
    };

    fetchGitHubStats();
  }, [user?.username]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 dark:text-red-400">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">GitHub Dashboard</h1>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <GitCommit className="text-blue-500" />
            <h2 className="text-xl font-semibold">Commits</h2>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalCommits}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <GitPullRequest className="text-green-500" />
            <h2 className="text-xl font-semibold">Pull Requests</h2>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalPRs}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <GitBranch className="text-purple-500" />
            <h2 className="text-xl font-semibold">Repositories</h2>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalRepos}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Languages Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Top Languages</h2>
          <div className="space-y-4">
            {stats.topLanguages.map(lang => (
              <div key={lang.name}>
                <div className="flex justify-between mb-1">
                  <span>{lang.name}</span>
                  <span>{lang.percentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${lang.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Commit Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Commit Activity</h2>
          <div className="space-y-6">
            {/* By Day */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Commits by Day
              </h3>
              <div className="flex justify-between items-end h-24">
                {stats.commitsByDay.map(day => {
                  const maxCount = Math.max(...stats.commitsByDay.map(d => d.count));
                  const height = day.count ? (day.count / maxCount) * 100 : 0;
                  return (
                    <div key={day.day} className="flex flex-col items-center">
                      <div
                        className="w-8 bg-blue-500 rounded-t"
                        style={{ height: `${height}%` }}
                      />
                      <span className="text-xs mt-2">{day.day}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* By Hour */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Commits by Hour
              </h3>
              <div className="flex justify-between items-end h-24">
                {stats.commitsByHour.map(hour => {
                  const maxCount = Math.max(...stats.commitsByHour.map(h => h.count));
                  const height = hour.count ? (hour.count / maxCount) * 100 : 0;
                  return (
                    <div key={hour.hour} className="flex flex-col items-center">
                      <div
                        className="w-2 bg-green-500 rounded-t"
                        style={{ height: `${height}%` }}
                      />
                      {hour.hour % 3 === 0 && (
                        <span className="text-xs mt-2">{hour.hour}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {stats.recentActivity.map((activity, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <Activity className="text-gray-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {activity.description} in {activity.repo}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;