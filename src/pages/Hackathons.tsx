import React, { useState } from 'react';
import { Plus, Calendar, Clock, Trophy, ExternalLink, Edit, Trash2, Users, Code, AlertCircle, Download, Loader } from 'lucide-react';
import { useHackathons, Hackathon } from '../contexts/HackathonContext';
import { DevpostScraper } from '../utils/devpostScraper';
import '../styles/Hackathons.css';
import { format, formatInTimeZone } from 'date-fns-tz';
import { useSettings } from '../contexts/SettingsContext';
import { addMinutes } from 'date-fns';

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
  
  const { timezone = 'GMT-5' } = useSettings();
  
  const [activeTab, setActiveTab] = useState<'all' | 'ongoing' | 'upcoming' | 'completed'>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [editingHackathon, setEditingHackathon] = useState<Hackathon | null>(null);
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Hackathon>>({
    title: '',
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
    notes: '',
  });
  const [hackathonToDelete, setHackathonToDelete] = useState<Hackathon | null>(null);

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

  const handleDelete = async (hackathon: Hackathon) => {
    setHackathonToDelete(hackathon);
  };

  const confirmDelete = async () => {
    if (hackathonToDelete) {
      await deleteHackathon(hackathonToDelete.id);
      setHackathonToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'MMM d, yyyy h:mm a');
  };

  const formatDateWithTimezone = (dateString: string, targetTimezone: string = 'GMT-5') => {
    const date = new Date(dateString);
    
    // Convert UTC date to GMT-5 for display
    const gmt5Offset = -5; // GMT-5 is 5 hours behind UTC
    const gmt5Date = new Date(date.getTime() + (gmt5Offset * 60 * 60 * 1000));
    
    const gmt5Time = gmt5Date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }) + ' ' + gmt5Date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    if (timezone !== 'GMT-5') {
      // Also show user's local time
      const userOffset = parseFloat(timezone.replace('GMT', ''));
      const userDate = new Date(date.getTime() + (userOffset * 60 * 60 * 1000));
      const userTime = userDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }) + ' ' + userDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      return (
        <span>
          {gmt5Time} GMT-5
          <span className="timezone-notice">
            ({userTime} {timezone})
          </span>
        </span>
      );
    }
    
    return `${gmt5Time} GMT-5`;
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

  const handleImportFromDevpost = async () => {
    if (!importUrl.trim()) {
      setImportError('Please enter a Devpost URL');
      return;
    }

    if (!importUrl.includes('devpost.com')) {
      setImportError('Please enter a valid Devpost URL');
      return;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      const scrapedData = await DevpostScraper.scrapeHackathon(importUrl);
      
      // Convert dates to the format expected by datetime-local inputs
      const formatDateForInput = (isoString: string) => {
        const date = new Date(isoString);
        return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
      };

      // Update form data with scraped information
      setFormData({
        ...formData,
        title: scrapedData.title,
        description: scrapedData.description,
        startDate: formatDateForInput(scrapedData.startDate),
        endDate: formatDateForInput(scrapedData.endDate),
        submissionDeadline: formatDateForInput(scrapedData.submissionDeadline),
        status: scrapedData.status,
        devpostUrl: scrapedData.devpostUrl,
      });

      setImportUrl(''); // Clear the import URL field
      
      // Show success message
      console.log('Successfully imported hackathon data:', scrapedData);
      
    } catch (error) {
      console.error('Import failed:', error);
      
      // If scraping fails, try to extract basic info from URL
      try {
        const basicData = DevpostScraper.extractFromUrl(importUrl);
        setFormData({
          ...formData,
          ...basicData,
        });
        setImportError('Partial import successful - please verify and complete the details');
      } catch (fallbackError) {
        setImportError(error instanceof Error ? error.message : 'Failed to import hackathon data');
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleQuickImport = (url: string) => {
    setImportUrl(url);
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

      {/* Enhanced timezone warning */}
      {timezone !== 'GMT-5' && (
        <div className="alert alert-warning mb-4">
          <AlertCircle size={20} />
          <div>
            <h3 className="font-semibold">⚠️ Timezone Notice</h3>
            <p className="text-sm">
              Hackathon deadlines are in <strong>GMT-5 (Eastern Time)</strong>. 
              Your timezone is set to <strong>{timezone}</strong>.
              <br />
              <span className="text-red-600 dark:text-red-400 font-medium">
                Make sure to check deadline times carefully to avoid missing submissions!
              </span>
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

            {/* Devpost Import Section */}
            {!editingHackathon && (
              <div className="import-section">
                <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                  <Download size={18} />
                  Import from Devpost
                </h3>
                <div className="import-controls">
                  <div className="import-input-group">
                    <input
                      type="url"
                      value={importUrl}
                      onChange={(e) => {
                        setImportUrl(e.target.value);
                        setImportError(null);
                      }}
                      placeholder="https://hackathon-name.devpost.com/"
                      className="import-url-input"
                      disabled={isImporting}
                    />
                    <button
                      type="button"
                      onClick={handleImportFromDevpost}
                      disabled={isImporting || !importUrl.trim()}
                      className="import-btn"
                    >
                      {isImporting ? (
                        <>
                          <Loader size={16} className="animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Download size={16} />
                          Import
                        </>
                      )}
                    </button>
                  </div>
                  
                  {importError && (
                    <div className="import-error">
                      <AlertCircle size={16} />
                      {importError}
                    </div>
                  )}

                  {/* Quick Import Examples */}
                  <div className="quick-import">
                    <p className="quick-import-label">Quick examples:</p>
                    <div className="quick-import-buttons">
                      <button
                        type="button"
                        onClick={() => handleQuickImport('https://worldslargesthackathon.devpost.com/')}
                        className="quick-import-btn"
                      >
                        World's Largest Hackathon
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickImport('https://devpost.com/hackathons')}
                        className="quick-import-btn"
                      >
                        Browse Devpost
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="divider">
                  <span>or enter manually</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="hackathon-form">
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
                <label>Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                />
              </div>

              {/* Timezone warning in form */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <Clock className="text-blue-600 dark:text-blue-400 mt-0.5" size={16} />
                  <div className="text-sm">
                    <p className="font-medium text-blue-800 dark:text-blue-200">
                      Timezone Information
                    </p>
                    <p className="text-blue-700 dark:text-blue-300">
                      Hackathon times are typically in GMT-5. Your current timezone: <strong>{timezone}</strong>
                      {timezone !== 'GMT-5' && (
                        <span className="block mt-1 text-amber-600 dark:text-amber-400">
                          ⚠️ Times will be converted and displayed in both timezones for clarity.
                        </span>
                      )}
                    </p>
                  </div>
                </div>
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
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => handleEdit(hackathon)}
                  className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                  title="Edit hackathon"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(hackathon)}
                  className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                  title="Delete hackathon"
                >
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
              <div className="date-info" title="Hackathon Duration">
                <Calendar size={14} />
                <span>
                  {formatDate(hackathon.startDate)} - {formatDate(hackathon.endDate)}
                </span>
              </div>
              <div className="date-info deadline-critical" title="Submission Deadline - Critical!">
                <Clock size={14} />
                <span className="font-medium text-red-600 dark:text-red-400">
                  🚨 Deadline: {formatDateWithTimezone(hackathon.submissionDeadline)}
                </span>
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

      {/* Confirmation Dialog */}
      {hackathonToDelete && (
        <div className="confirmation-dialog">
          <div className="confirmation-dialog-content">
            <h3>Delete Hackathon</h3>
            <p>
              Are you sure you want to delete "{hackathonToDelete.title}"?
              <br />
              This action cannot be undone.
            </p>
            <div className="confirmation-actions">
              <button
                className="confirmation-btn cancel"
                onClick={() => setHackathonToDelete(null)}
              >
                Cancel
              </button>
              <button
                className="confirmation-btn delete"
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Hackathons; 