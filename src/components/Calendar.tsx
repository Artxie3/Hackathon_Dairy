import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, StickyNote, CheckSquare, Bell } from 'lucide-react';
import { useDiary } from '../contexts/DiaryContext';
import { useHackathons } from '../contexts/HackathonContext';
import CalendarNoteModal from './CalendarNoteModal';
import NotesPopup from './NotesPopup';

interface CalendarProps {
  onDateClick?: (date: Date) => void;
  className?: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasEntries: boolean;
  entriesCount: number;
  isWeekend: boolean;
  hasHackathonEvents: boolean;
  hackathonEvents: Array<{
    type: 'start' | 'end' | 'deadline';
    title: string;
    color: string;
  }>;
  hasCalendarNotes: boolean;
  calendarNotes: Array<{
    id: string;
    title: string;
    type: 'note' | 'task' | 'reminder';
    priority: 'low' | 'medium' | 'high';
    isCompleted: boolean;
  }>;
}

const Calendar: React.FC<CalendarProps> = ({ onDateClick, className = '' }) => {
  const { entries, temporaryDrafts, calendarNotes, createCalendarNote, updateCalendarNote, deleteCalendarNote } = useDiary();
  const { hackathons } = useHackathons();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupDate, setPopupDate] = useState<Date | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from the first Sunday (or Monday) of the calendar
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // End at the last Saturday (or Sunday) of the calendar
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
    
    const days: CalendarDay[] = [];
    const today = new Date();
    
    // Create entries map for quick lookup
    const entriesMap = new Map<string, number>();
    
    // Count regular entries by date
    entries.forEach(entry => {
      const entryDate = new Date(entry.created_at);
      const dateKey = entryDate.toDateString();
      entriesMap.set(dateKey, (entriesMap.get(dateKey) || 0) + 1);
    });
    
    // Count temporary drafts by date
    temporaryDrafts.forEach(draft => {
      const draftDate = new Date(draft.created_at);
      const dateKey = draftDate.toDateString();
      entriesMap.set(dateKey, (entriesMap.get(dateKey) || 0) + 1);
    });

    // Create hackathon events map
    const hackathonEventsMap = new Map<string, Array<{ type: 'start' | 'end' | 'deadline'; title: string; color: string; }>>();
    
    hackathons.forEach(hackathon => {
      // Start date
      const startDate = new Date(hackathon.startDate);
      const startKey = startDate.toDateString();
      if (!hackathonEventsMap.has(startKey)) {
        hackathonEventsMap.set(startKey, []);
      }
      hackathonEventsMap.get(startKey)!.push({
        type: 'start',
        title: hackathon.title,
        color: '#87ceeb' // light blue
      });

      // End date
      const endDate = new Date(hackathon.endDate);
      const endKey = endDate.toDateString();
      if (!hackathonEventsMap.has(endKey)) {
        hackathonEventsMap.set(endKey, []);
      }
      hackathonEventsMap.get(endKey)!.push({
        type: 'end',
        title: hackathon.title,
        color: '#ef4444' // red
      });

      // Deadline date
      const deadlineDate = new Date(hackathon.submissionDeadline);
      const deadlineKey = deadlineDate.toDateString();
      if (!hackathonEventsMap.has(deadlineKey)) {
        hackathonEventsMap.set(deadlineKey, []);
      }
      hackathonEventsMap.get(deadlineKey)!.push({
        type: 'deadline',
        title: hackathon.title,
        color: '#ff00ff' // fuchsia
      });
    });
    
    // Create calendar notes map for quick lookup
    const calendarNotesMap = new Map<string, Array<{
      id: string;
      title: string;
      type: 'note' | 'task' | 'reminder';
      priority: 'low' | 'medium' | 'high';
      isCompleted: boolean;
    }>>();
    
    // Map calendar notes by date
    calendarNotes.forEach(note => {
      const noteDate = new Date(note.note_date);
      const dateKey = noteDate.toDateString();
      if (!calendarNotesMap.has(dateKey)) {
        calendarNotesMap.set(dateKey, []);
      }
      calendarNotesMap.get(dateKey)!.push({
        id: note.id,
        title: note.title,
        type: note.note_type,
        priority: note.priority,
        isCompleted: note.is_completed,
      });
    });

    // Generate all days for the calendar grid
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateKey = current.toDateString();
      const entriesCount = entriesMap.get(dateKey) || 0;
      const hackathonEvents = hackathonEventsMap.get(dateKey) || [];
      const dayNotes = calendarNotesMap.get(dateKey) || [];
      
      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === month,
        isToday: current.toDateString() === today.toDateString(),
        hasEntries: entriesCount > 0,
        entriesCount,
        isWeekend: current.getDay() === 0 || current.getDay() === 6,
        hasHackathonEvents: hackathonEvents.length > 0,
        hackathonEvents,
        hasCalendarNotes: dayNotes.length > 0,
        calendarNotes: dayNotes,
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [currentDate, entries, temporaryDrafts, hackathons, calendarNotes]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };



  const handleAddNote = (date: Date) => {
    setSelectedDate(date);
    setEditingNote(null);
    setIsNoteModalOpen(true);
  };

  const handleEditNote = (note: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNote(note);
    setSelectedDate(new Date(note.note_date));
    setIsNoteModalOpen(true);
  };

  const handleSaveNote = async (noteData: any) => {
    try {
      if (editingNote) {
        await updateCalendarNote(editingNote.id, noteData);
      } else {
        await createCalendarNote(noteData);
      }
      // Close modal and reset state
      setIsNoteModalOpen(false);
      setEditingNote(null);
      setSelectedDate(null);
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteCalendarNote(noteId);
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleDayClick = (day: CalendarDay, event: React.MouseEvent) => {
    // Check if clicking on a note indicator
    const target = event.target as HTMLElement;
    if (target.closest('.note-indicator') || target.closest('.calendar-notes-indicators')) {
      return; // Let the note indicator handle the click
    }

    // If the day has notes, show popup
    if (day.hasCalendarNotes) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const bottomY = rect.bottom + 10;
      
      // Ensure popup stays within viewport
      const popupWidth = 280;
      const viewportWidth = window.innerWidth;
      const adjustedX = Math.max(popupWidth / 2, Math.min(centerX, viewportWidth - popupWidth / 2));
      
      setPopupPosition({
        x: adjustedX,
        y: bottomY
      });
      setPopupDate(day.date);
      setPopupOpen(true);
    } else if (onDateClick) {
      onDateClick(day.date);
    }
  };

  const handleEditNoteFromPopup = (note: any) => {
    setEditingNote(note);
    setSelectedDate(new Date(note.note_date));
    setIsNoteModalOpen(true);
  };

  const handleAddNoteFromPopup = (date: Date) => {
    setSelectedDate(date);
    setEditingNote(null);
    setIsNoteModalOpen(true);
  };

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setPopupOpen(false);
        setPopupPosition(null);
      }
    };

    if (popupOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [popupOpen]);

  return (
    <div ref={calendarRef} className={`calendar-container ${className}`}>
      {/* Calendar Header */}
      <div className="calendar-header">
        <div className="calendar-navigation">
          <button
            onClick={() => navigateMonth('prev')}
            className="nav-button"
            title="Previous month"
          >
            <ChevronLeft size={20} />
          </button>
          
          <h2 className="calendar-title">
            {months[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          
          <button
            onClick={() => navigateMonth('next')}
            className="nav-button"
            title="Next month"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => handleAddNote(new Date())}
            className="add-note-button"
            title="Add note for today"
          >
            <Plus size={16} />
            Add Note
          </button>
          <button
            onClick={goToToday}
            className="today-button"
          >
            Today
          </button>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="calendar-weekdays">
        {weekDays.map(day => (
          <div key={day} className="weekday-header">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid">
        {calendarDays.map((day, index) => (
          <div
            key={index}
            className={`calendar-day ${
              !day.isCurrentMonth ? 'other-month' : ''
            } ${
              day.isToday ? 'today' : ''
            } ${
              day.hasEntries ? 'has-entries' : ''
            } ${
              day.hasHackathonEvents ? 'has-hackathon-events' : ''
            } ${
              day.isWeekend ? 'weekend' : ''
            }`}
                         onClick={(e) => handleDayClick(day, e)}
             onDoubleClick={() => handleAddNote(day.date)}
            title={
              `${day.hasEntries ? `${day.entriesCount} ${day.entriesCount === 1 ? 'entry' : 'entries'}` : ''}${day.hasEntries && day.hasHackathonEvents ? ', ' : ''}${day.hasHackathonEvents ? day.hackathonEvents.map(e => `${e.title} (${e.type})`).join(', ') : ''}${day.hasCalendarNotes ? `, ${day.calendarNotes.length} ${day.calendarNotes.length === 1 ? 'note' : 'notes'}` : ''} - ${day.date.toLocaleDateString()}\n\nDouble-click to add a note`
            }
          >
                         <div className="day-number">
               {day.date.getDate()}
             </div>
             
                           {/* Event titles */}
              {day.hasHackathonEvents && (
                <div className="event-title" title={day.hackathonEvents.map(e => `${e.title} (${e.type})`).join(', ')}>
                  {day.hackathonEvents.length === 1 
                    ? day.hackathonEvents[0].title 
                    : `${day.hackathonEvents[0].title} +${day.hackathonEvents.length - 1}`
                  }
                </div>
              )}

              {/* Note titles */}
              {day.hasCalendarNotes && (
                <div className="note-title" title={day.calendarNotes.map(n => `${n.title} (${n.type})`).join(', ')}>
                  {day.calendarNotes.length === 1 
                    ? day.calendarNotes[0].title 
                    : `${day.calendarNotes[0].title} +${day.calendarNotes.length - 1}`
                  }
                </div>
              )}
            
            {/* Entry indicators */}
            {day.hasEntries && (
              <div className="entry-indicators">
                {day.entriesCount <= 3 ? (
                  // Show individual dots for 1-3 entries
                  Array.from({ length: day.entriesCount }).map((_, i) => (
                    <div key={i} className="entry-dot" />
                  ))
                ) : (
                  // Show count for 4+ entries
                  <div className="entry-count">
                    {day.entriesCount}
                  </div>
                )}
              </div>
            )}

            {/* Hackathon event indicators */}
            {day.hasHackathonEvents && (
              <div className="hackathon-indicators">
                {day.hackathonEvents.slice(0, 3).map((event, i) => (
                  <div 
                    key={i} 
                    className={`hackathon-dot ${event.type}`}
                    style={{ backgroundColor: event.color }}
                    title={`${event.title} - ${event.type}`}
                  />
                ))}
                {day.hackathonEvents.length > 3 && (
                  <div className="hackathon-more">+{day.hackathonEvents.length - 3}</div>
                )}
              </div>
            )}

            {/* Calendar notes indicators */}
            {day.hasCalendarNotes && (
              <div className="calendar-notes-indicators">
                {day.calendarNotes.slice(0, 3).map((note, i) => (
                  <div 
                    key={i} 
                    className={`note-indicator ${note.type} ${note.priority} ${note.isCompleted ? 'completed' : ''}`}
                    title={`${note.title} (${note.type}, ${note.priority} priority)${note.isCompleted ? ' - Completed' : ''}`}
                    onClick={(e) => handleEditNote(note, e)}
                  >
                    {note.type === 'note' && <StickyNote size={12} />}
                    {note.type === 'task' && <CheckSquare size={12} />}
                    {note.type === 'reminder' && <Bell size={12} />}
                  </div>
                ))}
                {day.calendarNotes.length > 3 && (
                  <div className="notes-more">+{day.calendarNotes.length - 3}</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="calendar-legend">
        <div className="legend-item">
          <div className="legend-dot has-entries"></div>
          <span>Days with entries</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot today"></div>
          <span>Today</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot hackathon-start" style={{ backgroundColor: '#87ceeb' }}></div>
          <span>Hackathon starts</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot hackathon-deadline" style={{ backgroundColor: '#ff00ff' }}></div>
          <span>Submission deadline</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot hackathon-end" style={{ backgroundColor: '#ef4444' }}></div>
          <span>Hackathon ends</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot note-indicator note medium" style={{ backgroundColor: '#3b82f6' }}></div>
          <span>Notes</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot note-indicator task medium" style={{ backgroundColor: '#8b5cf6' }}></div>
          <span>Tasks</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot note-indicator reminder medium" style={{ backgroundColor: '#fbbf24' }}></div>
          <span>Reminders</span>
        </div>
      </div>

             {/* Calendar Note Modal */}
       <CalendarNoteModal
         isOpen={isNoteModalOpen}
         onClose={() => {
           setIsNoteModalOpen(false);
           setEditingNote(null);
           setSelectedDate(null);
         }}
         onSave={handleSaveNote}
         onDelete={handleDeleteNote}
         note={editingNote}
         selectedDate={selectedDate || undefined}
       />

       {/* Notes Popup */}
       {popupDate && (
         <NotesPopup
           isOpen={popupOpen}
           onClose={() => {
             setPopupOpen(false);
             setPopupPosition(null);
           }}
           notes={calendarNotes.filter(note => {
             const noteDate = new Date(note.note_date);
             return noteDate.toDateString() === popupDate.toDateString();
           })}
           onEditNote={handleEditNoteFromPopup}
           onAddNote={handleAddNoteFromPopup}
           date={popupDate}
           position={popupPosition || undefined}
         />
       )}
    </div>
  );
};

export default Calendar; 