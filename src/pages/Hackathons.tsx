import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Clock, Trophy, ExternalLink, Edit, Trash2, Users, Code, AlertCircle, Download, Loader, Globe } from 'lucide-react';
import { useHackathons, Hackathon } from '../contexts/HackathonContext';
import { DevpostScraper } from '../utils/devpostScraper';
import TimezoneConfirmModal from '../components/TimezoneConfirmModal';
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
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });

  const [showTimezoneModal, setShowTimezoneModal] = useState(false);
  const [importedData, setImportedData] = useState<any>(null);
  const [convertedDates, setConvertedDates] = useState<{
    startDate: string;
    endDate: string;
    submissionDeadline: string;
  } | null>(null);

  const upcomingDeadlines = getUpcomingDeadlines();
  const ongoingHackathons = getOngoingHackathons();
  const completedHackathons = getCompletedHackathons();

  useEffect(() => {
    // Get user's timezone
    setUserTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

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
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
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

  const convertToUserTimezone = (dateStr: string, sourceTimezone: string) => {
    const date = new Date(dateStr);
    const userTz = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Convert the date to user's timezone
    return new Intl.DateTimeFormat('en-US', {
      timeZone: userTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    }).format(date);
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
      setImportedData(scrapedData);

      if (scrapedData.timezone && scrapedData.timezone !== userTimezone) {
        // Convert dates to user timezone for preview
        const convertedDates = {
          startDate: convertToUserTimezone(scrapedData.startDate, scrapedData.timezone),
          endDate: convertToUserTimezone(scrapedData.endDate, scrapedData.timezone),
          submissionDeadline: convertToUserTimezone(scrapedData.submissionDeadline, scrapedData.timezone)
        };
        setConvertedDates(convertedDates);
        setShowTimezoneModal(true);
      } else {
        // If timezones match or source timezone is unknown, proceed with import
        handleImportConfirm(scrapedData);
      }

      setImportUrl('');
    } catch (error) {
      console.error('Import failed:', error);
      handleImportError(error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportConfirm = (data: any, shouldConvert = false) => {
    const formatDateForInput = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
    };

    let dates = {
      startDate: data.startDate,
      endDate: data.endDate,
      submissionDeadline: data.submissionDeadline
    };

    if (shouldConvert && data.timezone) {
      // Convert dates to user timezone
      dates = {
        startDate: convertToUserTimezone(data.startDate, data.timezone),
        endDate: convertToUserTimezone(data.endDate, data.timezone),
        submissionDeadline: convertToUserTimezone(data.submissionDeadline, data.timezone)
      };
    }

    setFormData({
      ...formData,
      title: data.title,
      description: data.description,
      startDate: formatDateForInput(dates.startDate),
      endDate: formatDateForInput(dates.endDate),
      submissionDeadline: formatDateForInput(dates.submissionDeadline),
      status: data.status,
      devpostUrl: data.devpostUrl,
      timezone: shouldConvert ? userTimezone : data.timezone,
      notes: `Original Timezone: ${data.timezone || 'Unknown'}\nOriginal Deadline: ${data.deadlineText || ''}`
    });

    setShowTimezoneModal(false);
    setImportedData(null);
    setConvertedDates(null);
  };

  const handleImportError = (error: any) => {
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
  };

  const formatDateWithTimezone = (dateString: string, originalText?: string, sourceTimezone?: string) => {
    const date = new Date(dateString);
    const userTz = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Format in user's timezone
    const userTime = new Intl.DateTimeFormat('en-US', {
      timeZone: userTz,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    }).format(date);

    // If we have source timezone info, show both times
    let displayTime = userTime;
    if (sourceTimezone && sourceTimezone !== userTz) {
      const sourceTime = new Intl.DateTimeFormat('en-US', {
        timeZone: sourceTimezone,
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      }).format(date);
      displayTime = `${userTime} (originally ${sourceTime})`;
    }

    const isEstimated = originalText?.includes('Estimated') || false;

    return { userTime: displayTime, isEstimated, originalText };
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

  const handleQuickImport = (url: string) => {
    setImportUrl(url);
  };

  // Get list of common timezones
  const getTimezoneList = (): string[] => {
    const timezones = [
      'UTC',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Phoenix',
      'America/Anchorage',
      'Pacific/Honolulu',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Europe/Moscow',
      'Asia/Dubai',
      'Asia/Shanghai',
      'Asia/Tokyo',
      'Asia/Singapore',
      'Australia/Sydney',
      'Pacific/Auckland'
    ];

    // Add user's current timezone if not in list
    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!timezones.includes(userTz)) {
      timezones.unshift(userTz);
    }

    return timezones;
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

              <div className="form-row">
                <div className="form-group">
                  <label>Timezone</label>
                  <select
                    value={formData.timezone || userTimezone}
                    onChange={(e) => setFormData({...formData, timezone: e.target.value})}
                  >
                    {getTimezoneList().map((tz) => (
                      <option key={tz} value={tz}>
                        {tz.replace(/_/g, ' ')}
                      </option>
                    ))}
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
                      const deadlineTextLine = hackathon.notes?.split('\n').find(line => line.includes('Original Deadline:'));
                      const originalText = deadlineTextLine?.replace('Original Deadline:', '').trim();
                      
                      const { userTime, isEstimated } = formatDateWithTimezone(
                        hackathon.submissionDeadline, 
                        originalText,
                        hackathon.timezone
                      );
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
                          
                          {originalText && !isEstimated && (
                            <div className="deadline-original">
                              <Globe size={12} />
                              <span>Source: {originalText}</span>
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

      <TimezoneConfirmModal
        isOpen={showTimezoneModal}
        onClose={() => {
          setShowTimezoneModal(false);
          handleImportConfirm(importedData, false);
        }}
        onConfirm={() => handleImportConfirm(importedData, true)}
        sourceTimezone={importedData?.timezone || 'Unknown'}
        userTimezone={userTimezone}
        dateExample={importedData?.deadlineText || ''}
        convertedDateExample={convertedDates?.submissionDeadline || ''}
      />
    </div>
  );
};

export default Hackathons; 