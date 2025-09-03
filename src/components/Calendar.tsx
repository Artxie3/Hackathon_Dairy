import React, { useState, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, StickyNote, CheckSquare, Bell } from 'lucide-react';
import { useDiary } from '../contexts/DiaryContext';
import { useHackathons } from '../contexts/HackathonContext';
import CalendarNoteModal from './CalendarNoteModal';
import HackathonModal from './HackathonModal';

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
  const [isHackathonModalOpen, setIsHackathonModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'list'>('create');
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
      // Parse the date string directly to avoid timezone issues
      const [year, month, day] = note.note_date.split('-').map(Number);
      const noteDate = new Date(year, month - 1, day); // month is 0-indexed
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
    setModalMode('create');
    setIsNoteModalOpen(true);
  };

  const handleEditNote = (note: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNote(note);
    // Parse the date string directly to avoid timezone issues
    const [year, month, day] = note.note_date.split('-').map(Number);
    const noteDate = new Date(year, month - 1, day); // month is 0-indexed
    setSelectedDate(noteDate);
    setModalMode('edit');
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

    // If the day has notes, show notes modal in list mode
    if (day.hasCalendarNotes) {
      setSelectedDate(day.date);
      setModalMode('list');
      setIsNoteModalOpen(true);
    }
    // If the day has hackathon events, show hackathon modal
    else if (day.hasHackathonEvents) {
      setSelectedDate(day.date);
      setIsHackathonModalOpen(true);
    }
    // Otherwise, call the onDateClick callback
    else if (onDateClick) {
      onDateClick(day.date);
    }
  };



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
              day.hasHackathonEvents && day.hackathonEvents.some(e => e.type === 'start') ? 'has-hackathon-start' : ''
            } ${
              day.hasHackathonEvents && day.hackathonEvents.some(e => e.type === 'end') ? 'has-hackathon-end' : ''
            } ${
              day.hasHackathonEvents && day.hackathonEvents.some(e => e.type === 'deadline') ? 'has-hackathon-deadline' : ''
            } ${
              day.isWeekend ? 'weekend' : ''
            }`}
                         onClick={(e) => handleDayClick(day, e)}
             onDoubleClick={() => handleAddNote(day.date)}

          >
                         <div className="day-number">
               {day.date.getDate()}
             </div>
             
                           {/* Event titles */}
              {day.hasHackathonEvents && (
                <div className="event-title">
                  {day.hackathonEvents.length === 0
                    ? day.hackathonEvents[0].title 
                    : `${day.hackathonEvents[0].title} +${day.hackathonEvents.length - 1}`
                  }
                </div>
              )}

              {/* Note titles */}
              {day.hasCalendarNotes && (
                <div 
                  className={`note-title ${
                    day.calendarNotes[0].priority === 'high' ? 'note-title-high' :
                    day.calendarNotes[0].priority === 'medium' ? 'note-title-medium' :
                    'note-title-low'
                  }`}

                >
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
          setModalMode('create');
        }}
        onSave={handleSaveNote}
        onDelete={handleDeleteNote}
        note={editingNote}
        selectedDate={selectedDate || undefined}
                 notes={selectedDate ? calendarNotes.filter(note => {
           // Parse the date string directly to avoid timezone issues
           const [year, month, day] = note.note_date.split('-').map(Number);
           const noteDate = new Date(year, month - 1, day); // month is 0-indexed
           return noteDate.toDateString() === selectedDate.toDateString();
         }) : []}
        mode={modalMode}
        onModeChange={setModalMode}
      />

      <HackathonModal
        isOpen={isHackathonModalOpen}
        onClose={() => {
          setIsHackathonModalOpen(false);
          setSelectedDate(null);
        }}
        selectedDate={selectedDate || new Date()}
        hackathons={selectedDate ? hackathons.filter(hackathon => {
          const startDate = new Date(hackathon.startDate);
          const endDate = new Date(hackathon.endDate);
          const deadlineDate = new Date(hackathon.submissionDeadline);
          const selectedDateStr = selectedDate.toDateString();
          
          return startDate.toDateString() === selectedDateStr ||
                 endDate.toDateString() === selectedDateStr ||
                 deadlineDate.toDateString() === selectedDateStr;
        }).map(hackathon => {
          const startDate = new Date(hackathon.startDate);
          const endDate = new Date(hackathon.endDate);
          const deadlineDate = new Date(hackathon.submissionDeadline);
          const selectedDateStr = selectedDate.toDateString();
          
          const events = [];
          if (startDate.toDateString() === selectedDateStr) {
            events.push({
              id: `${hackathon.id}-start`,
              title: hackathon.title,
              type: 'start' as const,
              date: hackathon.startDate,
              description: hackathon.description,
              url: hackathon.devpostUrl,
              platform: hackathon.organizer
            });
          }
          if (endDate.toDateString() === selectedDateStr) {
            events.push({
              id: `${hackathon.id}-end`,
              title: hackathon.title,
              type: 'end' as const,
              date: hackathon.endDate,
              description: hackathon.description,
              url: hackathon.devpostUrl,
              platform: hackathon.organizer
            });
          }
          if (deadlineDate.toDateString() === selectedDateStr) {
            events.push({
              id: `${hackathon.id}-deadline`,
              title: hackathon.title,
              type: 'deadline' as const,
              date: hackathon.submissionDeadline,
              description: hackathon.description,
              url: hackathon.devpostUrl,
              platform: hackathon.organizer
            });
          }
          return events;
        }).flat() : []}
      />

    </div>
  );
};

export default Calendar; 