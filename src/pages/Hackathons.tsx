import React, { useState } from 'react';
import { Plus, Calendar, Clock, Trophy, ExternalLink, Edit, Trash2, Users, Code, AlertCircle } from 'lucide-react';
import { useHackathons, Hackathon } from '../contexts/HackathonContext';
import '../styles/Hackathons.css';

const Hackathons: React.FC = () => {
  const { 
    hackathons, 
    loading, 
    error, 
    addHackathon, 
    updateHackathon, 
    deleteHackathon,
    getUpcomingDeadlines,
    getOngoingHackathons,
    getCompletedHackathons
  } = useHackathons();
  
  const [activeTab, setActiveTab] = useState<'all' | 'ongoing' | 'upcoming' | 'completed'>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [editingHackathon, setEditingHackathon] = useState<Hackathon | null>(null);
  const [formData, setFormData] = useState<Partial<Hackathon>>({
    title: '',
    organizer: '',
    description: '',
    startDate: '',
    endDate: '',
    submissionDeadline: '',
    status: 'upcoming',
    devpostUrl: '',
    projectTitle: '',
    projectDescription: '',
    projectUrl: '',
    teamMembers: [],
    technologies: [],
    prizes: [],
    notes: '',
  });

  const upcomingDeadlines = getUpcomingDeadlines();
  const ongoingHackathons = getOngoingHackathons();
  const completedHackathons = getCompletedHackathons();

  const getFilteredHackathons = () => {
    switch (activeTab) {
      case 'ongoing':
        return ongoingHackathons;
      case 'upcoming':
        return hackathons.filter(h => h.status === 'upcoming');
      case 'completed':
        return completedHackathons;
      default:
        return hackathons;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingHackathon) {
        await updateHackathon(editingHackathon.id, formData);
      } else {
        await addHackathon(formData as Omit<Hackathon, 'id' | 'created_at' | 'updated_at'>);
      }
      resetForm();
    } catch (err) {
      console.error('Error saving hackathon:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      organizer: '',
      description: '',
      startDate: '',
      endDate: '',
      submissionDeadline: '',
      status: 'upcoming',
      devpostUrl: '',
      projectTitle: '',
      projectDescription: '',
      projectUrl: '',
      teamMembers: [],
      technologies: [],
      prizes: [],
      notes: '',
    });
    setIsCreating(false);
    setEditingHackathon(null);
  };

  const handleEdit = (hackathon: Hackathon) => {
    setFormData(hackathon);
    setEditingHackathon(hackathon);
    setIsCreating(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this hackathon?')) {
      await deleteHackathon(id);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'upcoming': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'completed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      case 'submitted': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getDaysUntilDeadline = (deadlineString: string) => {
    const deadline = new Date(deadlineString);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="hackathons-container">
      {/* Header */}
      <div className="hackathons-header">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Hackathons</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Track your hackathon participations and projects
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="btn btn-primary"
        >
          <Plus size={20} />
          Add Hackathon
        </button>
      </div>

      {/* Upcoming Deadlines Alert */}
      {upcomingDeadlines.length > 0 && (
        <div className="alert alert-warning">
          <AlertCircle size={20} />
          <div>
            <h3 className="font-semibold">Upcoming Deadlines</h3>
            <p className="text-sm">
              {upcomingDeadlines.length} hackathon{upcomingDeadlines.length > 1 ? 's' : ''} with deadlines in the next 7 days
            </p>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon ongoing">
            <Code size={20} />
          </div>
          <div>
            <p className="stat-label">Ongoing</p>
            <p className="stat-value">{ongoingHackathons.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon upcoming">
            <Calendar size={20} />
          </div>
          <div>
            <p className="stat-label">Upcoming</p>
            <p className="stat-value">{hackathons.filter(h => h.status === 'upcoming').length}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon completed">
            <Trophy size={20} />
          </div>
          <div>
            <p className="stat-label">Completed</p>
            <p className="stat-value">{completedHackathons.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon deadlines">
            <Clock size={20} />
          </div>
          <div>
            <p className="stat-label">Deadlines This Week</p>
            <p className="stat-value">{upcomingDeadlines.length}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { key: 'all', label: 'All', count: hackathons.length },
          { key: 'ongoing', label: 'Ongoing', count: ongoingHackathons.length },
          { key: 'upcoming', label: 'Upcoming', count: hackathons.filter(h => h.status === 'upcoming').length },
          { key: 'completed', label: 'Completed', count: completedHackathons.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`tab ${activeTab === tab.key ? 'tab-active' : ''}`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Hackathon Form */}
      {isCreating && (
        <div className="form-modal">
          <div className="form-modal-content">
            <h2 className="text-xl font-semibold mb-4">
              {editingHackathon ? 'Edit Hackathon' : 'Add Hackathon'}
            </h2>
            <form onSubmit={handleSubmit} className="hackathon-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Organizer</label>
                  <input
                    type="text"
                    value={formData.organizer || ''}
                    onChange={(e) => setFormData({...formData, organizer: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date *</label>
                  <input
                    type="datetime-local"
                    value={formData.startDate || ''}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>End Date *</label>
                  <input
                    type="datetime-local"
                    value={formData.endDate || ''}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Submission Deadline *</label>
                  <input
                    type="datetime-local"
                    value={formData.submissionDeadline || ''}
                    onChange={(e) => setFormData({...formData, submissionDeadline: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status || 'upcoming'}
                    onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="submitted">Submitted</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Devpost URL</label>
                <input
                  type="url"
                  value={formData.devpostUrl || ''}
                  onChange={(e) => setFormData({...formData, devpostUrl: e.target.value})}
                  placeholder="https://devpost.com/software/your-project"
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={resetForm} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingHackathon ? 'Update' : 'Add'} Hackathon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hackathons List */}
      <div className="hackathons-grid">
        {getFilteredHackathons().map(hackathon => (
          <div key={hackathon.id} className="hackathon-card">
            <div className="hackathon-header">
              <div>
                <h3 className="hackathon-title">{hackathon.title}</h3>
                <p className="hackathon-organizer">{hackathon.organizer}</p>
              </div>
              <div className="hackathon-actions">
                <button onClick={() => handleEdit(hackathon)} className="action-btn">
                  <Edit size={16} />
                </button>
                <button onClick={() => handleDelete(hackathon.id)} className="action-btn">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="hackathon-meta">
              <span className={`status-badge ${getStatusColor(hackathon.status)}`}>
                {hackathon.status}
              </span>
              {hackathon.status !== 'completed' && (
                <span className="deadline-info">
                  <Clock size={14} />
                  {getDaysUntilDeadline(hackathon.submissionDeadline)} days left
                </span>
              )}
            </div>

            <p className="hackathon-description">{hackathon.description}</p>

            <div className="hackathon-dates">
              <div className="date-info">
                <Calendar size={14} />
                <span>{formatDate(hackathon.startDate)} - {formatDate(hackathon.endDate)}</span>
              </div>
              <div className="date-info">
                <Clock size={14} />
                <span>Deadline: {formatDate(hackathon.submissionDeadline)}</span>
              </div>
            </div>

            {hackathon.devpostUrl && (
              <div className="hackathon-links">
                <a 
                  href={hackathon.devpostUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="link-btn"
                >
                  <ExternalLink size={14} />
                  View on Devpost
                </a>
              </div>
            )}
          </div>
        ))}
      </div>

      {getFilteredHackathons().length === 0 && (
        <div className="empty-state">
          <Trophy size={48} className="text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-4">
            No hackathons found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {activeTab === 'all' 
              ? 'Start by adding your first hackathon participation!'
              : `No ${activeTab} hackathons at the moment.`
            }
          </p>
          {activeTab === 'all' && (
            <button
              onClick={() => setIsCreating(true)}
              className="btn btn-primary mt-4"
            >
              <Plus size={20} />
              Add Your First Hackathon
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Hackathons; 