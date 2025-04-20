import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Goal, Task, Milestone } from '../types'; // Assuming Goal and Task types are defined
import MilestoneForm from '../components/MilestoneForm';
import { ArrowLeftIcon, PlusIcon, PencilSquareIcon, TrashIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

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
  const [milestones, setMilestones] = useState<Milestone[]>([]); // <-- Add state for milestones
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for Milestone Form
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);

  useEffect(() => {
    const fetchGoalDetails = async () => { // <-- Renamed function
      if (!user || !goalId) {
        setError(user ? 'Goal ID not provided.' : 'User not logged in.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch Goal, Tasks, and Milestones concurrently
        const [goalRes, tasksRes, milestonesRes] = await Promise.all([
          supabase
            .from('goals')
            .select('*')
            .eq('id', goalId)
            .eq('user_id', user.id)
            .single(),
          supabase
            .from('tasks')
            .select('*')
            .eq('user_id', user.id)
            .eq('goal_id', goalId),
          supabase // <-- Fetch Milestones
            .from('milestones')
            .select('*')
            .eq('user_id', user.id)
            .eq('goal_id', goalId)
            .order('created_at', { ascending: true }) // Order milestones if desired
        ]);

        // Process Goal
        if (goalRes.error) {
          if (goalRes.error.code === 'PGRST116') throw new Error('Goal not found or permission denied.');
          throw goalRes.error;
        }
        setGoal(goalRes.data);

        // Process Tasks
        if (tasksRes.error) {
          console.error("Error fetching associated tasks:", tasksRes.error);
          // Handle task error gracefully (e.g., show message but continue)
        } else {
          setTasks(tasksRes.data || []);
        }

        // Process Milestones <-- Add milestone processing
        if (milestonesRes.error) {
          console.error("Error fetching associated milestones:", milestonesRes.error);
          // Handle milestone error gracefully
        } else {
          setMilestones(milestonesRes.data || []);
        }

      } catch (err: any) {
        console.error("Error fetching goal details:", err);
        setError(err.message || "Failed to fetch goal details.");
      } finally {
        setLoading(false);
      }
    };

    fetchGoalDetails();
  }, [goalId, user]);

  // --- Milestone CRUD Handlers ---

  const handleSaveMilestone = (savedMilestone: Milestone) => {
    if (editingMilestone) {
      // Update existing milestone in state
      setMilestones(milestones.map(m => m.id === savedMilestone.id ? savedMilestone : m));
    } else {
      // Add new milestone to state
      setMilestones([...milestones, savedMilestone]);
    }
    handleCancelMilestoneForm(); // Close form after save
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!window.confirm('Are you sure you want to delete this milestone?')) return;

    try {
      const { error } = await supabase
        .from('milestones')
        .delete()
        .eq('id', milestoneId);

      if (error) throw error;

      // Remove milestone from state
      setMilestones(milestones.filter(m => m.id !== milestoneId));

    } catch (err: any) {
      console.error("Error deleting milestone:", err);
      setError(err.message || "Failed to delete milestone.");
    }
  };

  const handleToggleMilestoneComplete = async (milestone: Milestone) => {
    try {
      const updates = { completed: !milestone.completed, updated_at: new Date().toISOString() };
      const { data, error } = await supabase
        .from('milestones')
        .update(updates)
        .eq('id', milestone.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        // Update the milestone in the local state
        setMilestones(milestones.map(m => m.id === data.id ? data : m));
      }
    } catch (err: any) {
      console.error("Error toggling milestone completion:", err);
      setError(err.message || "Failed to update milestone status.");
    }
  };

  const handleCancelMilestoneForm = () => {
    setShowMilestoneForm(false);
    setEditingMilestone(null);
  };

  // Determine if the milestone form should be visible
  const isMilestoneFormVisible = showMilestoneForm || !!editingMilestone;

  // --- Loading/Error/NotFound States ---
  if (loading) return <div className="flex justify-center items-center h-screen"><p className="text-neutral dark:text-neutral-light">Loading goal details...</p></div>;
  if (error) return <div className="flex justify-center items-center h-screen text-red-500"><p>Error: {error}</p></div>;
  if (!goal) return <div className="flex justify-center items-center h-screen"><p className="text-neutral dark:text-neutral-light">Goal not found.</p></div>;

  // --- Render Component ---
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
      <div className="p-4 mb-6 bg-white dark:bg-neutral-dark rounded-lg shadow border border-neutral-light dark:border-neutral-dark">
        <h2 className="text-xl font-semibold mb-3 text-neutral-darker dark:text-white">Goal Details</h2>
        <div className="space-y-1 text-sm text-neutral-dark dark:text-neutral-light">
            <p><strong>Status:</strong> <span className="font-medium capitalize">{goal.status.replace('_', ' ')}</span></p>
            <p><strong>Start Date:</strong> {formatDate(goal.created_at)}</p>
            <p><strong>Target Date:</strong> {formatDate(goal.due_date)}</p>
            <p><strong>Description:</strong> {goal.description || 'No description provided.'}</p>
        </div>
        {/* TODO: Add Edit Goal Button linking to Goals page edit form? */}
      </div>

      {/* Section for associated Tasks */}
      <div className="border-t border-neutral-light dark:border-neutral-dark pt-6 mt-6">
        <h2 className="text-xl font-semibold mb-4 text-neutral-darker dark:text-white">Associated Tasks</h2>
        {tasks.length > 0 ? (
          <ul className="space-y-3">
            {tasks.map((task) => (
              <li key={task.id} className="p-3 bg-neutral-lightest dark:bg-neutral-dark rounded-md shadow-sm flex justify-between items-center">
                <div>
                   {/* TODO: Link to task detail page if one exists, or edit modal? */}
                   <span className="font-medium text-primary dark:text-primary-light">{task.title}</span>
                   {task.description && <p className="text-sm text-neutral dark:text-neutral-light">{task.description}</p>}
                </div>
                <span
                   className={`px-2 py-0.5 rounded text-xs font-medium ${task.completed
                       ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                       : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
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
        {/* TODO: Button to add a new task linked to this goal? */}
      </div>

      {/* --- NEW: Section for Milestones --- */}
      <div className="border-t border-neutral-light dark:border-neutral-dark pt-6 mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-neutral-darker dark:text-white">Milestones</h2>
          <button 
            onClick={() => {
               if (isMilestoneFormVisible) {
                  handleCancelMilestoneForm();
               } else {
                  setShowMilestoneForm(true);
                  setEditingMilestone(null); // Ensure not in edit mode
               }
            }}
            className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-darker ${ 
              isMilestoneFormVisible 
                ? 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-600 dark:text-neutral-100 dark:hover:bg-neutral-500 focus:ring-neutral-400' 
                : 'bg-primary text-white hover:bg-primary-dark focus:ring-primary' 
            }`}
          >
            {isMilestoneFormVisible ? (
               <><XMarkIcon className="-ml-0.5 mr-1.5 h-4 w-4" />Cancel</>
            ) : (
               <><PlusIcon className="-ml-0.5 mr-1.5 h-4 w-4" />Add Milestone</>
            )}
          </button>
        </div>

        {/* Milestone Form (conditionally rendered) */}
        {isMilestoneFormVisible && goalId && (
           <MilestoneForm 
              key={editingMilestone?.id || 'create-milestone'}
              initialData={editingMilestone}
              goalId={goalId} // Pass the current goal ID
              onSave={handleSaveMilestone}
              onCancel={handleCancelMilestoneForm}
           />
        )}

        {/* Milestone List */}
        {milestones.length > 0 ? (
          <ul className="space-y-3">
            {milestones.map((milestone) => (
               // Don't render the milestone being edited in the list itself
               milestone.id === editingMilestone?.id ? null : (
                  <li key={milestone.id} className={`p-3 bg-neutral-lightest dark:bg-neutral-dark rounded-md shadow-sm flex items-start justify-between ${milestone.completed ? 'opacity-60' : ''}`}>
                     {/* Left side: Checkbox and Details */}
                     <div className="flex items-start flex-grow mr-3">
                        {/* Toggle Completion Button */}
                        <button
                           onClick={() => handleToggleMilestoneComplete(milestone)}
                           className={`mr-3 mt-1 flex-shrink-0 p-1 border rounded-full h-6 w-6 flex items-center justify-center focus:outline-none focus:ring-1 focus:ring-offset-1 dark:focus:ring-offset-neutral-dark transition-colors duration-150 ${ 
                              milestone.completed 
                                 ? 'bg-secondary border-secondary-dark hover:bg-secondary-dark focus:ring-secondary text-white' 
                                 : 'bg-white dark:bg-neutral-darker border-neutral-light dark:border-neutral-dark hover:bg-neutral-lighter dark:hover:bg-neutral-dark focus:ring-primary text-neutral dark:text-neutral-light'
                           }`}
                           title={milestone.completed ? 'Mark as incomplete' : 'Mark as complete'}
                        >
                           {milestone.completed && <CheckIcon className="h-4 w-4" />}
                        </button>
                        {/* Milestone Info */}
                        <div className="flex-grow">
                           <span className={`font-medium text-neutral-darker dark:text-white ${milestone.completed ? 'line-through' : ''}`}>{milestone.title}</span>
                           {milestone.description && <p className={`text-sm text-neutral dark:text-neutral-light mt-0.5 ${milestone.completed ? 'line-through' : ''}`}>{milestone.description}</p>}
                           {milestone.due_date && <p className={`text-xs text-neutral dark:text-neutral-light mt-1 ${milestone.completed ? 'line-through' : ''}`}>Due: {formatDate(milestone.due_date)}</p>}
                        </div>
                     </div>
                     {/* Right side: Action Buttons */}
                     <div className="flex-shrink-0 space-x-2 flex items-center mt-1">
                        <button 
                           onClick={() => setEditingMilestone(milestone)} 
                           title="Edit Milestone"
                           className="text-primary dark:text-primary-light hover:text-primary-dark dark:hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center p-0.5"
                           disabled={milestone.completed} 
                        >
                           <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button 
                           onClick={() => handleDeleteMilestone(milestone.id)} 
                           title="Delete Milestone"
                           className="text-danger dark:text-danger-light hover:text-danger-dark dark:hover:text-danger inline-flex items-center p-0.5"
                        >
                           <TrashIcon className="h-4 w-4" />
                        </button>
                     </div>
                  </li>
               )
            ))}
          </ul>
        ) : (
          !isMilestoneFormVisible && <p className="text-neutral dark:text-neutral-light text-center py-3">No milestones added yet for this goal.</p>
        )}
      </div>

    </div>
  );
};

export default GoalDetailPage; 