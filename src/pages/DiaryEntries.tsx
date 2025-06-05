import React, { useState } from 'react';
import { Plus, Search, Filter, X, Edit, Trash2, GitBranch, RefreshCw, ExternalLink, BookOpen, FileText, CalendarDays, Users } from 'lucide-react';
import { useDiary } from '../contexts/DiaryContext';
import { EntryEditor } from '../components/EntryEditor';
import { AudioPlayer } from '../components/AudioPlayer';
import { ImageViewer } from '../components/ImageViewer';
import { DiaryEntry } from '../utils/supabase';
import '../styles/DiaryEntries.css';

const DiaryEntries: React.FC = () => {
  const { 
    entries, 
    temporaryDrafts,
    loading, 
    error, 
    createEntry, 
    updateEntry, 
    deleteEntry,
    syncGitHubCommits,
    isSyncing,
    lastSyncTime,
    convertTemporaryDraft,
    dismissTemporaryDraft
  } = useDiary();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'recent' | 'drafts' | 'commits'>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DiaryEntry | null>(null);
  
  // Image viewer state
  const [imageViewerState, setImageViewerState] = useState<{
    isOpen: boolean;
    images: string[];
    initialIndex: number;
    title?: string;
  }>({
    isOpen: false,
    images: [],
    initialIndex: 0,
    title: ''
  });

  // Get unique tags from all entries
  const allTags = Array.from(new Set(entries.flatMap(entry => entry.tags || [])));

  // Get entries from last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentEntries = entries.filter(entry => new Date(entry.created_at) >= sevenDaysAgo);

  // Get draft entries
  const draftEntries = entries.filter(entry => entry.is_draft);

  // Get commit-based entries (entries with commit info)
  const commitEntries = entries.filter(entry => entry.commit_hash && entry.commit_repo);

  // Filter entries based on active tab
  const getFilteredEntriesByTab = () => {
    switch (activeTab) {
      case 'recent':
        return recentEntries;
      case 'drafts':
        return draftEntries;
      case 'commits':
        return commitEntries;
      default:
        return entries;
    }
  };

  const tabEntries = getFilteredEntriesByTab();

  const filteredEntries = tabEntries.filter(entry => {
    const matchesSearch = searchQuery === '' ||
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTags = selectedTags.length === 0 ||
      selectedTags.every(tag => entry.tags?.includes(tag));

    return matchesSearch && matchesTags;
  });

  // Filter temporary drafts similarly
  const filteredTemporaryDrafts = temporaryDrafts.filter(draft => {
    const matchesSearch = searchQuery === '' ||
      draft.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      draft.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTags = selectedTags.length === 0 ||
      selectedTags.every(tag => draft.tags?.includes(tag));

    return matchesSearch && matchesTags;
  });

  const handleNewEntry = () => {
    setIsCreating(true);
    setEditingEntry(null);
  };

  const handleEditEntry = (entry: DiaryEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEntry(entry);
    setIsCreating(false);
  };

  const handleEditTemporaryDraft = async (draftId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Convert temporary draft to real entry and start editing
      const newEntry = await convertTemporaryDraft(draftId);
      setEditingEntry(newEntry);
      setIsCreating(false);
    } catch (err) {
      console.error('Error converting temporary draft:', err);
    }
  };

  const handleDeleteEntry = (entry: DiaryEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm(entry);
  };

  const handleDismissDraft = (draftId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dismissTemporaryDraft(draftId);
  };

  const confirmDelete = async () => {
    if (deleteConfirm) {
      try {
        await deleteEntry(deleteConfirm.id);
        setDeleteConfirm(null);
      } catch (err) {
        console.error('Error deleting entry:', err);
      }
    }
  };

  const handleSaveEntry = async (entryData: Partial<DiaryEntry>) => {
    try {
      if (editingEntry) {
        await updateEntry(editingEntry.id, entryData);
      } else {
        await createEntry(entryData);
      }
      setEditingEntry(null);
      setIsCreating(false);
    } catch (err) {
      console.error('Error saving entry:', err);
    }
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setIsCreating(false);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleSyncCommits = async () => {
    await syncGitHubCommits();
  };

  const formatLastSyncTime = (time: Date | null) => {
    if (!time) return 'Never';
    const now = new Date();
    const diff = now.getTime() - time.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return time.toLocaleDateString();
  };

  const getCommitUrl = (commitHash: string, repoName: string) => {
    // Always expect owner/repo format
    const [owner, repo] = repoName.split('/');
    if (!owner || !repo) {
      // If repo name doesn't include owner, use the repo name as is
      return `https://github.com/${repoName}/commit/${commitHash}`;
    }
    return `https://github.com/${owner}/${repo}/commit/${commitHash}`;
  };

  const handleImageClick = (images: string[], index: number, entryTitle: string) => {
    setImageViewerState({
      isOpen: true,
      images,
      initialIndex: index,
      title: entryTitle
    });
  };

  const closeImageViewer = () => {
    setImageViewerState(prev => ({ ...prev, isOpen: false }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 dark:text-red-400">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Diary Entries</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track your hackathon participations and projects
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSyncCommits}
            disabled={isSyncing}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Sync GitHub commits"
          >
            {isSyncing ? (
              <RefreshCw className="animate-spin" size={20} />
            ) : (
              <GitBranch size={20} />
            )}
            {isSyncing ? 'Syncing...' : 'Sync Commits'}
          </button>
          <button
            onClick={handleNewEntry}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 transition-colors"
          >
            <Plus size={20} />
            New Entry
          </button>
        </div>
      </div>

      {/* Sync Status */}
      {lastSyncTime && (
        <div className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Last sync: {formatLastSyncTime(lastSyncTime)}
          {filteredTemporaryDrafts.length > 0 && (
            <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs">
              {filteredTemporaryDrafts.length === 1 ? 'new commit' : `${filteredTemporaryDrafts.length} new commits`}
            </span>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {[
          { key: 'all', label: 'All', count: entries.length },
          { key: 'recent', label: 'This Week', count: recentEntries.length },
          { key: 'drafts', label: 'Drafts', count: draftEntries.length },
          { key: 'commits', label: 'From Commits', count: commitEntries.length },
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

      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Tags Filter */}
        {allTags.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Filter size={16} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by tag:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active Filters */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Active filters:</span>
            {selectedTags.map(tag => (
              <span
                key={tag}
                className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full flex items-center gap-2 text-sm"
              >
                {tag}
                <button onClick={() => toggleTag(tag)} className="hover:text-blue-900 dark:hover:text-blue-100">
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Entry Editor */}
      {(isCreating || editingEntry) && (
        <div className="mb-8">
          <EntryEditor
            entry={editingEntry || {}}
            onSave={handleSaveEntry}
            onCancel={handleCancelEdit}
          />
        </div>
      )}

      {/* Entries Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Temporary Drafts - only show on all or commits tab */}
        {(activeTab === 'all' || activeTab === 'commits') && filteredTemporaryDrafts.map(draft => (
          <div
            key={draft.id}
            className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-blue-200 dark:border-blue-700 overflow-hidden"
          >
            {/* Temporary Draft Header */}
            <div className="p-6 pb-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {new Date(draft.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })} at {new Date(draft.created_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="px-2 py-1 bg-blue-500 text-white rounded-full text-xs font-medium">
                      New Commit
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 break-words">
                    {draft.title || 'Untitled Entry'}
                  </h2>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={(e) => handleEditTemporaryDraft(draft.id, e)}
                    className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 transition-colors"
                    title="Create diary entry"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={(e) => handleDismissDraft(draft.id, e)}
                    className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                    title="Dismiss"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Draft Content */}
              <p className="text-gray-600 dark:text-gray-300 mb-4 italic break-words">
                {draft.content || 'Click edit to add your thoughts about this commit...'}
              </p>

              {/* Commit Info */}
              <div className="mb-4 p-3 bg-white/70 dark:bg-gray-700/70 rounded-lg">
                {/* Commit Message */}
                {draft.commit_message && (
                  <div className="mb-3 text-sm text-gray-800 dark:text-gray-200 font-medium break-words">
                    "{draft.commit_message}"
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 min-w-0 flex-1">
                    <GitBranch size={14} className="flex-shrink-0" />
                    <span className="font-mono bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-xs flex-shrink-0">
                      {draft.commit_hash.substring(0, 7)}
                    </span>
                    <span className="truncate">in {draft.commit_repo}</span>
                  </div>
                  <a
                    href={getCommitUrl(draft.commit_hash, draft.commit_repo)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 transition-colors flex-shrink-0 ml-2"
                    title="View commit on GitHub"
                  >
                    <ExternalLink size={14} />
                    <span className="text-xs">View</span>
                  </a>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {draft.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Regular Entries */}
        {filteredEntries.map(entry => (
          <div
            key={entry.id}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200 dark:border-gray-700 overflow-hidden ${
              entry.is_draft ? 'border-l-4 border-l-yellow-500' : ''
            }`}
          >
            {/* Entry Header */}
            <div className="p-6 pb-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {new Date(entry.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })} at {new Date(entry.created_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {entry.mood && (
                      <span className="text-2xl">{entry.mood}</span>
                    )}
                    {entry.is_draft && (
                      <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-full text-xs font-medium">
                        Draft
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 break-words">
                    {entry.title}
                  </h2>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={(e) => handleEditEntry(entry, e)}
                    className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                    title="Edit entry"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteEntry(entry, e)}
                    className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                    title="Delete entry"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Entry Content */}
              <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3 break-words">
                {entry.content || 'No content yet...'}
              </p>

              {/* Images */}
              {entry.images && entry.images.length > 0 && (
                <div className="mb-4">
                  <div className="grid grid-cols-2 gap-2">
                    {entry.images.slice(0, 4).map((imageUrl, index) => (
                      <img
                        key={index}
                        src={imageUrl}
                        alt={`Entry image ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => handleImageClick(entry.images!, index, entry.title)}
                      />
                    ))}
                  </div>
                  {entry.images.length > 4 && (
                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      +{entry.images.length - 4} more images
                    </div>
                  )}
                </div>
              )}

              {/* Audio Player */}
              {entry.audio_url && (
                <div className="mb-4">
                  <AudioPlayer src={entry.audio_url} />
                </div>
              )}

              {/* Commit Info */}
              {entry.commit_hash && entry.commit_repo && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 min-w-0 flex-1">
                      <GitBranch size={14} className="flex-shrink-0" />
                      <span className="font-mono bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-xs flex-shrink-0">
                        {entry.commit_hash.substring(0, 7)}
                      </span>
                      <span className="truncate">in {entry.commit_repo}</span>
                    </div>
                    <a
                      href={getCommitUrl(entry.commit_hash, entry.commit_repo)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 transition-colors flex-shrink-0 ml-2"
                      title="View commit on GitHub"
                    >
                      <ExternalLink size={14} />
                      <span className="text-xs">View</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Tags */}
              {entry.tags && entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {entry.tags.map(tag => (
                    <span
                      key={tag}
                      className={`px-2 py-1 rounded-full text-sm ${
                        tag === 'auto-generated' 
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredEntries.length === 0 && filteredTemporaryDrafts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 dark:text-gray-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No entries found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {selectedTags.length > 0 || searchQuery 
              ? 'Try adjusting your filters or search terms.' 
              : 'Start writing your first diary entry or sync your GitHub commits!'}
          </p>
          {selectedTags.length === 0 && !searchQuery && (
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleSyncCommits}
                disabled={isSyncing}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {isSyncing ? 'Syncing...' : 'Sync GitHub Commits'}
              </button>
              <button
                onClick={handleNewEntry}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Create First Entry
              </button>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Delete Entry
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
                Delete Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer */}
      {imageViewerState.isOpen && (
        <ImageViewer
          images={imageViewerState.images}
          initialIndex={imageViewerState.initialIndex}
          isOpen={imageViewerState.isOpen}
          onClose={closeImageViewer}
          title={imageViewerState.title}
        />
      )}
    </div>
  );
};

export default DiaryEntries;