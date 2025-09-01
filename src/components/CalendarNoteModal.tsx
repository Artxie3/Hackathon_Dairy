import React, { useState, useEffect } from 'react';
import { X, Calendar, Tag, AlertCircle, CheckCircle, Clock, Trash2, StickyNote, Plus, Bell } from 'lucide-react';
import { CalendarNote } from '../utils/supabase';
import '../styles/Calendar.css';

interface CalendarNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: Partial<CalendarNote>) => Promise<void>;
  onDelete?: (noteId: string) => Promise<void>;
  note?: CalendarNote | null;
  selectedDate?: Date;
  notes?: CalendarNote[];
  mode?: 'create' | 'edit' | 'list';
  onModeChange?: (mode: 'create' | 'edit' | 'list') => void;
}

const CalendarNoteModal: React.FC<CalendarNoteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  note,
  selectedDate,
  notes = [],
  mode = 'create',
  onModeChange
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteType, setNoteType] = useState<'note' | 'task' | 'reminder'>('note');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [editingNote, setEditingNote] = useState<CalendarNote | null>(null);

  useEffect(() => {
    if (note) {
      // Editing existing note
      setTitle(note.title);
      setContent(note.content || '');
      setNoteType(note.note_type);
      setPriority(note.priority);
      setTags(note.tags || []);
    } else {
      // Creating new note - reset form
      setTitle('');
      setContent('');
      setNoteType('note');
      setPriority('medium');
      setTags([]);
    }
  }, [note, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setErrors(['Title is required']);
      return;
    }

    setIsSaving(true);
    setErrors([]);

    try {
      // Fix date issue by using local date instead of ISO string
      const getLocalDateString = (date: Date) => {
        // Create a new date object to avoid timezone issues
        const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const year = localDate.getFullYear();
        const month = String(localDate.getMonth() + 1).padStart(2, '0');
        const day = String(localDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const noteData: Partial<CalendarNote> = {
        title: title.trim(),
        content: content.trim() || undefined,
        note_type: noteType,
        priority,
        tags,
        note_date: selectedDate ? getLocalDateString(selectedDate) : note?.note_date || getLocalDateString(new Date()),
      };

      await onSave(noteData);
      onClose();
    } catch (error) {
      setErrors(['Failed to save note. Please try again.']);
    } finally {
      setIsSaving(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const handleDelete = async () => {
    if (!note?.id || !onDelete) return;

    if (!window.confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    setErrors([]);

    try {
      await onDelete(note.id);
      onClose();
    } catch (error) {
      setErrors(['Failed to delete note. Please try again.']);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteNoteFromList = async (noteId: string) => {
    if (!onDelete) return;

    if (!window.confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
      return;
    }

    try {
      await onDelete(noteId);
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note. Please try again.');
    }
  };

  const handleEditNote = (noteToEdit: CalendarNote) => {
    setEditingNote(noteToEdit);
    setTitle(noteToEdit.title);
    setContent(noteToEdit.content || '');
    setNoteType(noteToEdit.note_type);
    setPriority(noteToEdit.priority);
    setTags(noteToEdit.tags || []);
    if (onModeChange) {
      onModeChange('edit');
    }
  };

  const handleAddNewNote = () => {
    setEditingNote(null);
    setTitle('');
    setContent('');
    setNoteType('note');
    setPriority('medium');
    setTags([]);
    if (onModeChange) {
      onModeChange('create');
    }
  };

  const getNoteIcon = (type: string) => {
    switch (type) {
      case 'note': return <StickyNote size={16} />;
      case 'task': return <CheckSquare size={16} />;
      case 'reminder': return <Bell size={16} />;
      default: return null;
    }
  };

  const getNoteColor = (type: string) => {
    switch (type) {
      case 'note': return '#3b82f6'; // Blue
      case 'task': return '#8b5cf6'; // Purple
      case 'reminder': return '#fbbf24'; // Mustard yellow
      default: return '#ccc';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-[400px] max-w-[95vw] max-h-[90vh] overflow-hidden border border-gray-200/20 dark:border-gray-700/30">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                {mode === 'list' ? (
                  <StickyNote size={20} className="text-white" />
                ) : mode === 'edit' ? (
                  <StickyNote size={20} className="text-white" />
                ) : (
                  <Plus size={20} className="text-white" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold">
                  {selectedDate?.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h3>
                <p className="text-blue-100 text-sm">
                  {mode === 'list' ? 'Notes & Tasks' : 
                   mode === 'edit' ? 'Edit Note' : 'Create Note'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-all duration-200"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {mode === 'list' ? (
            /* List Mode */
            <>
              {/* Notes List */}
              {notes.length > 0 ? (
                <div className="space-y-3">
                  {notes.map(noteItem => (
                    <div
                      key={noteItem.id}
                      className={`p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-200 ${
                        noteItem.is_completed ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                          style={{ backgroundColor: getNoteColor(noteItem.note_type) }}
                        >
                          {getNoteIcon(noteItem.note_type)}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {noteItem.title}
                          </h4>
                          {noteItem.content && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {noteItem.content}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400">
                              {noteItem.note_type}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              noteItem.priority === 'high' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                              noteItem.priority === 'medium' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                            }`}>
                              {noteItem.priority}
                            </span>
                            {noteItem.is_completed && (
                              <span className="text-xs px-2 py-1 bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                                Completed
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditNote(noteItem)}
                            className="p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                            title="Edit note"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNoteFromList(noteItem.id);
                            }}
                            className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                            title="Delete note"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <StickyNote size={48} className="mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No notes for this day.</p>
                </div>
              )}

              {/* Add Note Button */}
              <button
                onClick={handleAddNewNote}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl transition-all duration-200 font-medium shadow-lg flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Add New Note
              </button>
            </>
          ) : (
            /* Create/Edit Mode */
            <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <label htmlFor="title" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white transition-all duration-200 text-lg font-medium"
              placeholder="What's this note about?"
              required
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <label htmlFor="content" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Content
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white transition-all duration-200 resize-none"
              placeholder="Add details, thoughts, or reminders..."
            />
          </div>

          {/* Type and Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Note Type */}
            <div className="space-y-2">
              <label htmlFor="noteType" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Type
              </label>
              <select
                id="noteType"
                value={noteType}
                onChange={(e) => setNoteType(e.target.value as 'note' | 'task' | 'reminder')}
                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white transition-all duration-200 font-medium"
              >
                <option value="note">📝 Note</option>
                <option value="task">✅ Task</option>
                <option value="reminder">🔔 Reminder</option>
              </select>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <label htmlFor="priority" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Priority
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white transition-all duration-200 font-medium"
              >
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🔴 High</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <label htmlFor="tags" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Tags
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white transition-all duration-200"
                placeholder="Add a tag..."
              />
              <button
                type="button"
                onClick={addTag}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg"
              >
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium border border-blue-200 dark:border-blue-700"
                  >
                    <Tag size={14} />
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-blue-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              {errors.map((error, index) => (
                <div key={index} className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-medium">
                  <AlertCircle size={16} />
                  {error}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            {/* Delete button (only for existing notes) */}
            {note && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting || isSaving}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-lg"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete
                  </>
                )}
              </button>
            )}
            
            {/* Save/Cancel buttons */}
            <div className="flex gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || isDeleting}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-lg"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    {note ? 'Update Note' : 'Create Note'}
                  </>
                )}
              </button>
            </div>
          </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarNoteModal;
