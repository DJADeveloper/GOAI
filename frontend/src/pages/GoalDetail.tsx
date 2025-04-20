import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Goal } from '../types'; // Assuming Goal type is defined
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const GoalDetailPage: React.FC = () => {
  const { id: goalId } = useParams<{ id: string }>(); // Get goal ID from URL params
  const { user } = useAuth();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGoalDetails = async () => {
      // Ensure user and goalId are available
      if (!user) {
        setError('User not logged in.');
        setLoading(false);
        return;
      }
      if (!goalId) {
         setError('Goal ID not provided.');
         setLoading(false);
         return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('goals')
          .select('*')
          .eq('id', goalId)
          .eq('user_id', user.id) // Ensure user owns the goal (RLS also enforces this)
          .single(); // Expect only one goal

        if (fetchError) {
          if (fetchError.code === 'PGRST116') { // PostgREST code for no rows found
             throw new Error('Goal not found or you do not have permission to view it.');
          } else {
             throw fetchError;
          }
        }

        if (data) {
          setGoal(data);
        } else {
          // Should be caught by PGRST116, but as a fallback
          throw new Error('Goal not found.');
        }

      } catch (err: any) {
        console.error("Error fetching goal details:", err);
        setError(err.message || "Failed to fetch goal details.");
      } finally {
        setLoading(false);
      }
    };

    fetchGoalDetails();
  }, [goalId, user]); // Re-fetch if goalId or user changes

  if (loading) {
    // Loading state handled by App.tsx
    return null; 
  }

  if (error) {
    return (
        // Themed error message
        <div className="text-danger dark:text-danger-light">
           <p>Error: {error}</p>
           {/* Themed link */}
           <Link to="/goals" className="text-primary hover:underline mt-2 inline-block">&larr; Back to Goals</Link>
        </div>
      );
  }

  if (!goal) {
    // Should not happen if loading and error states are handled, but good practice
    return <p className="text-neutral dark:text-neutral-light">Goal not found.</p>;
  }

  return (
    // Themed container
    <div className="p-6 bg-white dark:bg-neutral-dark rounded-lg shadow border border-neutral-light dark:border-neutral-dark">
      {/* Themed Back link */}
      <Link to="/goals" className="inline-flex items-center text-primary hover:text-primary-dark dark:hover:text-primary-light mb-4">
         <ArrowLeftIcon className="h-4 w-4 mr-1" /> 
         Back to Goals
      </Link>
      
      {/* Themed title */}
      <h1 className="text-3xl font-bold mb-4 text-neutral-darker dark:text-white">{goal.title}</h1>
      
      {/* Themed details section */}
      <div className="mb-6 space-y-1 text-neutral dark:text-neutral-light">
         <p><strong className="text-neutral-dark dark:text-neutral-light">Status:</strong> <span className="capitalize">{goal.status.replace('_', ' ')}</span></p>
         {goal.due_date && <p><strong className="text-neutral-dark dark:text-neutral-light">Due Date:</strong> {new Date(goal.due_date).toLocaleDateString()}</p>}
         <p><strong className="text-neutral-dark dark:text-neutral-light">Created:</strong> {new Date(goal.created_at).toLocaleString()}</p>
         <p><strong className="text-neutral-dark dark:text-neutral-light">Last Updated:</strong> {new Date(goal.updated_at).toLocaleString()}</p>
      </div>

      {goal.description && (
         <div className="mb-6 border-t border-neutral-light dark:border-neutral-dark pt-6">
            {/* Themed heading */}
            <h2 className="text-xl font-semibold mb-2 text-neutral-darker dark:text-white">Description</h2>
            {/* Themed description text */}
            <p className="text-neutral dark:text-neutral-light whitespace-pre-wrap">{goal.description}</p>
         </div>
      )}

      {/* TODO: Section for Milestones */}
      <div className="border-t border-neutral-light dark:border-neutral-dark pt-6">
        <h2 className="text-xl font-semibold mb-2 text-neutral-darker dark:text-white">Milestones</h2>
        <p className="text-neutral dark:text-neutral-light">Milestone functionality coming soon...</p>
      </div>
      
      {/* TODO: Section for associated Tasks */}
      <div className="border-t border-neutral-light dark:border-neutral-dark pt-6 mt-6">
        <h2 className="text-xl font-semibold mb-2 text-neutral-darker dark:text-white">Associated Tasks</h2>
         <p className="text-neutral dark:text-neutral-light">Task linking coming soon...</p>
      </div>

    </div>
  );
};

export default GoalDetailPage; 