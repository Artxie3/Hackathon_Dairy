import React from 'react';
import { X, Plus, StickyNote, CheckSquare, Bell } from 'lucide-react';
import { CalendarNote } from '../utils/supabase';

interface NotesPopupProps {
  isOpen: boolean;
  onClose: () => void;
  notes: CalendarNote[];
  onEditNote: (note: CalendarNote) => void;
  onAddNote: (date: Date) => void;
  date: Date;
}

const NotesPopup: React.FC<NotesPopupProps> = ({
  isOpen,
  onClose,
  notes,
  onEditNote,
  onAddNote,
  date
}) => {
  if (!isOpen) return null;

  const getNoteIcon = (type: string) => {
    switch (type) {
      case 'note':
        return <StickyNote size={12} />;
      case 'task':
        return <CheckSquare size={12} />;
      case 'reminder':
        return <Bell size={12} />;
      default:
        return <StickyNote size={12} />;
    }
  };

  const getNoteColor = (type: string) => {
    switch (type) {
      case 'note':
        return '#3b82f6'; // Blue
      case 'task':
        return '#8b5cf6'; // Purple
      case 'reminder':
        return '#fbbf24'; // Mustard yellow
      default:
        return '#3b82f6';
    }
  };

  const handleNoteClick = (note: CalendarNote) => {
    onEditNote(note);
    onClose();
  };

  const handleAddNoteClick = () => {
    onAddNote(date);
    onClose();
  };

  return (
    <div className="notes-popup">
      {/* Header */}
      <div className="notes-popup-header">
        <h4 className="notes-popup-title">
          {date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          })}
        </h4>
        <button
          onClick={onClose}
          className="notes-popup-close"
          title="Close"
        >
          <X size={16} />
        </button>
      </div>

      {/* Notes List */}
      {notes.length > 0 ? (
        <div className="notes-list">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`note-item ${note.is_completed ? 'completed' : ''}`}
              onClick={() => handleNoteClick(note)}
              title={`${note.title} - ${note.note_type} (${note.priority} priority)${note.is_completed ? ' - Completed' : ''}`}
            >
              <div
                className="note-item-icon"
                style={{ backgroundColor: getNoteColor(note.note_type) }}
              >
                {getNoteIcon(note.note_type)}
              </div>
              <div className="note-item-content">
                <div className="note-item-title">{note.title}</div>
                <div className="note-item-meta">
                  <span className="note-item-type">{note.note_type}</span>
                  <span className={`note-item-priority ${note.priority}`}>
                    {note.priority}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
          No notes for this day
        </div>
      )}

      {/* Add Note Button */}
      <button
        onClick={handleAddNoteClick}
        className="add-note-quick"
      >
        <Plus size={14} />
        Add Note
      </button>
    </div>
  );
};

export default NotesPopup;
