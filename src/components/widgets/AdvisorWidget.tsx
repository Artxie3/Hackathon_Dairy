import React, { useState, useEffect } from 'react';
import { X, MessageSquareText, Clock, Calendar, Coffee } from 'lucide-react';
import './AdvisorWidget.css';

type AdviceType = 'break' | 'deadline' | 'achievement' | 'tip';

interface Advice {
  id: string;
  type: AdviceType;
  message: string;
  actionLabel?: string;
  action?: () => void;
}

const AdvisorWidget: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const [currentAdvice, setCurrentAdvice] = useState<Advice | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);

  // Simulated advice - in a real app, this would come from analyzing user behavior
  const possibleAdvice: Advice[] = [
    {
      id: 'break-1',
      type: 'break',
      message: "You've been coding for 2 hours straight. Time for a short break?",
      actionLabel: "Set a timer",
      action: () => console.log("Timer set for break")
    },
    {
      id: 'deadline-1',
      type: 'deadline',
      message: "Hackathon submission due in 48 hours. Stay on track!",
      actionLabel: "View timeline",
      action: () => console.log("Opening timeline")
    },
    {
      id: 'achievement-1',
      type: 'achievement',
      message: "Great job! You've made 5 commits today - your most productive day this week.",
      actionLabel: "View stats",
      action: () => console.log("Opening statistics")
    },
    {
      id: 'tip-1',
      type: 'tip',
      message: "Try documenting your emotions alongside technical decisions for better reflection later.",
      actionLabel: "Learn more",
      action: () => console.log("Opening guide")
    }
  ];

  useEffect(() => {
    // Simulate changing advice based on time, user activity, etc.
    const selectRandomAdvice = () => {
      const availableAdvice = possibleAdvice.filter(advice => !dismissed.includes(advice.id));
      if (availableAdvice.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableAdvice.length);
        setCurrentAdvice(availableAdvice[randomIndex]);
      } else {
        setCurrentAdvice(null);
      }
    };

    selectRandomAdvice();
    const interval = setInterval(selectRandomAdvice, 60000); // Change advice every minute

    return () => clearInterval(interval);
  }, [dismissed]);

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  const dismissAdvice = () => {
    if (currentAdvice) {
      setDismissed([...dismissed, currentAdvice.id]);
      setCurrentAdvice(null);
    }
  };

  const getIconForAdviceType = (type: AdviceType) => {
    switch (type) {
      case 'break':
        return <Coffee size={18} />;
      case 'deadline':
        return <Calendar size={18} />;
      case 'achievement':
        return <MessageSquareText size={18} />;
      case 'tip':
        return <Clock size={18} />;
      default:
        return <MessageSquareText size={18} />;
    }
  };

  if (!currentAdvice) return null;

  return (
    <div className={`advisor-widget ${expanded ? 'expanded' : ''}`}>
      <div className="advisor-header">
        <div className="advisor-type">
          {getIconForAdviceType(currentAdvice.type)}
          <span>{currentAdvice.type.charAt(0).toUpperCase() + currentAdvice.type.slice(1)}</span>
        </div>
        <div className="advisor-actions">
          <button className="advisor-btn" onClick={toggleExpanded}>
            {expanded ? 'Minimize' : 'Expand'}
          </button>
          <button className="advisor-btn close" onClick={dismissAdvice}>
            <X size={16} />
          </button>
        </div>
      </div>
      
      <div className="advisor-content">
        <p>{currentAdvice.message}</p>
        
        {currentAdvice.actionLabel && (
          <button 
            className="advisor-action-btn"
            onClick={currentAdvice.action}
          >
            {currentAdvice.actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default AdvisorWidget;