import React from 'react';
import { Folder, Github, Calendar, Clock, ArrowUpRight, Activity, BarChart } from 'lucide-react';
import '../styles/Projects.css';

// Mock data for projects
const MOCK_PROJECTS = [
  {
    id: 1,
    name: 'Task Manager App',
    description: 'A full-stack application for managing tasks and projects with team collaboration features.',
    repo: 'task-manager',
    stack: ['React', 'Node.js', 'MongoDB'],
    startDate: '2023-03-15',
    deadline: '2023-05-20',
    status: 'in-progress',
    progress: 65,
    commits: 42,
    hoursLogged: 48.5,
    collaborators: 2
  },
  {
    id: 2,
    name: 'Personal Portfolio',
    description: 'My personal portfolio website showcasing projects and skills.',
    repo: 'portfolio-website',
    stack: ['React', 'Tailwind CSS'],
    startDate: '2023-02-10',
    deadline: '2023-04-30',
    status: 'completed',
    progress: 100,
    commits: 27,
    hoursLogged: 35.2,
    collaborators: 1
  },
  {
    id: 3,
    name: 'E-commerce Backend',
    description: 'Backend API for an e-commerce platform with payment processing and inventory management.',
    repo: 'ecommerce-api',
    stack: ['Node.js', 'Express', 'PostgreSQL'],
    startDate: '2023-04-05',
    deadline: '2023-07-15',
    status: 'in-progress',
    progress: 30,
    commits: 18,
    hoursLogged: 22.8,
    collaborators: 3
  },
  {
    id: 4,
    name: 'Weather Dashboard',
    description: 'A weather forecast application using OpenWeather API with location-based services.',
    repo: 'weather-dashboard',
    stack: ['HTML', 'CSS', 'JavaScript'],
    startDate: '2023-01-20',
    deadline: '2023-02-28',
    status: 'completed',
    progress: 100,
    commits: 15,
    hoursLogged: 18.5,
    collaborators: 1
  }
];

const Projects: React.FC = () => {
  return (
    <div className="projects-container">
      <div className="projects-header">
        <h1>Projects</h1>
        <button className="btn btn-primary">New Project</button>
      </div>
      
      <div className="projects-stats">
        <div className="stat-card">
          <div className="stat-value">4</div>
          <div className="stat-label">Total Projects</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">2</div>
          <div className="stat-label">In Progress</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">2</div>
          <div className="stat-label">Completed</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">125</div>
          <div className="stat-label">Total Hours</div>
        </div>
      </div>
      
      <div className="projects-grid">
        {MOCK_PROJECTS.map(project => (
          <div key={project.id} className={`project-card ${project.status}`}>
            <div className="project-header">
              <div className="project-icon">
                <Folder size={20} />
              </div>
              <div className="project-status">
                {project.status === 'completed' ? 'Completed' : 'In Progress'}
              </div>
            </div>
            
            <h3 className="project-name">{project.name}</h3>
            <p className="project-description">{project.description}</p>
            
            <div className="project-meta">
              <div className="meta-item">
                <Github size={14} />
                <span>{project.repo}</span>
              </div>
              
              <div className="meta-item">
                <Calendar size={14} />
                <span>Due: {new Date(project.deadline).toLocaleDateString()}</span>
              </div>
            </div>
            
            <div className="project-stack">
              {project.stack.map(tech => (
                <span key={tech} className="tech-tag">{tech}</span>
              ))}
            </div>
            
            <div className="project-progress">
              <div className="progress-header">
                <span>Progress</span>
                <span>{project.progress}%</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${project.progress}%` }}
                ></div>
              </div>
            </div>
            
            <div className="project-metrics">
              <div className="metric">
                <Clock size={14} />
                <span>{project.hoursLogged} hours</span>
              </div>
              
              <div className="metric">
                <Github size={14} />
                <span>{project.commits} commits</span>
              </div>
              
              <div className="metric">
                <Activity size={14} />
                <span>{project.collaborators} {project.collaborators === 1 ? 'collaborator' : 'collaborators'}</span>
              </div>
            </div>
            
            <div className="project-actions">
              <button className="action-btn">
                <Github size={16} />
                <span>View Repo</span>
              </button>
              
              <button className="action-btn">
                <BarChart size={16} />
                <span>Analytics</span>
              </button>
              
              <button className="action-btn">
                <ArrowUpRight size={16} />
                <span>Open</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Projects;