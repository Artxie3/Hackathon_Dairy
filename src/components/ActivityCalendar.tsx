import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface DayActivity {
  date: string;
  commitCount: number;
  level: number; // 0-4 for activity level
}

interface ActivityCalendarProps {
  className?: string;
}

const ActivityCalendar: React.FC<ActivityCalendarProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const [activityData, setActivityData] = useState<DayActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivityData = async () => {
      if (!user?.username) return;

      try {
        setIsLoading(true);
        const token = localStorage.getItem('github_token');
        if (!token) {
          throw new Error('GitHub token not found');
        }

        // Get events from the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const eventsResponse = await fetch(
          `https://api.github.com/users/${user.username}/events?per_page=100`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );

        if (!eventsResponse.ok) {
          throw new Error('Failed to fetch GitHub events');
        }

        const events = await eventsResponse.json();
        
        // Process events into daily activity
        const dailyCommits: { [key: string]: number } = {};
        
        events.forEach((event: any) => {
          if (event.type === 'PushEvent') {
            const date = new Date(event.created_at).toISOString().split('T')[0];
            const commitCount = event.payload.commits?.length || 0;
            dailyCommits[date] = (dailyCommits[date] || 0) + commitCount;
          }
        });

        // Generate activity data for the last 30 days
        const activity: DayActivity[] = [];
        const today = new Date();
        
        for (let i = 0; i < 30; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          const commitCount = dailyCommits[dateStr] || 0;
          
          // Calculate activity level (0-4)
          let level = 0;
          if (commitCount > 0) {
            if (commitCount <= 2) level = 1;
            else if (commitCount <= 5) level = 2;
            else if (commitCount <= 10) level = 3;
            else level = 4;
          }

          activity.unshift({
            date: dateStr,
            commitCount,
            level
          });
        }

        setActivityData(activity);
        setError(null);
      } catch (err) {
        console.error('Error fetching activity data:', err);
        setError('Failed to load activity data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivityData();
  }, [user?.username]);

  const getActivityColor = (level: number): string => {
    switch (level) {
      case 1: return 'bg-indigo-900/40';
      case 2: return 'bg-indigo-700/60';
      case 3: return 'bg-indigo-500/80';
      case 4: return 'bg-indigo-400';
      default: return 'bg-gray-700/50';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-7 gap-1 ${className}`}>
      {activityData.map((day, index) => (
        <div
          key={day.date}
          className={`${getActivityColor(day.level)} rounded-lg cursor-pointer transition-colors duration-200 hover:ring-2 hover:ring-indigo-400/50`}
          style={{ aspectRatio: '1' }}
          title={`${day.date}: ${day.commitCount} commits`}
        />
      ))}
    </div>
  );
};

export default ActivityCalendar; 