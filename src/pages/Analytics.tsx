import React from 'react';
import { 
  BarChart2, 
  Clock, 
  Calendar, 
  Activity,
  ArrowUp,
  ArrowDown,
  Github,
  Music,
  Youtube
} from 'lucide-react';
import '../styles/Analytics.css';

const Analytics: React.FC = () => {
  // Mock data for analytics
  const weeklyStats = {
    codingHours: 42,
    commits: 28,
    projectsWorked: 3,
    avgDailyHours: 6,
    mostProductiveDay: 'Wednesday',
    longestSession: '4.5 hours'
  };

  const trends = {
    codingTime: '+15%',
    productivity: '+8%',
    commits: '-5%',
    breaks: '+20%'
  };

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h1>Analytics Dashboard</h1>
        <div className="time-filter">
          <button className="active">Week</button>
          <button>Month</button>
          <button>Quarter</button>
          <button>Year</button>
        </div>
      </div>

      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-icon">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Coding Time</h3>
            <div className="stat-value">{weeklyStats.codingHours}h</div>
            <div className="stat-trend positive">
              <ArrowUp size={14} />
              {trends.codingTime}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Github size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Commits</h3>
            <div className="stat-value">{weeklyStats.commits}</div>
            <div className="stat-trend negative">
              <ArrowDown size={14} />
              {trends.commits}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Activity size={24} />
          </div>
          <div className="stat-content">
            <h3>Productivity Score</h3>
            <div className="stat-value">8.5</div>
            <div className="stat-trend positive">
              <ArrowUp size={14} />
              {trends.productivity}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Calendar size={24} />
          </div>
          <div className="stat-content">
            <h3>Break Time</h3>
            <div className="stat-value">12h</div>
            <div className="stat-trend positive">
              <ArrowUp size={14} />
              {trends.breaks}
            </div>
          </div>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="chart-card">
          <h3>Daily Coding Hours</h3>
          <div className="chart-placeholder">
            <BarChart2 size={120} />
            <p>Chart visualization would go here</p>
          </div>
        </div>

        <div className="chart-card">
          <h3>Commit Activity</h3>
          <div className="chart-placeholder">
            <Activity size={120} />
            <p>Chart visualization would go here</p>
          </div>
        </div>

        <div className="insights-card">
          <h3>Weekly Insights</h3>
          <div className="insights-list">
            <div className="insight-item">
              <Clock size={16} />
              <p>Most productive day: <strong>{weeklyStats.mostProductiveDay}</strong></p>
            </div>
            <div className="insight-item">
              <Activity size={16} />
              <p>Longest coding session: <strong>{weeklyStats.longestSession}</strong></p>
            </div>
            <div className="insight-item">
              <Calendar size={16} />
              <p>Average daily hours: <strong>{weeklyStats.avgDailyHours}</strong></p>
            </div>
          </div>
        </div>

        <div className="media-activity-card">
          <h3>Background Activity</h3>
          <div className="media-stats">
            <div className="media-stat">
              <Youtube size={20} />
              <div className="media-info">
                <h4>YouTube</h4>
                <p>15 hours of coding tutorials</p>
              </div>
            </div>
            <div className="media-stat">
              <Music size={20} />
              <div className="media-info">
                <h4>Spotify</h4>
                <p>28 hours of focus music</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;