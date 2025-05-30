import React from 'react';
import { Calendar, Clock, Github, ExternalLink, Headphones, Music } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Dashboard.css';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  
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
  
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Welcome back, {user?.name || 'Developer'}</h1>
        <p className="dashboard-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </header>
      
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
                <p className="stat-value">4h 25m</p>
              </div>
            </div>
            
            <div className="stat-item">
              <div className="stat-icon commits">
                <Github size={20} />
              </div>
              <div className="stat-info">
                <h3>Commits</h3>
                <p className="stat-value">7</p>
              </div>
            </div>
            
            <div className="stat-item">
              <div className="stat-icon listened">
                <Headphones size={20} />
              </div>
              <div className="stat-info">
                <h3>Listened</h3>
                <p className="stat-value">3h 40m</p>
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
            <a href="#" className="view-all">View all</a>
          </div>
          <ul className="commits-list">
            {recentCommits.map(commit => (
              <li key={commit.id} className="commit-item">
                <div className="commit-info">
                  <p className="commit-message">{commit.message}</p>
                  <p className="commit-repo">{commit.repo}</p>
                </div>
                <span className="commit-time">{commit.time}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Calendar Widget */}
        <div className="dashboard-card calendar-card">
          <div className="card-header">
            <h2>Calendar</h2>
            <Calendar size={18} />
          </div>
          <div className="calendar-heatmap">
            {/* Simplified calendar heatmap visualization */}
            <div className="heatmap-grid">
              {Array(30).fill(0).map((_, i) => (
                <div 
                  key={i} 
                  className={`heatmap-cell ${Math.random() > 0.6 ? 'level-' + Math.floor(Math.random() * 4 + 1) : ''}`}
                  title={`${i + 1} contributions`}
                ></div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Projects */}
        <div className="dashboard-card projects-card">
          <div className="card-header">
            <h2>Projects In Progress</h2>
            <a href="#" className="view-all">View all</a>
          </div>
          <div className="projects-list">
            {projectsInProgress.map(project => (
              <div key={project.id} className="project-item">
                <div className="project-info">
                  <h3>{project.name}</h3>
                  <div className="project-meta">
                    <span className="project-deadline">
                      <Calendar size={14} />
                      Due: {new Date(project.deadline).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="project-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">{project.progress}%</span>
                </div>
              </div>
            ))}
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