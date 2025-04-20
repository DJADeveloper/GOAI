import React, { useEffect, useState } from 'react';
import { ProgressEvent } from '../types';
import { progressEventsService } from '../services/progressEvents';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import { CheckCircle, Circle, Clock, Target, ListTodo, Activity } from 'lucide-react';

interface ProgressTimelineProps {
  limit?: number;
  className?: string;
}

export const ProgressTimeline: React.FC<ProgressTimelineProps> = ({ limit, className = '' }) => {
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchEvents = async () => {
      if (!user) return;
      
      try {
        const fetchedEvents = await progressEventsService.getProgressEvents(user.id);
        setEvents(limit ? fetchedEvents.slice(0, limit) : fetchedEvents);
      } catch (err) {
        setError('Failed to load progress events');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [user, limit]);

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'goal':
        return <Target className="w-5 h-5" />;
      case 'task':
        return <ListTodo className="w-5 h-5" />;
      case 'habit':
        return <Activity className="w-5 h-5" />;
      default:
        return <Circle className="w-5 h-5" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'done':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return <div className="flex justify-center p-4">Loading timeline...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  if (events.length === 0) {
    return <div className="text-gray-500 p-4">No progress events to display</div>;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {events.map((event, index) => (
        <div key={event.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="rounded-full p-2 bg-gray-100 dark:bg-gray-800">
              {getEventIcon(event.event_type)}
            </div>
            {index !== events.length - 1 && (
              <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-700 my-2" />
            )}
          </div>
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{event.event_name}</h3>
                <div className="flex items-center gap-2">
                  {getStatusIcon(event.status)}
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date(event.created_at), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
              {event.notes && (
                <p className="text-sm text-gray-600 dark:text-gray-300">{event.notes}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}; 