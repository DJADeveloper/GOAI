import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Habit, ProgressEvent } from '../types';
import HabitForm from '../components/HabitForm';
import { PencilSquareIcon, TrashIcon, PlusIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDateString = () => {
  return new Date().toISOString().split('T')[0];
};

const HabitsPage: React.FC = () => {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  // Store today's progress events (map habitId to the event for quick lookup)
  const [todaysProgress, setTodaysProgress] = useState<Map<string, ProgressEvent>>(new Map());
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
        const today = getTodayDateString();

        // Fetch habits and today's progress events concurrently
        const [habitsResponse, progressResponse] = await Promise.all([
          supabase
            .from('habits')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true }), 
          supabase
            .from('progress_events')
            .select('*')
            .eq('user_id', user.id)
            .eq('event_date', today)
            .filter('habit_id', 'not.is', null) // Only fetch for habits
        ]);

        if (habitsResponse.error) throw habitsResponse.error;
        if (progressResponse.error) throw progressResponse.error;

        if (habitsResponse.data) setHabits(habitsResponse.data);
        
        if (progressResponse.data) {
            const progressMap = new Map<string, ProgressEvent>();
            progressResponse.data.forEach(event => {
                if (event.habit_id) { // Ensure habit_id exists
                    progressMap.set(event.habit_id, event);
                }
            });
            setTodaysProgress(progressMap);
        }

      } catch (err: any) {
        console.error("Error fetching habits data:", err);
        setError(err.message || "Failed to fetch habits data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // --- CRUD Handlers ---
  const handleSaveHabit = (savedHabit: Habit) => {
    if (editingHabit) {
      setHabits(habits.map(h => h.id === savedHabit.id ? savedHabit : h));
      setEditingHabit(null);
    } else {
      setHabits([...habits, savedHabit]); // Add to end, or sort if needed
      setShowCreateForm(false);
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    if (!window.confirm('Are you sure you want to delete this habit and all its progress?')) return;
    try {
      // Note: RLS should prevent deleting others' data, but explicit user_id check is safer if needed
      // Deleting the habit will cascade delete progress_events due to DB constraints
      const { error: deleteError } = await supabase.from('habits').delete().eq('id', habitId);
      if (deleteError) throw deleteError;
      setHabits(habits.filter(h => h.id !== habitId));
      // Also remove from today's progress map if present
      setTodaysProgress(prev => {
          const newMap = new Map(prev);
          newMap.delete(habitId);
          return newMap;
      });
    } catch (err: any) {
      console.error("Error deleting habit:", err);
      setError(err.message || "Failed to delete habit.");
    }
  };

  // --- Habit Tracking Handler ---
  const handleTrackHabit = async (habitId: string, wasCompletedToday: boolean) => {
    if (!user) return;
    const today = getTodayDateString();

    try {
        if (wasCompletedToday) {
            // Find the progress event ID to delete
            const eventToDelete = todaysProgress.get(habitId);
            if (!eventToDelete) return; // Should not happen if button state is correct

            const { error: deleteError } = await supabase
                .from('progress_events')
                .delete()
                .eq('id', eventToDelete.id);
            
            if (deleteError) throw deleteError;

            // Update state locally
            setTodaysProgress(prev => {
                const newMap = new Map(prev);
                newMap.delete(habitId);
                return newMap;
            });

        } else {
            // Create a new progress event
            const newEventData = {
                user_id: user.id,
                habit_id: habitId,
                event_date: today,
                // value: 1 // Optionally set a default value
            };
            const { data, error: insertError } = await supabase
                .from('progress_events')
                .insert(newEventData)
                .select()
                .single();

            if (insertError) throw insertError;

            if (data) {
                // Update state locally
                setTodaysProgress(prev => new Map(prev).set(habitId, data as ProgressEvent));
            }
        }
    } catch (err: any) {
        console.error("Error tracking habit:", err);
        // Optionally show error to user
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
                const isCompletedToday = todaysProgress.has(habit.id);
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
                                <h2 className={`text-lg font-semibold text-neutral-darker dark:text-white ${isCompletedToday ? 'line-through text-neutral dark:text-neutral-light' : ''}`}>{habit.name}</h2>
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