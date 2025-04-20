import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { FlagIcon, ClipboardIcon, CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/outline'; // Icons for cards

const AnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for analytics data
  const [activeGoalCount, setActiveGoalCount] = useState(0);
  const [pendingTaskCount, setPendingTaskCount] = useState(0);
  const [completedTaskCount, setCompletedTaskCount] = useState(0);
  const [totalHabitCount, setTotalHabitCount] = useState(0);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      if (!user) {
        setError("User not logged in.");
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);

      try {
        // Fetch counts concurrently
        const [goalsRes, pendingTasksRes, completedTasksRes, habitsRes] = await Promise.all([
          supabase
            .from('goals')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .in('status', ['pending', 'in_progress']), // Active goals
          supabase
            .from('tasks')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('completed', false), // Pending tasks
          supabase
            .from('tasks')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('completed', true), // Completed tasks
          supabase
            .from('habits')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id), // Total habits
        ]);

        // Check for errors in responses
        if (goalsRes.error) throw goalsRes.error;
        if (pendingTasksRes.error) throw pendingTasksRes.error;
        if (completedTasksRes.error) throw completedTasksRes.error;
        if (habitsRes.error) throw habitsRes.error;

        // Update state with counts
        setActiveGoalCount(goalsRes.count ?? 0);
        setPendingTaskCount(pendingTasksRes.count ?? 0);
        setCompletedTaskCount(completedTasksRes.count ?? 0);
        setTotalHabitCount(habitsRes.count ?? 0);

      } catch (err: any) {
        console.error("Error fetching analytics data:", err);
        setError(err.message || "Failed to load analytics data.");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [user]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-neutral-darker dark:text-neutral-lighter">Analytics Overview</h1>

      {loading && <p className="text-neutral dark:text-neutral-light">Loading analytics...</p>}
      {error && <p className="text-danger dark:text-danger-light">Error: {error}</p>}

      {!loading && !error && (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Active Goals Card */}
          <div className="p-6 bg-white dark:bg-neutral-dark rounded-lg shadow-md border border-neutral-light dark:border-neutral-dark flex items-center space-x-4">
              <FlagIcon className="h-10 w-10 text-primary" />
              <div>
                  <h2 className="text-lg font-semibold text-neutral-dark dark:text-neutral-light">Active Goals</h2>
                  <p className="text-3xl font-bold text-neutral-darker dark:text-white">{activeGoalCount}</p>
              </div>
          </div>
          {/* Pending Tasks Card */}
          <div className="p-6 bg-white dark:bg-neutral-dark rounded-lg shadow-md border border-neutral-light dark:border-neutral-dark flex items-center space-x-4">
              <ClipboardIcon className="h-10 w-10 text-accent" />
              <div>
                  <h2 className="text-lg font-semibold text-neutral-dark dark:text-neutral-light">Pending Tasks</h2>
                  <p className="text-3xl font-bold text-neutral-darker dark:text-white">{pendingTaskCount}</p>
              </div>
          </div>
           {/* Completed Tasks Card */}
          <div className="p-6 bg-white dark:bg-neutral-dark rounded-lg shadow-md border border-neutral-light dark:border-neutral-dark flex items-center space-x-4">
              <CheckCircleIcon className="h-10 w-10 text-green-500" />
              <div>
                  <h2 className="text-lg font-semibold text-neutral-dark dark:text-neutral-light">Completed Tasks</h2>
                  <p className="text-3xl font-bold text-neutral-darker dark:text-white">{completedTaskCount}</p>
              </div>
          </div>
          {/* Total Habits Card */}
          <div className="p-6 bg-white dark:bg-neutral-dark rounded-lg shadow-md border border-neutral-light dark:border-neutral-dark flex items-center space-x-4">
              <SparklesIcon className="h-10 w-10 text-secondary" />
              <div>
                  <h2 className="text-lg font-semibold text-neutral-dark dark:text-neutral-light">Total Habits</h2>
                  <p className="text-3xl font-bold text-neutral-darker dark:text-white">{totalHabitCount}</p>
              </div>
          </div>
        </section>
      )}
      
      {/* Placeholder for future charts/detailed analytics */}
      {!loading && !error && (
        <div className="mt-8 p-6 bg-white dark:bg-neutral-dark rounded-lg shadow border border-neutral-light dark:border-neutral-dark text-center">
          <h2 className="text-xl font-semibold mb-4 text-neutral-darker dark:text-white">More Analytics Coming Soon!</h2>
          <p className="text-neutral dark:text-neutral-light">Charts and detailed progress tracking will be added here.</p>
        </div>
      )}

    </div>
  );
};

export default AnalyticsPage; 