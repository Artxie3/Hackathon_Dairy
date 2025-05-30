import React, { useState } from 'react';
import { 
  Calendar, 
  Pencil, 
  Trash2, 
  Plus, 
  Search, 
  Mic, 
  XCircle, 
  Filter,
  Github 
} from 'lucide-react';
import '../styles/DiaryEntries.css';

// Mock data for diary entries
const MOCK_ENTRIES = [
  {
    id: 1,
    date: '2023-04-20',
    title: 'Fixed Critical Bug in Auth Flow',
    content: 'Today I finally tracked down that authentication bug that was causing random logouts. It turned out to be a timing issue with token refresh. I felt really accomplished solving this one!',
    mood: 'accomplished',
    githubCommit: 'a1b2c3d',
    githubRepo: 'auth-service',
    tags: ['bug-fix', 'authentication'],
    audioNote: null
  },
  {
    id: 2,
    date: '2023-04-19',
    title: 'Struggling with React Context',
    content: "I've been stuck for hours trying to figure out why my context isn't updating properly. I'm feeling really frustrated with this. Going to take a break and come back to it tomorrow with fresh eyes.",
    mood: 'frustrated',
    githubCommit: null,
    githubRepo: null,
    tags: ['react', 'debugging'],
    audioNote: 'audio-note-2.mp3'
  },
  {
    id: 3,
    date: '2023-04-18',
    title: 'Started New Project - Task Manager',
    content: "I'm excited to start working on this new task manager app. I've mapped out the main features and created the initial project structure. Really looking forward to building this out!",
    mood: 'excited',
    githubCommit: 'e5f6g7h',
    githubRepo: 'task-manager',
    tags: ['new-project', 'planning'],
    audioNote: null
  }
];

const DiaryEntries: React.FC = () => {
  const [entries, setEntries] = useState(MOCK_ENTRIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  // All unique tags from entries
  const allTags = Array.from(
    new Set(entries.flatMap(entry => entry.tags))
  );
  
  // Filter entries based on search and tags
  const filteredEntries = entries.filter(entry => {
    const matchesSearch = 
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesTags = 
      selectedTags.length === 0 || 
      selectedTags.some(tag => entry.tags.includes(tag));
      
    return matchesSearch && matchesTags;
  });
  
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };
  
  const getMoodEmoji = (mood: string) => {
    switch (mood) {
      case 'accomplished': return '😊';
      case 'frustrated': return '😣';
      case 'excited': return '😃';
      default: return '😐';
    }
  };
  
  return (
    <div className="diary-container">
      <div className="diary-header">
        <h1>Diary Entries</h1>
        <button className="btn btn-primary new-entry-btn" onClick={() => setIsCreating(true)}>
          <Plus size={16} />
          <span>New Entry</span>
        </button>
      </div>
      
      <div className="diary-filters">
        <div className="search-container">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button className="clear-search\" onClick={() => setSearchQuery('')}>
              <XCircle size={16} />
            </button>
          )}
        </div>
        
        <div className="tags-filter">
          <div className="filter-label">
            <Filter size={16} />
            <span>Filter by tag:</span>
          </div>
          <div className="tags-list">
            {allTags.map(tag => (
              <button
                key={tag}
                className={`tag-btn ${selectedTags.includes(tag) ? 'selected' : ''}`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="entries-list">
        {filteredEntries.length > 0 ? (
          filteredEntries.map(entry => (
            <div key={entry.id} className="entry-card">
              <div className="entry-header">
                <div className="entry-date">
                  <Calendar size={14} />
                  <span>{new Date(entry.date).toLocaleDateString()}</span>
                </div>
                <div className="entry-mood">{getMoodEmoji(entry.mood)}</div>
              </div>
              
              <h3 className="entry-title">{entry.title}</h3>
              
              <p className="entry-content">{entry.content}</p>
              
              {entry.githubCommit && (
                <div className="entry-commit">
                  <Github size={14} />
                  <span>Commit <span className="commit-hash">{entry.githubCommit}</span> in {entry.githubRepo}</span>
                </div>
              )}
              
              {entry.audioNote && (
                <div className="entry-audio">
                  <audio controls src={entry.audioNote}>
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
              
              <div className="entry-tags">
                {entry.tags.map(tag => (
                  <span key={tag} className="entry-tag">{tag}</span>
                ))}
              </div>
              
              <div className="entry-actions">
                <button className="entry-action edit">
                  <Pencil size={16} />
                </button>
                <button className="entry-action delete">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="no-entries">
            <p>No entries match your search criteria.</p>
          </div>
        )}
      </div>
      
      {isCreating && (
        <div className="entry-modal-overlay">
          <div className="entry-modal">
            <div className="modal-header">
              <h2>New Diary Entry</h2>
              <button className="close-modal" onClick={() => setIsCreating(false)}>
                <XCircle size={20} />
              </button>
            </div>
            
            <form className="entry-form">
              <div className="form-group">
                <label htmlFor="entry-title">Title</label>
                <input 
                  type="text" 
                  id="entry-title" 
                  placeholder="Give your entry a title"
                  className="input"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="entry-content">What's on your mind?</label>
                <textarea 
                  id="entry-content" 
                  rows={5}
                  placeholder="Write about your coding experience, challenges, achievements..."
                  className="input"
                ></textarea>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Mood</label>
                  <select className="input">
                    <option value="accomplished">Accomplished 😊</option>
                    <option value="excited">Excited 😃</option>
                    <option value="neutral">Neutral 😐</option>
                    <option value="tired">Tired 😴</option>
                    <option value="frustrated">Frustrated 😣</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Link to GitHub commit (optional)</label>
                  <input 
                    type="text" 
                    placeholder="Paste commit URL or ID"
                    className="input"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Tags</label>
                <input 
                  type="text" 
                  placeholder="Add tags separated by commas"
                  className="input"
                />
              </div>
              
              <div className="audio-recording">
                <button 
                  type="button"
                  className={`audio-btn ${isRecording ? 'recording' : ''}`}
                  onClick={() => setIsRecording(!isRecording)}
                >
                  <Mic size={16} />
                  <span>{isRecording ? 'Recording...' : 'Record Audio Note'}</span>
                </button>
                
                {isRecording && (
                  <div className="recording-indicator">
                    <div className="recording-waves">
                      <div className="wave"></div>
                      <div className="wave"></div>
                      <div className="wave"></div>
                    </div>
                    <span>00:15</span>
                  </div>
                )}
              </div>
              
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreating(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiaryEntries;