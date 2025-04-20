import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Habit, ProgressEvent } from '../types';
import HabitForm from '../components/HabitForm';
import { PencilSquareIcon, TrashIcon, PlusIcon, XMarkIcon, CheckIcon, FireIcon, TrophyIcon, ChartBarIcon } from '@heroicons/react/24/outline';

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDateString = () => {
  return new Date().toISOString().split('T')[0];
};

// --- NEW: Helper function to calculate streak (logic to be added) ---
const calculateCurrentStreak = (progressEvents: ProgressEvent[]): number => {
  if (!progressEvents || progressEvents.length === 0) {
    return 0;
  }

  // Ensure events are sorted descending by date (YYYY-MM-DD string comparison works)
  // Although the query orders them, sorting here ensures correctness if the query changes.
  const sortedEvents = [...progressEvents].sort((a, b) => b.event_date.localeCompare(a.event_date));

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let expectedDate = new Date(today); // Start checking from today

  // Check if the most recent event is today or yesterday
  const mostRecentEventDate = new Date(sortedEvents[0].event_date + 'T00:00:00Z'); // Add time/TZ for correct date obj
  mostRecentEventDate.setUTCHours(0,0,0,0); // Ensure comparison is date-only (UTC)

  const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const yesterdayUTC = new Date(todayUTC);
  yesterdayUTC.setUTCDate(todayUTC.getUTCDate() - 1);

  // If the most recent event wasn't today or yesterday, the current streak is 0
  if (mostRecentEventDate.getTime() !== todayUTC.getTime() && mostRecentEventDate.getTime() !== yesterdayUTC.getTime()) {
      return 0;
  }
  
  // If the most recent event was today, start expecting yesterday
  if (mostRecentEventDate.getTime() === todayUTC.getTime()) {
      streak = 1;
      expectedDate = new Date(yesterdayUTC);
  } else { 
      // Most recent was yesterday
      streak = 1;
      expectedDate = new Date(yesterdayUTC);
      expectedDate.setUTCDate(expectedDate.getUTCDate() - 1); // Expect the day before yesterday
  }

  // Iterate through the rest of the events (starting from the second event if the first was today, or first if it was yesterday)
  const startIndex = (mostRecentEventDate.getTime() === todayUTC.getTime()) ? 1 : 0;

  for (let i = startIndex; i < sortedEvents.length; i++) {
    const eventDate = new Date(sortedEvents[i].event_date + 'T00:00:00Z');
    eventDate.setUTCHours(0, 0, 0, 0);
    
    const expectedDateUTC = new Date(Date.UTC(expectedDate.getFullYear(), expectedDate.getMonth(), expectedDate.getDate()));

    if (eventDate.getTime() === expectedDateUTC.getTime()) {
      streak++;
      // Set expected date to the day before
      expectedDate.setUTCDate(expectedDate.getUTCDate() - 1);
    } else {
      // Streak broken
      break;
    }
  }

  return streak;
};
// -------------------------------------------------------------------

// --- NEW: Helper function to calculate longest streak (logic to be added) ---
const calculateLongestStreak = (progressEvents: ProgressEvent[]): number => {
  if (!progressEvents || progressEvents.length < 1) {
    return 0;
  }

  // Sort events by date ascending (YYYY-MM-DD string comparison works)
  const sortedEvents = [...progressEvents].sort((a, b) => a.event_date.localeCompare(b.event_date));

  let longestStreak = 0;
  let currentStreak = 0;
  let previousEventDate: Date | null = null;

  // Helper to compare dates by day, ignoring time/timezone
  const isSameDay = (date1: Date, date2: Date): boolean => {
      return date1.getUTCFullYear() === date2.getUTCFullYear() &&
             date1.getUTCMonth() === date2.getUTCMonth() &&
             date1.getUTCDate() === date2.getUTCDate();
  };

  const isConsecutiveDay = (currentDate: Date, previousDate: Date): boolean => {
      const nextDay = new Date(previousDate);
      nextDay.setUTCDate(previousDate.getUTCDate() + 1);
      return isSameDay(currentDate, nextDay);
  };

  for (let i = 0; i < sortedEvents.length; i++) {
    // Use UTC to avoid timezone issues when creating Date objects from YYYY-MM-DD
    const currentEventDate = new Date(sortedEvents[i].event_date + 'T00:00:00Z');
    currentEventDate.setUTCHours(0, 0, 0, 0);

    if (previousEventDate) {
      // If the current event is the same day as the previous, skip (don't break streak)
      if (isSameDay(currentEventDate, previousEventDate)) {
          continue;
      }
      // Check if it's the consecutive day
      if (isConsecutiveDay(currentEventDate, previousEventDate)) {
        currentStreak++;
      } else {
        // Streak broken, update longest if current was longer
        longestStreak = Math.max(longestStreak, currentStreak);
        // Start new streak
        currentStreak = 1;
      }
    } else {
      // First event always starts a streak of 1
      currentStreak = 1;
    }

    // Update longest streak at the end of each step (or potentially just when streak breaks / at the end)
    longestStreak = Math.max(longestStreak, currentStreak);
    previousEventDate = currentEventDate; // Store current date for the next iteration
  }

  // Final check after the loop completes
  longestStreak = Math.max(longestStreak, currentStreak);

  return longestStreak;
};
// ------------------------------------------------------------------------

const HabitsPage: React.FC = () => {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  // Store ALL progress events grouped by habit_id
  const [allProgress, setAllProgress] = useState<Map<string, ProgressEvent[]>>(new Map());
  // Store calculated streaks by habit_id
  const [habitStreaks, setHabitStreaks] = useState<Map<string, number>>(new Map());
  // Add state for new analytics
  const [longestStreaks, setLongestStreaks] = useState<Map<string, number>>(new Map());
  const [totalCompletions, setTotalCompletions] = useState<Map<string, number>>(new Map());
  // Keep track of today's completion for the button state
  const [todaysProgressMap, setTodaysProgressMap] = useState<Map<string, boolean>>(new Map());
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  // --- Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setError("User not logged in.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const todayStr = getTodayDateString();

        // Fetch habits and ALL progress events concurrently
        const [habitsResponse, progressResponse] = await Promise.all([
          supabase
            .from('habits')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true }), 
          supabase // <-- Fetch ALL progress events for habits, ordered by date
            .from('progress_events')
            .select('*')
            .eq('user_id', user.id)
            .filter('habit_id', 'not.is', null)
            .order('event_date', { ascending: false }) // Order descending for easier streak calc
        ]);

        if (habitsResponse.error) throw habitsResponse.error;
        if (progressResponse.error) throw progressResponse.error;

        const fetchedHabits = habitsResponse.data || [];
        setHabits(fetchedHabits);
        
        const allFetchedProgress = progressResponse.data || [];
        
        // Process progress events: Group by habit_id and calculate analytics
        const progressMap = new Map<string, ProgressEvent[]>();
        const todayMap = new Map<string, boolean>();
        const streaksMap = new Map<string, number>();
        const longestStreaksMap = new Map<string, number>(); // <-- For longest streaks
        const totalCompletionsMap = new Map<string, number>(); // <-- For total completions

        allFetchedProgress.forEach(event => {
            if (event.habit_id) {
                // Group events by habit
                const eventsForHabit = progressMap.get(event.habit_id) || [];
                eventsForHabit.push(event); // Add event (already sorted desc by query)
                progressMap.set(event.habit_id, eventsForHabit);

                // Check if completed today
                if (event.event_date === todayStr) {
                    todayMap.set(event.habit_id, true);
                }
            }
        });

        // Calculate analytics for each habit
        fetchedHabits.forEach(habit => {
            const habitProgress = progressMap.get(habit.id) || [];
            // Current Streak
            const currentStreak = calculateCurrentStreak(habitProgress);
            streaksMap.set(habit.id, currentStreak);
            // Longest Streak
            const longestStreak = calculateLongestStreak(habitProgress); // <-- Calculate longest
            longestStreaksMap.set(habit.id, longestStreak);
            // Total Completions
            const total = habitProgress.length; // <-- Calculate total
            totalCompletionsMap.set(habit.id, total);
        });

        setAllProgress(progressMap); // Store all grouped progress
        setTodaysProgressMap(todayMap); // Store today's completion status
        setHabitStreaks(streaksMap); // Store calculated streaks
        setLongestStreaks(longestStreaksMap); // <-- Store longest streaks
        setTotalCompletions(totalCompletionsMap); // <-- Store total completions

      } catch (err: any) {
        console.error("Error fetching habits data:", err);
        setError(err.message || "Failed to fetch habits data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]); // Re-run if user changes

  // --- CRUD Handlers (handleSaveHabit, handleDeleteHabit) ---
  // Note: These might need to update the progress/streak maps upon creation/deletion
  const handleSaveHabit = (savedHabit: Habit) => {
    if (editingHabit) {
      setHabits(habits.map(h => h.id === savedHabit.id ? savedHabit : h));
      setEditingHabit(null);
    } else {
      // Add new habit, ensure it has entries in maps (even if 0/empty)
      setHabits([...habits, savedHabit]); 
      setAllProgress(prev => new Map(prev).set(savedHabit.id, []));
      setHabitStreaks(prev => new Map(prev).set(savedHabit.id, 0));
      setLongestStreaks(prev => new Map(prev).set(savedHabit.id, 0)); // Initialize new analytics
      setTotalCompletions(prev => new Map(prev).set(savedHabit.id, 0)); // Initialize new analytics
      setTodaysProgressMap(prev => new Map(prev).set(savedHabit.id, false));
      setShowCreateForm(false);
    }
    console.log(editingHabit ? "Habit updated:" : "Habit created:", savedHabit.id); // Log success
  };

  const handleDeleteHabit = async (habitId: string) => {
    if (!window.confirm('Are you sure you want to delete this habit and all its progress?')) return;
    try {
      const { error: deleteError } = await supabase.from('habits').delete().eq('id', habitId);
      if (deleteError) throw deleteError;
      
      // Remove from all relevant states
      setHabits(habits.filter(h => h.id !== habitId));
      setAllProgress(prev => { const map = new Map(prev); map.delete(habitId); return map; });
      setHabitStreaks(prev => { const map = new Map(prev); map.delete(habitId); return map; });
      setLongestStreaks(prev => { const map = new Map(prev); map.delete(habitId); return map; }); // Remove from new maps
      setTotalCompletions(prev => { const map = new Map(prev); map.delete(habitId); return map; }); // Remove from new maps
      setTodaysProgressMap(prev => { const map = new Map(prev); map.delete(habitId); return map; });
      console.log("Habit deleted:", habitId); // Log success

    } catch (err: any) {
      console.error("Error deleting habit:", err);
      setError(err.message || "Failed to delete habit.");
    }
  };

  // --- Habit Tracking Handler ---
  // Needs significant update to handle full progress list and re-calculate streak
  const handleTrackHabit = async (habitId: string, wasCompletedToday: boolean) => {
    if (!user) return;
    const todayStr = getTodayDateString();

    try {
        let updatedProgressForHabit: ProgressEvent[] = [];

        if (wasCompletedToday) {
            // --- Delete today's progress event ---
            const eventToDelete = (allProgress.get(habitId) || []).find(e => e.event_date === todayStr);
            if (!eventToDelete) {
                console.warn("Tried to un-track habit, but today's event not found locally.");
                return; // Avoid unnecessary DB call if local state is inconsistent
            }

            const { error: deleteError } = await supabase
                .from('progress_events')
                .delete()
                .eq('id', eventToDelete.id);
            
            if (deleteError) throw deleteError;

            // Update local state: remove the event
            updatedProgressForHabit = (allProgress.get(habitId) || []).filter(e => e.id !== eventToDelete.id);
            setAllProgress(prev => new Map(prev).set(habitId, updatedProgressForHabit));
            setTodaysProgressMap(prev => new Map(prev).set(habitId, false));
            console.log("Habit un-tracked (today):", habitId); // Log success

        } else {
            // --- Create a new progress event for today ---
            const newEventData = { user_id: user.id, habit_id: habitId, event_date: todayStr };
            const { data, error: insertError } = await supabase
                .from('progress_events')
                .insert(newEventData)
                .select()
                .single();

            if (insertError) throw insertError;

            if (data) {
                // Update local state: add the new event (maintaining sort order - add to front)
                const newProgressEvent = data as ProgressEvent;
                updatedProgressForHabit = [newProgressEvent, ...(allProgress.get(habitId) || [])];
                setAllProgress(prev => new Map(prev).set(habitId, updatedProgressForHabit));
                setTodaysProgressMap(prev => new Map(prev).set(habitId, true));
                console.log("Habit tracked (today):", habitId); // Log success
            }
        }
        
        // --- Re-calculate and update ALL analytics for this habit ---
        const newCurrentStreak = calculateCurrentStreak(updatedProgressForHabit);
        const newLongestStreak = calculateLongestStreak(updatedProgressForHabit);
        const newTotalCompletions = updatedProgressForHabit.length;

        setHabitStreaks(prev => new Map(prev).set(habitId, newCurrentStreak));
        setLongestStreaks(prev => new Map(prev).set(habitId, newLongestStreak));
        setTotalCompletions(prev => new Map(prev).set(habitId, newTotalCompletions));

        // Log un-tracking success here if needed
        if (wasCompletedToday) {
             console.log("Habit un-tracked (today):", habitId); // Log success
        }

    } catch (err: any) {
        console.error("Error tracking habit:", err);
        setError("Failed to update habit tracking."); // Show user-friendly error
        // Optional: Revert optimistic UI updates on error?
    }
  };

  // --- Misc Handlers & State ---
  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingHabit(null);
  };
  const isFormVisible = showCreateForm || !!editingHabit;

  // --- Rendering ---
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         {/* Themed title */}
         <h1 className="text-3xl font-bold text-neutral-darker dark:text-neutral-lighter">My Habits</h1>
         {/* Themed button */}
         <button 
            onClick={() => { 
              if (editingHabit) handleCancel();
              else setShowCreateForm(!showCreateForm);
            }}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-darker ${ 
              isFormVisible 
                ? 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-600 dark:text-neutral-100 dark:hover:bg-neutral-500 focus:ring-neutral-400' 
                : 'bg-primary text-white hover:bg-primary-dark focus:ring-primary' 
            }`}
         >
            {isFormVisible ? (
               <><XMarkIcon className="-ml-1 mr-2 h-5 w-5" />Cancel</>
            ) : (
               <><PlusIcon className="-ml-1 mr-2 h-5 w-5" />New Habit</>
            )}
         </button>
      </div>

      {isFormVisible && (
        <HabitForm 
            key={editingHabit?.id || 'create'}
            initialData={editingHabit} 
            onSave={handleSaveHabit} 
            onCancel={handleCancel} 
        />
      )}

      {/* Themed Loading/Error */}
      {loading && <p className="text-neutral dark:text-neutral-light">Loading habits...</p>}
      {error && <p className="text-danger dark:text-danger-light">Error: {error}</p>}
      
      {/* Habit List */}
      {!loading && !error && (
        <div className="space-y-3">
          {habits.length === 0 && !isFormVisible ? (
             // Themed empty state
            <p className="text-neutral dark:text-neutral-light text-center py-4">You haven't created any habits yet. Click '+ New Habit' to start!</p>
          ) : (
            habits.map((habit) => {
                const isCompletedToday = todaysProgressMap.get(habit.id) || false;
                const currentStreak = habitStreaks.get(habit.id) || 0;
                const longestStreak = longestStreaks.get(habit.id) || 0; // <-- Get longest streak
                const totalCount = totalCompletions.get(habit.id) || 0; // <-- Get total completions
                return ( 
                    habit.id === editingHabit?.id ? null : (
                        // Themed card styling
                        <div key={habit.id} className={`p-4 bg-white dark:bg-neutral-dark rounded-lg shadow border border-neutral-light dark:border-neutral-dark flex items-center justify-between ${isCompletedToday ? 'opacity-70' : ''}`}>
                        <div className="flex items-center flex-grow mr-4">
                            {/* Habit completion button - Themed */}
                            <button
                                onClick={() => handleTrackHabit(habit.id, isCompletedToday)}
                                className={`mr-4 p-2 border rounded-full h-8 w-8 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-dark transition-colors duration-150 ${ 
                                    isCompletedToday 
                                    ? 'bg-secondary border-secondary-dark hover:bg-secondary-dark focus:ring-secondary text-white' 
                                    : 'bg-neutral-lighter dark:bg-neutral-darker border-neutral-light dark:border-neutral-dark hover:bg-neutral-light dark:hover:bg-neutral-dark focus:ring-primary text-neutral dark:text-neutral-light'
                                }`}
                                title={isCompletedToday ? 'Mark as not done today' : 'Mark as done today'}
                            >
                                {isCompletedToday && <CheckIcon className="h-5 w-5" />}
                            </button>
                            {/* Habit details - Themed */}
                            <div className="flex-grow">
                                <div className="flex flex-wrap items-center gap-x-2 mb-1"> {/* Use flex-wrap and gap */} 
                                    <h2 className={`text-lg font-semibold text-neutral-darker dark:text-white ${isCompletedToday ? 'line-through text-neutral dark:text-neutral-light' : ''}`}>{habit.name}</h2>
                                    {/* Display Current Streak */}
                                    {currentStreak > 0 && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" title={`Current Streak: ${currentStreak} days`}>
                                            <FireIcon className="h-3.5 w-3.5 mr-1 text-amber-500" />
                                            {currentStreak}
                                        </span>
                                    )}
                                    {/* Display Longest Streak */} 
                                    {longestStreak > 0 && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" title={`Longest Streak: ${longestStreak} days`}>
                                            <TrophyIcon className="h-3.5 w-3.5 mr-1 text-blue-500" />
                                            {longestStreak}
                                        </span>
                                    )}
                                    {/* Display Total Completions */} 
                                    {totalCount > 0 && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200" title={`Total Completions: ${totalCount}`}>
                                            <ChartBarIcon className="h-3.5 w-3.5 mr-1 text-gray-500 dark:text-gray-400" />
                                            {totalCount}
                                        </span>
                                    )}
                                </div>
                                {habit.description && <p className="text-sm text-neutral dark:text-neutral-light">{habit.description}</p>}
                                <p className="text-xs text-neutral dark:text-neutral-light mt-1">Frequency: {habit.frequency}</p>
                                {/* TODO: Display linked Goal title if available */} 
                            </div>
                        </div>
                        {/* Action Buttons - Themed */} 
                        <div className="flex-shrink-0 space-x-2 flex items-center">
                            <button 
                                onClick={() => setEditingHabit(habit)} 
                                title="Edit Habit"
                                className="text-primary dark:text-primary-light hover:text-primary-dark dark:hover:text-primary inline-flex items-center"
                            >
                                <PencilSquareIcon className="h-5 w-5" />
                            </button>
                            <button 
                                onClick={() => handleDeleteHabit(habit.id)} 
                                title="Delete Habit"
                                className="text-danger dark:text-danger-light hover:text-danger-dark dark:hover:text-danger inline-flex items-center"
                            >
                                <TrashIcon className="h-5 w-5" />
                            </button>
                        </div>
                        </div>
                    )
                )
            })
          )}
        </div>
      )}
    </div>
  );
};

export default HabitsPage; 