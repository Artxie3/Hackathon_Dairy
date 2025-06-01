import React, { useState } from 'react';
import { AlertTriangle, Calendar, Clock, ExternalLink, Plus, Settings, Trophy } from 'lucide-react';
import { useDevpost } from '../contexts/DevpostContext';

const HackathonDeadlines: React.FC = () => {
  const { 
    userData, 
    upcomingDeadlines, 
    loading, 
    error, 
    isConnected, 
    connectDevpost, 
    refreshDevpostData 
  } = useDevpost();
  
  const [showSetup, setShowSetup] = useState(false);
  const [username, setUsername] = useState('');
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setConnecting(true);
    try {
      await connectDevpost(username.trim());
      setShowSetup(false);
      setUsername('');
    } catch (err) {
      console.error('Failed to connect:', err);
    } finally {
      setConnecting(false);
    }
  };

  const formatDeadlineDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUrgencyColor = (daysLeft: number) => {
    if (daysLeft <= 1) return 'text-red-500 bg-red-50 dark:bg-red-900/20';
    if (daysLeft <= 3) return 'text-orange-500 bg-orange-50 dark:bg-orange-900/20';
    if (daysLeft <= 7) return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
    return 'text-green-500 bg-green-50 dark:bg-green-900/20';
  };

  if (!isConnected) {
    return (
      <div className="hackathon-deadlines-container">
        <div className="card-header">
          <h2>Hackathon Deadlines</h2>
          <button
            onClick={() => setShowSetup(true)}
            className="connect-button"
          >
            <Plus size={16} />
            Connect Devpost
          </button>
        </div>

        {showSetup ? (
          <form onSubmit={handleConnect} className="devpost-setup">
            <div className="setup-content">
              <h3>Connect your Devpost account</h3>
              <p>Enter your Devpost username to track hackathon deadlines and projects</p>
              
              <input
                type="text"
                placeholder="Your Devpost username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="username-input"
                disabled={connecting}
              />
              
              <div className="setup-actions">
                <button
                  type="button"
                  onClick={() => setShowSetup(false)}
                  className="cancel-button"
                  disabled={connecting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="connect-submit-button"
                  disabled={!username.trim() || connecting}
                >
                  {connecting ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="not-connected">
            <Trophy className="icon" size={48} />
            <h3>Track your hackathons</h3>
            <p>Connect your Devpost account to see upcoming deadlines and project submissions</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="hackathon-deadlines-container">
      <div className="card-header">
        <h2>Hackathon Deadlines</h2>
        <div className="header-actions">
          {userData && (
            <span className="connected-user">@{userData.username}</span>
          )}
          <button
            onClick={refreshDevpostData}
            className="refresh-button"
            disabled={loading}
            title="Refresh deadlines"
          >
            <Settings size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <span>Loading deadlines...</span>
        </div>
      ) : upcomingDeadlines.length === 0 ? (
        <div className="no-deadlines">
          <Calendar size={32} />
          <h3>No upcoming deadlines</h3>
          <p>You're all caught up! No hackathon submissions due soon.</p>
        </div>
      ) : (
        <div className="deadlines-list">
          {upcomingDeadlines.slice(0, 5).map((deadline, index) => (
            <div key={index} className="deadline-item">
              <div className="deadline-info">
                <h4 className="hackathon-name">{deadline.hackathon}</h4>
                <div className="deadline-details">
                  <div className="deadline-time">
                    <Clock size={14} />
                    <span>{formatDeadlineDate(deadline.deadline)}</span>
                  </div>
                  <div className={`days-left ${getUrgencyColor(deadline.daysLeft)}`}>
                    {deadline.daysLeft === 0 
                      ? 'Due today' 
                      : deadline.daysLeft === 1 
                        ? '1 day left'
                        : `${deadline.daysLeft} days left`
                    }
                  </div>
                </div>
              </div>
              
              <a
                href={deadline.url}
                target="_blank"
                rel="noopener noreferrer"
                className="deadline-link"
                title="View on Devpost"
              >
                <ExternalLink size={16} />
              </a>
            </div>
          ))}
        </div>
      )}

      {userData && (
        <div className="user-stats">
          <div className="stat">
            <span className="stat-value">{userData.projects.length}</span>
            <span className="stat-label">Projects</span>
          </div>
          <div className="stat">
            <span className="stat-value">{userData.hackathons.length}</span>
            <span className="stat-label">Hackathons</span>
          </div>
          <div className="stat">
            <span className="stat-value">{userData.achievements.length}</span>
            <span className="stat-label">Awards</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default HackathonDeadlines; 