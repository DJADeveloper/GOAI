import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Event, ToolbarProps, View } from 'react-big-calendar';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import { enUS } from 'date-fns/locale/en-US';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Task, Milestone } from '../types';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Setup the localizer by providing the necessary functions
const locales = {
  'en-US': enUS,
};
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Define the structure for calendar events
interface CalendarEvent extends Event {
  id: string;
  type: 'task' | 'milestone';
  description?: string | null;
  // Add any other relevant details you want to access
}

// --- Custom Toolbar Component ---
const CustomToolbar: React.FC<ToolbarProps<CalendarEvent>> = ({ label, localizer: { messages }, onNavigate, onView, view, views }) => {

  const navigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
    onNavigate(action);
  };

  const changeView = (newView: View) => {
    onView(newView);
  };

  // Basic button styling - adjust as needed
  const buttonClasses = "px-3 py-1 border border-neutral-light dark:border-neutral-dark rounded text-neutral-dark dark:text-neutral-lighter hover:bg-neutral-lighter dark:hover:bg-neutral-dark focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-primary-light transition-colors duration-150";
  const activeButtonClasses = "bg-primary text-white dark:bg-primary-dark dark:text-primary-text border-primary dark:border-primary-dark hover:bg-primary-dark dark:hover:bg-primary-darker";

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between mb-4 px-1 py-2 border-b border-neutral-light dark:border-neutral-dark">
      {/* Left Navigation (Today, Prev, Next) */}
      <div className="flex items-center space-x-1 mb-2 sm:mb-0">
        <button type="button" onClick={() => navigate('TODAY')} className={`${buttonClasses}`}>
          {messages?.today}
        </button>
        <button 
           type="button" 
           onClick={() => navigate('PREV')} 
           className={`${buttonClasses} p-1`} 
           aria-label={typeof messages?.previous === 'string' ? messages.previous : 'Previous'}
        >
           <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <button 
           type="button" 
           onClick={() => navigate('NEXT')} 
           className={`${buttonClasses} p-1`} 
           aria-label={typeof messages?.next === 'string' ? messages.next : 'Next'}
        >
           <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Center Label (Month/Year) */}
      <div className="text-lg font-semibold text-neutral-darker dark:text-white mb-2 sm:mb-0">
        {label}
      </div>

      {/* Right View Selection */}
      <div className="flex items-center space-x-1">
        {(views as View[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => changeView(v)}
            className={`${buttonClasses} ${view === v ? activeButtonClasses : ''}`}
          >
            {messages?.[v] || v} {/* Use localized message if available */}
          </button>
        ))}
      </div>
    </div>
  );
};
// -------------------------------

const CalendarPage: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCalendarData = async () => {
      if (!user) {
        setError("User not logged in.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);

      try {
        // Fetch Tasks and Milestones with due dates
        const [tasksRes, milestonesRes] = await Promise.all([
          supabase
            .from('tasks')
            .select('id, title, description, due_date')
            .eq('user_id', user.id)
            .not('due_date', 'is', null),
          supabase
            .from('milestones')
            .select('id, title, description, due_date, goal_id') // Fetch goal_id to potentially link back
            .eq('user_id', user.id)
            .not('due_date', 'is', null),
          // Add other data sources with dates here (e.g., Goals with due_dates)
        ]);

        if (tasksRes.error) throw tasksRes.error;
        if (milestonesRes.error) throw milestonesRes.error;

        const fetchedTasks = (tasksRes.data as Task[]) || [];
        const fetchedMilestones = (milestonesRes.data as Milestone[]) || [];

        const calendarEvents: CalendarEvent[] = [];

        // Map Tasks to CalendarEvents
        fetchedTasks.forEach(task => {
            if (task.due_date) { // Double-check due_date exists
                try {
                   const dueDate = new Date(task.due_date);
                   calendarEvents.push({
                      id: task.id,
                      title: `Task: ${task.title}`,
                      start: dueDate,
                      end: dueDate, // Treat due date as the event date/time
                      allDay: false, // Or determine based on whether time is 00:00:00?
                      type: 'task',
                      description: task.description,
                   });
                } catch (e) {
                    console.error(`Error parsing task due date (${task.id}):`, task.due_date, e);
                }
            }
        });

        // Map Milestones to CalendarEvents
        fetchedMilestones.forEach(milestone => {
            if (milestone.due_date) { // Double-check due_date exists
                 try {
                    // Milestones often represent a target date rather than a timed event
                    // Use UTC date parsing to avoid timezone shifting the date itself
                    const dateParts = milestone.due_date.split('-'); // YYYY-MM-DD
                    const dueDate = new Date(Date.UTC(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2])));

                    calendarEvents.push({
                        id: milestone.id,
                        title: `Milestone: ${milestone.title}`,
                        start: dueDate,
                        end: dueDate,
                        allDay: true, // Milestones are typically all-day events
                        type: 'milestone',
                        description: milestone.description,
                    });
                 } catch (e) {
                    console.error(`Error parsing milestone due date (${milestone.id}):`, milestone.due_date, e);
                 }
            }
        });

        setEvents(calendarEvents);

      } catch (err: any) {
        console.error("Error fetching calendar data:", err);
        setError(err.message || "Failed to load calendar data.");
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarData();
  }, [user]);

  // TODO: Add custom event rendering or onClick handlers later

  return (
    // Apply dark mode background to the main container
    <div className="h-[calc(100vh-8rem)] bg-white dark:bg-neutral-darker p-4 rounded-lg shadow"> 
      <h1 className="text-3xl font-bold mb-6 text-neutral-darker dark:text-neutral-lighter">Calendar View</h1>
      
      {loading && <p className="text-neutral dark:text-neutral-light">Loading calendar...</p>}
      {error && <p className="text-danger dark:text-danger-light">Error: {error}</p>}

      {!loading && !error && (
        // Add a wrapper for basic dark mode styling for the calendar itself
        <div className="bg-white dark:bg-neutral-dark p-4 rounded shadow border border-neutral-light dark:border-neutral-dark">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 'calc(100vh - 14rem)' }} // Increased subtracted value for more bottom padding
            className="text-neutral-darker dark:text-neutral-lighter" // Apply base text colors
            components={{ toolbar: CustomToolbar }} // <-- Use the custom toolbar
            // TODO: Add eventPropGetter for custom styling based on type/status
            // onSelectEvent={handleSelectEvent} // Add handler to navigate or show details
          />
        </div>
      )}
    </div>
  );
};

export default CalendarPage; 