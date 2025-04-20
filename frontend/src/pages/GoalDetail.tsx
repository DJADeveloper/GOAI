import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Goal, Task } from '../types'; // Assuming Goal and Task types are defined
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

// Utility function to format date strings
// Handles potential null/undefined values and ensures valid date input
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    // Attempt to create a date object
    const date = new Date(dateString);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      // Handle invalid date strings, maybe return original or a placeholder
      return 'Invalid Date';
    }
    // Format valid date, adjust options as needed
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch (error) {
    console.error("Error formatting date:", error);
    return 'Error'; // Return an error indicator
  }
};

const GoalDetailPage: React.FC = () => {
  const { id: goalId } = useParams<{ id: string }>(); // Get goal ID from URL params
  const { user } = useAuth();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]); // <-- Add state for tasks
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGoalAndTasks = async () => { // <-- Rename function for clarity
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

        // Fetch Goal Details
        const { data: goalData, error: goalError } = await supabase
          .from('goals')
          .select('*')
          .eq('id', goalId)
          .eq('user_id', user.id) // Ensure user owns the goal (RLS also enforces this)
          .single(); // Expect only one goal

        if (goalError) {
          if (goalError.code === 'PGRST116') { // PostgREST code for no rows found
             throw new Error('Goal not found or you do not have permission to view it.');
          } else {
             throw goalError;
          }
        }

        if (goalData) {
          setGoal(goalData);
        } else {
          throw new Error('Goal not found.');
        }

        // Fetch Associated Tasks <-- Add task fetching logic
        const { data: tasksData, error: tasksError } = await supabase
            .from('tasks')
            .select('*') // Select all task fields
            .eq('user_id', user.id) // Ensure user owns the tasks
            .eq('goal_id', goalId); // Filter by the current goal's ID

        if (tasksError) {
           console.error("Error fetching associated tasks:", tasksError);
           // Don't block the page if tasks fail, just log and maybe show a message later
           // throw tasksError; // Optionally re-throw if tasks are critical
        } else {
           setTasks(tasksData || []); // Set tasks, default to empty array if null
        }


      } catch (err: any) {
        console.error("Error fetching goal details or tasks:", err);
        setError(err.message || "Failed to fetch goal details or associated tasks.");
      } finally {
        setLoading(false);
      }
    };

    fetchGoalAndTasks(); // <-- Call the updated function
  }, [goalId, user]); // Re-fetch if goalId or user changes

  if (loading) return <div className="flex justify-center items-center h-screen"><p className="text-neutral dark:text-neutral-light">Loading goal details...</p></div>;
  if (error) return <div className="flex justify-center items-center h-screen text-red-500"><p>Error: {error}</p></div>;
  if (!goal) return <div className="flex justify-center items-center h-screen"><p className="text-neutral dark:text-neutral-light">Goal not found.</p></div>; // Should be handled by error state, but good fallback

  return (
    <div className="container mx-auto p-4 max-w-4xl bg-white dark:bg-neutral-darker shadow rounded-lg">
      {/* Back Button */}
      <Link to="/goals" className="inline-flex items-center text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary mb-4">
        <ArrowLeftIcon className="h-5 w-5 mr-1" />
        Back to Goals
      </Link>

      {/* Goal Title and Status */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-neutral-darkest dark:text-white">{goal.title}</h1>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${goal.status === 'in_progress'
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : goal.status === 'completed'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                : 'bg-neutral-lightest text-neutral-dark dark:bg-neutral-dark dark:text-neutral-lighter' // Default/other status
            }`}
        >
          {goal.status ? goal.status.charAt(0).toUpperCase() + goal.status.slice(1) : 'Unknown'}
        </span>
      </div>

      {/* Goal Details */}
      <div className="card">
        <h2>Goal Details</h2>
        {/* Display formatted dates */}
        <p><strong>Status:</strong> <span className={`status status-${goal.status}`}>{goal.status}</span></p>
        {/* Use created_at for start date and due_date for target date */}
        <p><strong>Start Date:</strong> {formatDate(goal.created_at)}</p>
        <p><strong>Target Date:</strong> {formatDate(goal.due_date)}</p>
        <p><strong>Description:</strong> {goal.description || 'No description provided.'}</p>

        {/* Link to edit goal, conditionally rendered */}
        {/* Update status check from 'active' to 'in_progress' */}
        {goal.status === 'in_progress' && (
          <Link to={`/goals/edit/${goalId}`} className="button">Edit Goal</Link>
        )}
      </div>

      {/* Section for associated Tasks */}
      <div className="border-t border-neutral-light dark:border-neutral-dark pt-6 mt-6">
        <h2 className="text-xl font-semibold mb-4 text-neutral-darker dark:text-white">Associated Tasks</h2>
        {tasks.length > 0 ? (
          <ul className="space-y-3">
            {tasks.map((task) => (
              <li key={task.id} className="p-3 bg-neutral-lightest dark:bg-neutral-dark rounded-md shadow-sm flex justify-between items-center">
                <div>
                   <Link to={`/tasks/edit/${task.id}`} className="font-medium text-primary hover:underline dark:text-primary-light">
                     {task.title}
                   </Link>
                   <p className="text-sm text-neutral dark:text-neutral-light">{task.description || "No description"}</p>
                </div>
                <span
                   className={`px-2 py-0.5 rounded text-xs font-medium ${task.completed
                       ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                       : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' // To-Do or other
                    }`}
                 >
                   {task.completed ? 'Completed' : 'Pending'}
                 </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-neutral dark:text-neutral-light">No tasks are currently linked to this goal.</p>
        )}
      </div>

    </div>
  );
};

export default GoalDetailPage; 