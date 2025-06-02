import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Clock, Trophy, ExternalLink, Edit, Trash2, Users, Code, AlertCircle, Download, Loader, Globe, MapPin } from 'lucide-react';
import { useHackathons, Hackathon } from '../contexts/HackathonContext';
import { DevpostScraper } from '../utils/devpostScraper';
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
  const [deleteConfirm, setDeleteConfirm] = useState<Hackathon | null>(null);
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [userTimezone, setUserTimezone] = useState<string>('');
  const [showTimezoneConfirm, setShowTimezoneConfirm] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<any>(null);
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

  const upcomingDeadlines = getUpcomingDeadlines();
  const ongoingHackathons = getOngoingHackathons();
  const completedHackathons = getCompletedHackathons();

  useEffect(() => {
    // Get user's timezone
    setUserTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  // Timezone conversion utilities
  const convertTimezone = (isoString: string, fromTz: string, toTz: string) => {
    try {
      const date = new Date(isoString);
      
      // Validate timezones
      if (!toTz || toTz.trim() === '') {
        toTz = 'UTC';
      }
      
      // Format in target timezone
      const converted = new Intl.DateTimeFormat('en-US', {
        timeZone: toTz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).formatToParts(date);

      const parts = converted.reduce((acc, part) => {
        acc[part.type] = part.value;
        return acc;
      }, {} as any);

      return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
    } catch (error) {
      console.warn('Timezone conversion failed, returning original:', error);
      return isoString;
    }
  };

  const formatTimeWithTimezone = (isoString: string, timezone: string, label: string) => {
    const date = new Date(isoString);
    
    // Validate timezone before using it
    if (!timezone || timezone.trim() === '') {
      timezone = 'UTC';
    }
    
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      }).format(date);
    } catch (error) {
      // Fallback to UTC if timezone is invalid
      return new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      }).format(date);
    }
  };

  const mapTimezoneAbbreviation = (tzAbbr: string): string => {
    if (!tzAbbr || tzAbbr.trim() === '') {
      return 'UTC';
    }
    
    const timezoneMap: { [key: string]: string } = {
      'PDT': 'America/Los_Angeles',
      'PST': 'America/Los_Angeles',
      'EDT': 'America/New_York',
      'EST': 'America/New_York',
      'CDT': 'America/Chicago',
      'CST': 'America/Chicago',
      'MDT': 'America/Denver',
      'MST': 'America/Denver',
      'GMT-5': 'America/New_York',
      'GMT-4': 'America/New_York',
      'GMT-6': 'America/Chicago',
      'GMT-7': 'America/Denver',
      'GMT-8': 'America/Los_Angeles',
      'UTC-5': 'America/New_York',
      'UTC-4': 'America/New_York',
      'UTC-6': 'America/Chicago',
      'UTC-7': 'America/Denver',
      'UTC-8': 'America/Los_Angeles',
    };
    return timezoneMap[tzAbbr.trim()] || 'UTC';
  };

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

  const handleDeleteEntry = (hackathon: Hackathon, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm(hackathon);
  };

  const confirmDelete = async () => {
    if (deleteConfirm) {
      await deleteHackathon(deleteConfirm.id);
      setDeleteConfirm(null);
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

  const formatDateWithTimezone = (dateString: string, originalText?: string) => {
    const date = new Date(dateString);
    
    // Extract timezone info from notes - but handle when there are no notes
    const notes = formData.notes || '';
    const sourceTimezoneMatch = notes.match(/Source timezone: ([^\n]+)/);
    const sourceTimezone = sourceTimezoneMatch ? sourceTimezoneMatch[1].trim() : null;
    
    // Ensure userTimezone is valid
    const validUserTimezone = userTimezone && userTimezone.trim() !== '' 
      ? userTimezone 
      : Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Format in user's timezone
    const userTime = formatTimeWithTimezone(dateString, validUserTimezone, 'User');
    
    // Format in source timezone if available and valid
    let sourceTime = null;
    if (sourceTimezone && sourceTimezone.trim() !== '') {
      const sourceTzName = mapTimezoneAbbreviation(sourceTimezone);
      sourceTime = formatTimeWithTimezone(dateString, sourceTzName, 'Source');
    }

    // Check if the deadline is estimated
    const isEstimated = originalText?.includes('Estimated') || false;

    return { userTime, sourceTime, isEstimated, originalText, sourceTimezone };
  };

  const getTimezoneWarning = (dateString: string) => {
    const deadline = new Date(dateString);
    const now = new Date();
    const diffHours = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 24 && diffHours > 0) {
      return 'urgent';
    } else if (diffHours < 72 && diffHours > 0) {
      return 'warning';
    }
    return null;
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
      
      // If we have timezone info, show confirmation dialog
      if (scrapedData.timezone) {
        setPendingImportData(scrapedData);
        setShowTimezoneConfirm(true);
      } else {
        // No timezone info, proceed normally
        processImportData(scrapedData);
      }
      
    } catch (error) {
      console.error('Import failed:', error);
      
      // If scraping fails, try to extract basic info from URL
      try {
        const basicData = DevpostScraper.extractFromUrl(importUrl);
        processImportData(basicData);
        setImportError('Partial import successful - please verify and complete the details');
      } catch (fallbackError) {
        setImportError(error instanceof Error ? error.message : 'Failed to import hackathon data');
      }
    } finally {
      setIsImporting(false);
    }
  };

  const processImportData = (scrapedData: any) => {
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
      // Store timezone info in notes
      notes: scrapedData.timezone 
        ? `Imported deadline: ${scrapedData.deadlineText}\nSource timezone: ${scrapedData.timezone}\nUser timezone: ${userTimezone}`
        : scrapedData.deadlineText || ''
    });

    setImportUrl(''); // Clear the import URL field
    
    // Show success message with timezone info
    if (scrapedData.timezone) {
      console.log(`Successfully imported hackathon with timezone conversion: ${scrapedData.timezone} → ${userTimezone}`);
    }
  };

  const handleTimezoneConfirm = (confirmedUserTz: string) => {
    if (!pendingImportData) return;

    // Update user timezone if changed
    setUserTimezone(confirmedUserTz);

    // Convert the deadline from source timezone to user timezone
    const sourceTimezone = mapTimezoneAbbreviation(pendingImportData.timezone);
    const convertedDeadline = convertTimezone(
      pendingImportData.submissionDeadline, 
      sourceTimezone, 
      confirmedUserTz
    );

    // Process the data with converted timezone
    const processedData = {
      ...pendingImportData,
      submissionDeadline: convertedDeadline
    };

    processImportData(processedData);
    setShowTimezoneConfirm(false);
    setPendingImportData(null);
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
              
              {/* Action Buttons */}
              <div className="flex gap-2 ml-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(hackathon);
                  }}
                  className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                  title="Edit hackathon"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={(e) => handleDeleteEntry(hackathon, e)}
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
              <div className="date-info">
                <Calendar size={14} />
                <span>{formatDate(hackathon.startDate)} - {formatDate(hackathon.endDate)}</span>
              </div>
              
              <div className="deadline-section">
                <div className="date-info">
                  <Clock size={14} />
                  <div className="deadline-info-container">
                    {(() => {
                      // Try to extract original deadline text from notes
                      const deadlineTextLine = hackathon.notes?.split('\n').find(line => line.includes('Imported deadline:'));
                      const originalText = deadlineTextLine?.replace('Imported deadline:', '').trim();
                      
                      // Use hackathon notes instead of formData.notes for display
                      const hackathonNotes = hackathon.notes || '';
                      const sourceTimezoneMatch = hackathonNotes.match(/Source timezone: ([^\n]+)/);
                      const sourceTimezone = sourceTimezoneMatch ? sourceTimezoneMatch[1].trim() : null;
                      
                      // Ensure userTimezone is valid
                      const validUserTimezone = userTimezone && userTimezone.trim() !== '' 
                        ? userTimezone 
                        : Intl.DateTimeFormat().resolvedOptions().timeZone;
                      
                      // Format times safely
                      const userTime = formatTimeWithTimezone(hackathon.submissionDeadline, validUserTimezone, 'User');
                      
                      let sourceTime = null;
                      if (sourceTimezone && sourceTimezone.trim() !== '') {
                        const sourceTzName = mapTimezoneAbbreviation(sourceTimezone);
                        sourceTime = formatTimeWithTimezone(hackathon.submissionDeadline, sourceTzName, 'Source');
                      }
                      
                      const isEstimated = originalText?.includes('Estimated') || false;
                      const warning = getTimezoneWarning(hackathon.submissionDeadline);
                      
                      return (
                        <>
                          <div className="deadline-main">
                            <span>Deadline: {userTime}</span>
                            {isEstimated && (
                              <span className="estimated-badge">
                                <AlertCircle size={12} />
                                Estimated
                              </span>
                            )}
                          </div>
                          
                          {sourceTime && sourceTime !== userTime && (
                            <div className="deadline-original">
                              <Globe size={12} />
                              <span>Source: {sourceTime}</span>
                            </div>
                          )}
                          
                          {warning && (
                            <div className={`timezone-warning ${warning}`}>
                              <AlertCircle size={12} />
                              <span>
                                {warning === 'urgent' 
                                  ? 'Deadline in less than 24 hours!' 
                                  : 'Deadline approaching soon!'}
                              </span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
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

      {/* Timezone Confirmation Modal */}
      {showTimezoneConfirm && pendingImportData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <MapPin size={20} />
              Confirm Your Timezone
            </h3>
            
            <div className="mb-4">
              <p className="text-gray-600 dark:text-gray-300 mb-3">
                We found a deadline with timezone <strong>{pendingImportData.timezone}</strong>. 
                Please confirm your timezone for accurate conversion:
              </p>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mb-4">
                <div className="text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe size={14} />
                    <span className="font-medium">Source:</span>
                    <span>{pendingImportData.deadlineText}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} />
                    <span className="font-medium">Your timezone:</span>
                    <span>{userTimezone}</span>
                  </div>
                </div>
              </div>
              
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select your timezone:
              </label>
              <select
                value={userTimezone}
                onChange={(e) => setUserTimezone(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="America/New_York">Eastern Time (EST/EDT)</option>
                <option value="America/Chicago">Central Time (CST/CDT)</option>
                <option value="America/Denver">Mountain Time (MST/MDT)</option>
                <option value="America/Los_Angeles">Pacific Time (PST/PDT)</option>
                <option value="UTC">UTC</option>
                <option value="Europe/London">London (GMT/BST)</option>
                <option value="Europe/Paris">Paris (CET/CEST)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
                <option value="Asia/Shanghai">Shanghai (CST)</option>
                <option value="Australia/Sydney">Sydney (AEST/AEDT)</option>
              </select>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowTimezoneConfirm(false);
                  setPendingImportData(null);
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleTimezoneConfirm(userTimezone)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Confirm & Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Delete Hackathon
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete "{deleteConfirm.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete Hackathon
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Hackathons; 