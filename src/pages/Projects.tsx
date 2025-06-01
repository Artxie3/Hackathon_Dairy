import React, { useState } from 'react';
import { ExternalLink, Github, Trophy, Calendar, Users, Heart, Tag, RefreshCw, Plus } from 'lucide-react';
import { useDevpost } from '../contexts/DevpostContext';

const Projects: React.FC = () => {
  const { 
    userData, 
    loading, 
    error, 
    isConnected, 
    connectDevpost, 
    refreshDevpostData 
  } = useDevpost();
  
  const [filter, setFilter] = useState<'all' | 'hackathon' | 'personal'>('all');
  const [showSetup, setShowSetup] = useState(false);
  const [username, setUsername] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshDevpostData();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Mock personal projects for demonstration
  const personalProjects = [
    {
      id: '1',
      name: 'Personal Portfolio',
      description: 'My developer portfolio website built with React and TypeScript',
      url: '#',
      github_url: 'https://github.com/user/portfolio',
      tech_stack: ['React', 'TypeScript', 'Tailwind CSS'],
      status: 'completed',
      created_at: '2024-01-15',
      type: 'personal' as const,
    },
    {
      id: '2', 
      name: 'Task Manager App',
      description: 'A productivity app for managing daily tasks and projects',
      url: '#',
      github_url: 'https://github.com/user/task-manager',
      tech_stack: ['Vue.js', 'Node.js', 'MongoDB'],
      status: 'in-progress',
      created_at: '2024-02-01',
      type: 'personal' as const,
    },
  ];

  const allProjects = [
    ...personalProjects,
    ...(userData?.projects?.map(project => ({
      ...project,
      id: project.url,
      github_url: '', // Devpost projects might not have GitHub links
      tech_stack: project.built_with || [],
      status: 'completed',
      type: 'hackathon' as const,
    })) || []),
  ];

  const filteredProjects = allProjects.filter(project => {
    if (filter === 'all') return true;
    return project.type === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'planning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'hackathon' ? <Trophy size={16} /> : <Users size={16} />;
  };

  if (!isConnected) {
    return (
      <div className="projects-page">
        <div className="page-header">
          <div>
            <h1>Projects</h1>
            <p>Manage and showcase your development projects</p>
          </div>
          <button
            onClick={() => setShowSetup(true)}
            className="connect-button"
          >
            <Plus size={16} />
            Connect Devpost
          </button>
        </div>

        {showSetup && (
          <div className="setup-card">
            <form onSubmit={handleConnect}>
              <h3>Connect your Devpost account</h3>
              <p>Import your hackathon projects and track your achievements</p>
              
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
            </form>
          </div>
        )}

        {/* Show personal projects even without Devpost */}
        <div className="projects-grid">
          {personalProjects.map(project => (
            <div key={project.id} className="project-card">
              <div className="project-header">
                <div className="project-title">
                  <h3>{project.name}</h3>
                  <div className="project-badges">
                    <span className={`status-badge ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                    <span className="type-badge">
                      {getTypeIcon(project.type)}
                      {project.type}
                    </span>
                  </div>
                </div>
              </div>

              <p className="project-description">{project.description}</p>

              <div className="tech-stack">
                {project.tech_stack.map(tech => (
                  <span key={tech} className="tech-tag">
                    <Tag size={12} />
                    {tech}
                  </span>
                ))}
              </div>

              <div className="project-footer">
                <div className="project-meta">
                  <span className="project-date">
                    <Calendar size={14} />
                    {formatDate(project.created_at)}
                  </span>
                </div>

                <div className="project-links">
                  {project.github_url && (
                    <a
                      href={project.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="project-link"
                      title="View on GitHub"
                    >
                      <Github size={16} />
                    </a>
                  )}
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="project-link"
                    title="View project"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="projects-page">
      <div className="page-header">
        <div>
          <h1>Projects</h1>
          <p>Your hackathon and personal projects</p>
          {userData && (
            <div className="user-stats">
              <span>{userData.projects.length} hackathon projects</span>
              <span>•</span>
              <span>{personalProjects.length} personal projects</span>
              <span>•</span>
              <span>{userData.achievements.length} achievements</span>
            </div>
          )}
        </div>
        
        <div className="header-actions">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="refresh-button"
            title="Refresh projects"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span>{error}</span>
        </div>
      )}

      <div className="filters">
        <button
          onClick={() => setFilter('all')}
          className={`filter-button ${filter === 'all' ? 'active' : ''}`}
        >
          All Projects ({allProjects.length})
        </button>
        <button
          onClick={() => setFilter('hackathon')}
          className={`filter-button ${filter === 'hackathon' ? 'active' : ''}`}
        >
          <Trophy size={16} />
          Hackathon ({userData?.projects.length || 0})
        </button>
        <button
          onClick={() => setFilter('personal')}
          className={`filter-button ${filter === 'personal' ? 'active' : ''}`}
        >
          <Users size={16} />
          Personal ({personalProjects.length})
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <span>Loading projects...</span>
        </div>
      ) : (
        <div className="projects-grid">
          {filteredProjects.map(project => (
            <div key={project.id} className="project-card">
              <div className="project-header">
                <div className="project-title">
                  <h3>{project.name}</h3>
                  <div className="project-badges">
                    <span className={`status-badge ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                    <span className="type-badge">
                      {getTypeIcon(project.type)}
                      {project.type}
                    </span>
                  </div>
                </div>
                
                {project.type === 'hackathon' && 'likes' in project && (
                  <div className="project-stats">
                    <span className="likes">
                      <Heart size={14} />
                      {project.likes}
                    </span>
                  </div>
                )}
              </div>

              <p className="project-description">{project.description}</p>

              {project.tech_stack.length > 0 && (
                <div className="tech-stack">
                  {project.tech_stack.slice(0, 5).map(tech => (
                    <span key={tech} className="tech-tag">
                      <Tag size={12} />
                      {tech}
                    </span>
                  ))}
                  {project.tech_stack.length > 5 && (
                    <span className="tech-tag more">
                      +{project.tech_stack.length - 5} more
                    </span>
                  )}
                </div>
              )}

              {project.type === 'hackathon' && 'submitted_to' in project && project.submitted_to.length > 0 && (
                <div className="hackathons">
                  <span className="hackathons-label">Submitted to:</span>
                  {project.submitted_to.slice(0, 2).map(hackathon => (
                    <span key={hackathon} className="hackathon-tag">
                      {hackathon}
                    </span>
                  ))}
                  {project.submitted_to.length > 2 && (
                    <span className="hackathon-tag more">
                      +{project.submitted_to.length - 2} more
                    </span>
                  )}
                </div>
              )}

              <div className="project-footer">
                <div className="project-meta">
                  <span className="project-date">
                    <Calendar size={14} />
                    {formatDate(project.created_at)}
                  </span>
                </div>

                <div className="project-links">
                  {project.github_url && (
                    <a
                      href={project.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="project-link"
                      title="View on GitHub"
                    >
                      <Github size={16} />
                    </a>
                  )}
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="project-link"
                    title={project.type === 'hackathon' ? 'View on Devpost' : 'View project'}
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredProjects.length === 0 && !loading && (
        <div className="empty-state">
          <Trophy size={48} />
          <h3>No projects found</h3>
          <p>
            {filter === 'all' 
              ? 'Start building projects to see them here!'
              : `No ${filter} projects found. Try a different filter.`
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default Projects;