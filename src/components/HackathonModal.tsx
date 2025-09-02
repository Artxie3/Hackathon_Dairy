import React from 'react';
import { X, Calendar, Clock, Trophy, ExternalLink } from 'lucide-react';

interface HackathonEvent {
  id: string;
  title: string;
  type: 'start' | 'end' | 'deadline';
  date: string;
  description?: string;
  url?: string;
  platform?: string;
}

interface HackathonModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  hackathons: HackathonEvent[];
}

const HackathonModal: React.FC<HackathonModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  hackathons
}) => {
  if (!isOpen) return null;

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'start':
        return <Trophy size={16} className="text-blue-500" />;
      case 'end':
        return <X size={16} className="text-red-500" />;
      case 'deadline':
        return <Clock size={16} className="text-orange-500" />;
      default:
        return <Calendar size={16} className="text-gray-500" />;
    }
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'start':
        return 'Hackathon Starts';
      case 'end':
        return 'Hackathon Ends';
      case 'deadline':
        return 'Submission Deadline';
      default:
        return 'Hackathon Event';
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'start':
        return 'text-blue-500 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
      case 'end':
        return 'text-red-500 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
      case 'deadline':
        return 'text-orange-500 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'text-gray-500 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden"
        style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-3">
            <Trophy size={24} />
            <div>
              <h2 className="text-xl font-bold">{formatDate(selectedDate)}</h2>
              <p className="text-blue-100 text-sm">Hackathon Events</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {hackathons.length === 0 ? (
            <div className="text-center py-8">
              <Trophy size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No hackathon events for this day.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {hackathons.map((hackathon) => (
                <div key={hackathon.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getEventTypeIcon(hackathon.type)}
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {hackathon.title}
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${getEventTypeColor(hackathon.type)}`}>
                          {getEventTypeLabel(hackathon.type)}
                        </span>
                      </div>
                    </div>
                    {hackathon.url && (
                      <a
                        href={hackathon.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        <ExternalLink size={16} />
                      </a>
                    )}
                  </div>
                  
                  {hackathon.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                      {hackathon.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <Calendar size={12} />
                    <span>{new Date(hackathon.date).toLocaleDateString()}</span>
                    {hackathon.platform && (
                      <>
                        <span>•</span>
                        <span>{hackathon.platform}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HackathonModal;
