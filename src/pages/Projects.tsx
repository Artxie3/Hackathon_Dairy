import React, { useState, useEffect } from 'react';
import { Folder, Github, Calendar, Clock, ArrowUpRight, Activity, BarChart, Star, GitBranch } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Projects.css';

interface Repository {
  id: number;
  name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  updated_at: string;
  created_at: string;
  topics: string[];
  visibility: string;
}

const Projects: React.FC = () => {
  const { user } = useAuth();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRepositories = async () => {
      try {
        const token = localStorage.getItem('github_token');
        if (!token || !user?.username) return;

        const response = await fetch(`https://api.github.com/users/${user.username}/repos?sort=updated&per_page=100`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch repositories');
        }

        const data = await response.json();
        setRepositories(data);
      } catch (error) {
        console.error('Error fetching repositories:', error);
        setError('Failed to load repositories');
      } finally {
        setLoading(false);
      }
    };

    fetchRepositories();
  }, [user?.username]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="projects-container">
      <div className="projects-header">
        <h1>GitHub Projects</h1>
        <a
          href={`https://github.com/${user?.username}?tab=repositories`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
        >
          View All on GitHub
        </a>
      </div>
      
      {/* Stats Overview */}
      <div className="projects-stats">
        <div className="stat-card">
          <div className="stat-value">{repositories.length}</div>
          <div className="stat-label">Total Repositories</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">
            {repositories.filter(repo => repo.visibility === 'public').length}
          </div>
          <div className="stat-label">Public Repos</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">
            {repositories.reduce((sum, repo) => sum + repo.stargazers_count, 0)}
          </div>
          <div className="stat-label">Total Stars</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">
            {repositories.reduce((sum, repo) => sum + repo.forks_count, 0)}
          </div>
          <div className="stat-label">Total Forks</div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-lg h-48 animate-pulse" />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="text-red-500 dark:text-red-400">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Projects Grid */}
      {!loading && !error && (
        <div className="projects-grid">
          {repositories.map(repo => (
            <div key={repo.id} className="project-card">
              <div className="project-header">
                <div className="project-icon">
                  <Folder size={20} />
                </div>
                <div className="project-visibility">
                  {repo.visibility}
                </div>
              </div>
              
              <h3 className="project-name">{repo.name}</h3>
              <p className="project-description">
                {repo.description || 'No description provided'}
              </p>
              
              <div className="project-meta">
                {repo.language && (
                  <div className="meta-item">
                    <span className={`language-dot ${repo.language.toLowerCase()}`} />
                    <span>{repo.language}</span>
                  </div>
                )}
                
                <div className="meta-item">
                  <Calendar size={14} />
                  <span>Updated: {formatDate(repo.updated_at)}</span>
                </div>
              </div>
              
              {repo.topics.length > 0 && (
                <div className="project-stack">
                  {repo.topics.map(topic => (
                    <span key={topic} className="tech-tag">{topic}</span>
                  ))}
                </div>
              )}
              
              <div className="project-metrics">
                <div className="metric">
                  <Star size={14} />
                  <span>{repo.stargazers_count} stars</span>
                </div>
                
                <div className="metric">
                  <GitBranch size={14} />
                  <span>{repo.forks_count} forks</span>
                </div>
              </div>
              
              <div className="project-actions">
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-btn"
                >
                  <Github size={16} />
                  <span>View Repo</span>
                </a>
                
                <a
                  href={`${repo.html_url}/pulse`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-btn"
                >
                  <Activity size={16} />
                  <span>Activity</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Projects;