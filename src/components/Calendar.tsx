import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useDiary } from '../contexts/DiaryContext';
import { useHackathons } from '../contexts/HackathonContext';

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
}

const Calendar: React.FC<CalendarProps> = ({ onDateClick, className = '' }) => {
  const { entries, temporaryDrafts } = useDiary();
  const { hackathons } = useHackathons();
  const [currentDate, setCurrentDate] = useState(new Date());

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
        color: '#06b6d4' // cyan-blue
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
        color: '#f59e0b' // amber
      });
    });
    
    // Generate all days for the calendar grid
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateKey = current.toDateString();
      const entriesCount = entriesMap.get(dateKey) || 0;
      const hackathonEvents = hackathonEventsMap.get(dateKey) || [];
      
      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === month,
        isToday: current.toDateString() === today.toDateString(),
        hasEntries: entriesCount > 0,
        entriesCount,
        isWeekend: current.getDay() === 0 || current.getDay() === 6,
        hasHackathonEvents: hackathonEvents.length > 0,
        hackathonEvents,
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [currentDate, entries, temporaryDrafts, hackathons]);

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

  const handleDateClick = (day: CalendarDay) => {
    if (onDateClick) {
      onDateClick(day.date);
    }
  };

  return (
    <div className={`calendar-container ${className}`}>
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
        
        <button
          onClick={goToToday}
          className="today-button"
        >
          Today
        </button>
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
            onClick={() => handleDateClick(day)}
            title={
              day.hasEntries || day.hasHackathonEvents
                ? `${day.hasEntries ? `${day.entriesCount} ${day.entriesCount === 1 ? 'entry' : 'entries'}` : ''}${day.hasEntries && day.hasHackathonEvents ? ', ' : ''}${day.hasHackathonEvents ? day.hackathonEvents.map(e => `${e.title} (${e.type})`).join(', ') : ''} - ${day.date.toLocaleDateString()}`
                : day.date.toLocaleDateString()
            }
          >
            <div className="day-number">
              {day.date.getDate()}
            </div>
            
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
          <div className="legend-dot hackathon-start"></div>
          <span>Hackathon starts</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot hackathon-deadline" style={{ backgroundColor: '#f59e0b' }}></div>
          <span>Submission deadline</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot hackathon-end" style={{ backgroundColor: '#ef4444' }}></div>
          <span>Hackathon ends</span>
        </div>
      </div>
    </div>
  );
};

export default Calendar; 