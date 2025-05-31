import React, { useState } from 'react';
import { Plus, Search, Filter, X } from 'lucide-react';
import { useDiary } from '../contexts/DiaryContext';
import { EntryEditor } from '../components/EntryEditor';
import { DiaryEntry } from '../utils/supabase';
import '../styles/DiaryEntries.css';

const DiaryEntries: React.FC = () => {
  const { entries, loading, error, createEntry, updateEntry, deleteEntry } = useDiary();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);

  // Get unique tags from all entries
  const allTags = Array.from(new Set(entries.flatMap(entry => entry.tags || [])));

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = searchQuery === '' ||
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTags = selectedTags.length === 0 ||
      selectedTags.every(tag => entry.tags?.includes(tag));

    return matchesSearch && matchesTags;
  });

  const handleNewEntry = () => {
    setIsCreating(true);
    setEditingEntry(null);
  };

  const handleEditEntry = (entry: DiaryEntry) => {
    setEditingEntry(entry);
    setIsCreating(false);
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
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Diary Entries</h1>
        <button
          onClick={handleNewEntry}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
        >
          <Plus size={20} />
          New Entry
        </button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              className="pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:outline-none appearance-none"
              onChange={(e) => toggleTag(e.target.value)}
              value=""
            >
              <option value="">Filter by tag</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedTags.map(tag => (
              <span
                key={tag}
                className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full flex items-center gap-2"
              >
                {tag}
                <button onClick={() => toggleTag(tag)}>
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

      {/* Entries List */}
      <div className="space-y-6">
        {filteredEntries.map(entry => (
          <div
            key={entry.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => handleEditEntry(entry)}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">{entry.title}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(entry.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              {entry.mood && (
                <span className="text-2xl">{entry.mood}</span>
              )}
            </div>

            <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
              {entry.content}
            </p>

            {entry.audio_url && (
              <div className="mb-4">
                <audio controls src={entry.audio_url} className="w-full" />
              </div>
            )}

            {entry.tags && entry.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {entry.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {entry.commit_hash && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                <p>Commit: {entry.commit_hash.substring(0, 7)}</p>
                <p>Repository: {entry.commit_repo}</p>
              </div>
            )}
          </div>
        ))}

        {filteredEntries.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No entries found. Start writing your first entry!
          </div>
        )}
      </div>
    </div>
  );
};

export default DiaryEntries;