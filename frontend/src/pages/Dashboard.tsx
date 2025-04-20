import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Task, Habit, ProgressEvent, Goal } from '../types';
import { Link } from 'react-router-dom';
import { FlagIcon, ClipboardIcon, SparklesIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline'; // Corrected import: ClipboardIcon

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDateString = () => {
  return new Date().toISOString().split('T')[0];
};

// Helper function to check if a task is due today or overdue
const isTaskDueTodayOrOverdue = (task: Task): boolean => {
    if (!task.due_date) return false;
    const dueDate = new Date(task.due_date);
    const today = new Date();
    // Set time to 00:00:00 for comparison to avoid time zone issues affecting the date part
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return dueDate <= today;
};

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for dashboard data
  const [activeGoalCount, setActiveGoalCount] = useState(0);
  const [pendingTaskCount, setPendingTaskCount] = useState(0);
  const [tasksDueToday, setTasksDueToday] = useState<Task[]>([]);
  const [allHabits, setAllHabits] = useState<Habit[]>([]);
  const [completedHabitsToday, setCompletedHabitsToday] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setError("User not logged in.");
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      const today = getTodayDateString();

      try {
        // Fetch data concurrently
        const [goalsRes, tasksRes, habitsRes, progressRes] = await Promise.all([
          supabase
            .from('goals')
            .select('id', { count: 'exact', head: true }) // Only count active goals
            .eq('user_id', user.id)
            .in('status', ['pending', 'in_progress']),
          supabase
            .from('tasks')
            .select('*') // Fetch all fields for filtering due dates
            .eq('user_id', user.id)
            .eq('completed', false), // Only pending tasks
          supabase
            .from('habits')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true }),
          supabase
            .from('progress_events')
            .select('habit_id') // Only need habit_id
            .eq('user_id', user.id)
            .eq('event_date', today)
            .filter('habit_id', 'not.is', null), // Ensure habit_id is not null
        ]);

        // Process Goals Response
        if (goalsRes.error) throw goalsRes.error;
        setActiveGoalCount(goalsRes.count ?? 0);

        // Process Tasks Response
        if (tasksRes.error) throw tasksRes.error;
        const pendingTasks = (tasksRes.data as Task[]) || [];
        setPendingTaskCount(pendingTasks.length);
        // Filter tasks due today or overdue
        setTasksDueToday(pendingTasks.filter(isTaskDueTodayOrOverdue));

        // Process Habits Response
        if (habitsRes.error) throw habitsRes.error;
        setAllHabits((habitsRes.data as Habit[]) || []);

        // Process Progress Events Response
        if (progressRes.error) throw progressRes.error;
        const completedIds = new Set<string>();
        progressRes.data?.forEach(event => {
          if (event.habit_id) {
            completedIds.add(event.habit_id);
          }
        });
        setCompletedHabitsToday(completedIds);

      } catch (err: any) {
        console.error("Error fetching dashboard data:", err);
        setError(err.message || "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return null;
  }

  if (error) {
    return <p className="text-danger">Error: {error}</p>;
  }

  // Filter habits that need to be done today (not already completed)
  const habitsToDoToday = allHabits.filter(habit => !completedHabitsToday.has(habit.id));

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-neutral-darker dark:text-neutral-lighter">Dashboard</h1>

      {/* Summary Section - Themed Styling with Dark Mode */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card Base Styles: bg-white dark:bg-neutral-dark border border-neutral-light dark:border-neutral-dark */}
        {/* Active Goals Card */}
        <div className="p-6 bg-white dark:bg-neutral-dark rounded-lg shadow-md border border-neutral-light dark:border-neutral-dark flex items-center space-x-4">
            <FlagIcon className="h-10 w-10 text-primary" />
            <div>
                <h2 className="text-lg font-semibold text-neutral-dark dark:text-neutral-light">Active Goals</h2>
                <p className="text-3xl font-bold text-neutral-darker dark:text-white">{activeGoalCount}</p>
                <Link to="/goals" className="text-sm text-primary hover:text-primary-dark dark:hover:text-primary-light hover:underline mt-1">View Goals &rarr;</Link>
            </div>
        </div>
        {/* Pending Tasks Card */}
        <div className="p-6 bg-white dark:bg-neutral-dark rounded-lg shadow-md border border-neutral-light dark:border-neutral-dark flex items-center space-x-4">
            <ClipboardIcon className="h-10 w-10 text-accent" />
            <div>
                <h2 className="text-lg font-semibold text-neutral-dark dark:text-neutral-light">Pending Tasks</h2>
                <p className="text-3xl font-bold text-neutral-darker dark:text-white">{pendingTaskCount}</p>
                <Link to="/tasks" className="text-sm text-accent hover:text-accent-dark dark:hover:text-accent-light hover:underline mt-1">View Tasks &rarr;</Link>
            </div>
        </div>
        {/* Habits Today Card */}
        <div className="p-6 bg-white dark:bg-neutral-dark rounded-lg shadow-md border border-neutral-light dark:border-neutral-dark flex items-center space-x-4">
            <SparklesIcon className="h-10 w-10 text-secondary" />
            <div>
                <h2 className="text-lg font-semibold text-neutral-dark dark:text-neutral-light">Habits Remaining Today</h2>
                <p className="text-3xl font-bold text-neutral-darker dark:text-white">{habitsToDoToday.length}<span className="text-xl font-normal text-neutral dark:text-neutral-light"> / {allHabits.length}</span></p>
                <Link to="/habits" className="text-sm text-secondary hover:text-secondary-dark dark:hover:text-secondary-light hover:underline mt-1">View Habits &rarr;</Link>
            </div>
        </div>
      </section>

      {/* Today's Focus Section - Themed Styling with Dark Mode */}
      <section>
        <h2 className="text-2xl font-semibold text-neutral-darker dark:text-neutral-lighter mb-5 border-b border-neutral-light dark:border-neutral-dark pb-2">Today's Focus</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tasks Due Column */}
            <div className="space-y-4">
                <h3 className="text-xl font-semibold text-neutral-dark dark:text-neutral-light flex items-center">
                    <ClockIcon className="h-6 w-6 mr-2 text-danger" /> 
                    Tasks Due
                </h3>
                {tasksDueToday.length > 0 ? (
                    <ul className="space-y-3">
                        {tasksDueToday.map(task => (
                        <li key={task.id} className="p-4 bg-white dark:bg-neutral-dark rounded-lg shadow border border-neutral-light dark:border-neutral-dark hover:shadow-md transition-shadow duration-200">
                            <div className="flex justify-between items-start">
                                <div>
                                    <Link to={`/tasks#task-${task.id}`} className="text-primary hover:text-primary-dark dark:hover:text-primary-light font-medium block mb-1">{task.title}</Link>
                                    {task.description && <p className="text-sm text-neutral dark:text-neutral-light mb-1">{task.description}</p>}
                                    {task.due_date && <p className="text-xs text-danger dark:text-danger-light font-medium">Due: {new Date(task.due_date).toLocaleString()}</p>}
                                </div>
                                {/* Add action buttons later if needed */}
                            </div>
                        </li> 
                        ))}
                    </ul>
                ) : (
                    <div className="p-4 bg-neutral-lighter dark:bg-neutral-dark rounded-lg border border-neutral-light dark:border-neutral-dark text-center text-neutral dark:text-neutral-light">
                        No tasks due today or overdue!
                    </div>
                )}
            </div>

            {/* Habits Column */}
            <div className="space-y-4">
                <h3 className="text-xl font-semibold text-neutral-dark dark:text-neutral-light flex items-center">
                   <CheckCircleIcon className="h-6 w-6 mr-2 text-secondary" /> 
                   Habits to Complete
                </h3>
                {habitsToDoToday.length > 0 ? (
                    <ul className="space-y-3">
                        {habitsToDoToday.map(habit => (
                            <li key={habit.id} className="p-4 bg-white dark:bg-neutral-dark rounded-lg shadow border border-neutral-light dark:border-neutral-dark hover:shadow-md transition-shadow duration-200">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <Link to={`/habits#habit-${habit.id}`} className="text-primary hover:text-primary-dark dark:hover:text-primary-light font-medium block mb-1">{habit.name}</Link>
                                        {habit.description && <p className="text-sm text-neutral dark:text-neutral-light">{habit.description}</p>}
                                    </div>
                                    {/* Add action buttons later if needed */}
                                </div>
                            </li> 
                        ))}
                    </ul>
                ) : (
                    <div className="p-4 bg-secondary-text dark:bg-neutral-dark rounded-lg border border-secondary-light dark:border-neutral-dark text-center text-secondary-dark dark:text-secondary-light">
                        All habits completed for today! Great job!
                    </div>
                )}
            </div>
        </div>
      </section>

      {/* TODO: Add Quick Add buttons? Brain Dump input? */}

    </div>
  );
};

export default DashboardPage; 