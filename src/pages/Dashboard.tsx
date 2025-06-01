import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, Github, ExternalLink, Headphones, Music, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDashboard } from '../contexts/DashboardContext';
import Calendar from '../components/Calendar';
import '../styles/Dashboard.css';
import '../styles/Calendar.css';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { stats, loading, error, refreshData, lastUpdated } = useDashboard();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Helper function to format time
  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const commitDate = new Date(dateString);
    const diffInMs = now.getTime() - commitDate.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInDays === 1) {
      return '1 day ago';
    } else {
      return `${diffInDays} days ago`;
    }
  };

  // Helper function to extract repository name
  const getRepoName = (fullName: string) => {
    return fullName.split('/').pop() || fullName;
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  };

  const handleDateClick = (date: Date) => {
    // Navigate to diary entries for the selected date
    // This could open a modal or navigate to diary page with date filter
    console.log('Clicked date:', date);
    // You could implement navigation to diary page with date filter here
  };

  // Mock data for listening history (can be extended later)
  const listeningHistory = [
    { id: 1, title: 'Lofi Hip Hop Mix', platform: 'YouTube', duration: '2h 15m' },
    { id: 2, title: 'Coding Playlist', platform: 'Spotify', duration: '1h 45m' },
  ];
  
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Welcome back, {user?.name || 'Developer'}</h1>
            <p className="dashboard-date">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              {lastUpdated && (
                <span style={{ marginLeft: '1rem', fontSize: '0.75rem', opacity: 0.7 }}>
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
            style={{
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              opacity: isRefreshing ? 0.7 : 1,
            }}
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </header>
      
      {error && (
        <div style={{
          background: '#fee2e2',
          color: '#dc2626',
          padding: '1rem',
          borderRadius: '0.5rem',
          marginBottom: '1rem',
          fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}
      
      <div className="dashboard-grid">
        {/* Stats Overview */}
        <div className="dashboard-card stats-card">
          <h2>Today's Stats</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-icon coding-time">
                <Clock size={20} />
              </div>
              <div className="stat-info">
                <h3>Coding Time</h3>
                <p className="stat-value">{loading ? '...' : '4h 25m'}</p>
              </div>
            </div>
            
            <div className="stat-item">
              <div className="stat-icon commits">
                <Github size={20} />
              </div>
              <div className="stat-info">
                <h3>Commits</h3>
                <p className="stat-value">{loading ? '...' : stats.todaysCommits}</p>
              </div>
            </div>
            
            <div className="stat-item">
              <div className="stat-icon listened">
                <Headphones size={20} />
              </div>
              <div className="stat-info">
                <h3>Listened</h3>
                <p className="stat-value">{loading ? '...' : '3h 40m'}</p>
              </div>
            </div>
            
            <div className="stat-item">
              <div className="stat-icon mood">
                <span className="mood-emoji">😊</span>
              </div>
              <div className="stat-info">
                <h3>Mood</h3>
                <p className="stat-value">Productive</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Recent Activity */}
        <div className="dashboard-card recent-commits-card">
          <div className="card-header">
            <h2>Recent Commits</h2>
            <a href="/diary" className="view-all">View all</a>
          </div>
          <ul className="commits-list">
            {loading ? (
              <li className="commit-item">
                <div className="commit-info">
                  <p className="commit-message">Loading...</p>
                </div>
              </li>
            ) : stats.recentCommits.length === 0 ? (
              <li className="commit-item">
                <div className="commit-info">
                  <p className="commit-message">No recent commits</p>
                  <p className="commit-repo">Start coding to see activity here!</p>
                </div>
              </li>
            ) : (
              stats.recentCommits.slice(0, 6).map(commit => (
                <li key={commit.sha} className="commit-item">
                  <div className="commit-info">
                    <p className="commit-message">{commit.message}</p>
                    <p className="commit-repo">{getRepoName(commit.repo)}</p>
                  </div>
                  <span className="commit-time">{formatTimeAgo(commit.date)}</span>
                </li>
              ))
            )}
          </ul>
        </div>
        
        {/* Calendar Widget */}
        <div className="dashboard-card calendar-card">
          <div className="card-header">
            <h2>Diary Calendar</h2>
            <CalendarIcon size={18} />
          </div>
          <div style={{ marginTop: '1rem' }}>
            <Calendar onDateClick={handleDateClick} />
          </div>
        </div>
        
        {/* Listening History */}
        <div className="dashboard-card listening-card">
          <div className="card-header">
            <h2>Listening While Coding</h2>
            <Music size={18} />
          </div>
          <div className="listening-list">
            {listeningHistory.map(item => (
              <div key={item.id} className="listening-item">
                <div className="listening-icon">
                  {item.platform === 'YouTube' ? 
                    <ExternalLink size={16} /> : 
                    <Music size={16} />
                  }
                </div>
                <div className="listening-info">
                  <h3>{item.title}</h3>
                  <div className="listening-meta">
                    <span className="listening-platform">{item.platform}</span>
                    <span className="listening-duration">{item.duration}</span>
                  </div>
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