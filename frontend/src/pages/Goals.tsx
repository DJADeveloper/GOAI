import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Goal, Milestone } from '../types';
import GoalForm from '../components/GoalForm';
import { Link } from 'react-router-dom';
import { PencilSquareIcon, TrashIcon, EyeIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

// --- Add interface for Goal with Progress ---
interface GoalWithProgress extends Goal {
  progressPercent: number;
}
// ------------------------------------------

// --- Add simpler type for Milestone data needed for progress ---
interface MilestoneProgressInfo {
  id: string;
  goal_id: string | null; // goal_id can be null in the type, though we filter
  completed: boolean;
}
// -----------------------------------------------------------

const GoalsPage: React.FC = () => {
  const { user } = useAuth();
  // Use the extended type for state
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalWithProgress | null>(null); // Also use extended type here

  // Fetch goals AND milestones on load
  useEffect(() => {
    const fetchGoalsAndMilestones = async () => {
      if (!user) {
        setLoading(false);
        setError("User not logged in.");
        return;
      }
      try {
        setLoading(true);
        setError(null);

        // Fetch goals and milestones concurrently
        const [goalsRes, milestonesRes] = await Promise.all([
          supabase
            .from('goals')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          supabase 
            .from('milestones')
            .select('id, goal_id, completed') // Fetch only necessary fields
            .eq('user_id', user.id)
        ]);

        if (goalsRes.error) throw goalsRes.error;
        if (milestonesRes.error) throw milestonesRes.error; 

        const fetchedGoals = goalsRes.data || [];
        // Use the simpler type for fetched milestone data
        const fetchedMilestones: MilestoneProgressInfo[] = (milestonesRes.data || []) as MilestoneProgressInfo[]; 

        // Group milestones by goal_id - Use the simpler type for the map value
        const milestonesByGoal = new Map<string, MilestoneProgressInfo[]>();
        fetchedMilestones.forEach(m => {
            if(m.goal_id) { // Ensure goal_id is not null before using it as key
                const list = milestonesByGoal.get(m.goal_id) || [];
                list.push(m); // Push the MilestoneProgressInfo object
                milestonesByGoal.set(m.goal_id, list);
            }
        });

        // Calculate progress for each goal
        const goalsWithProgress: GoalWithProgress[] = fetchedGoals.map(goal => {
            const goalMilestones = milestonesByGoal.get(goal.id) || [];
            const totalMilestones = goalMilestones.length;
            const completedMilestones = goalMilestones.filter(m => m.completed).length;
            const progressPercent = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
            return { ...goal, progressPercent }; 
        });

        setGoals(goalsWithProgress); // Set state with calculated progress

      } catch (err: any) {
        console.error("Error fetching goals/milestones:", err);
        setError(err.message || "Failed to fetch data.");
      } finally {
        setLoading(false);
      }
    };
    fetchGoalsAndMilestones();
  }, [user]);

  // Handle saving (Create or Update)
  const handleSaveGoal = (savedGoal: Goal) => {
    // When saving, newly created goals won't have progress calculated yet
    // We could refetch, or just initialize progress to 0
    const goalWithProgress: GoalWithProgress = { ...savedGoal, progressPercent: editingGoal?.progressPercent ?? 0 };

    if (editingGoal) {
      // Update existing goal in state
      setGoals(goals.map(g => g.id === goalWithProgress.id ? goalWithProgress : g));
      setEditingGoal(null); // Exit editing mode
    } else {
      // Add new goal to state
      setGoals([goalWithProgress, ...goals]);
      setShowCreateForm(false); // Hide create form
    }
  };

  // Handle deleting a goal
  const handleDeleteGoal = async (goalId: string) => {
    if (!window.confirm('Are you sure you want to delete this goal?')) {
      return;
    }
    try {
      const { error: deleteError } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId);

      if (deleteError) {
        throw deleteError;
      }

      // Remove goal from state
      setGoals(goals.filter(g => g.id !== goalId));

    } catch (err: any) {
      console.error("Error deleting goal:", err);
      setError(err.message || "Failed to delete goal."); // Show error to user
    }
  };

  // Cancel editing or creating
  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingGoal(null);
  };

  // Determine if the form should be shown
  const isFormVisible = showCreateForm || !!editingGoal;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         {/* Apply dark text color */}
         <h1 className="text-3xl font-bold text-neutral-darker dark:text-neutral-lighter">My Goals</h1>
         <button 
            // Toggle create form visibility, cancel edit if active
            onClick={() => { 
              if (editingGoal) {
                handleCancel();
              } else {
                setShowCreateForm(!showCreateForm);
              }
            }}
            // Themed button styles
            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-darker ${ 
              isFormVisible 
                ? 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-600 dark:text-neutral-100 dark:hover:bg-neutral-500 focus:ring-neutral-400' 
                : 'bg-primary text-white hover:bg-primary-dark focus:ring-primary' 
            }`}
         >
            {isFormVisible ? (
               <><XMarkIcon className="-ml-1 mr-2 h-5 w-5" />Cancel</>
            ) : (
               <><PlusIcon className="-ml-1 mr-2 h-5 w-5" />New Goal</>
            )}
         </button>
      </div>

      {/* Conditionally render the create/edit form */}
      {isFormVisible && (
        <GoalForm 
            key={editingGoal?.id || 'create'} // Force re-render when switching between create/edit
            initialData={editingGoal} 
            onSave={handleSaveGoal} 
            onCancel={handleCancel} 
        />
      )}

      {/* Loading and Error states */}
      {loading && <p className="text-neutral dark:text-neutral-light">Loading goals...</p>}
      {error && <p className="text-danger dark:text-danger-light">Error: {error}</p>}
      
      {/* Goal List - Update rendering */}
      {!loading && !error && (
        <div className="space-y-4">
          {goals.length === 0 && !isFormVisible ? (
            <p className="text-neutral dark:text-neutral-light text-center py-4">You haven't created any goals yet. Click '+ New Goal' to start!</p>
          ) : (
            goals.map((goal) => (
              goal.id === editingGoal?.id ? null : (
                <div key={goal.id} className="p-4 bg-white dark:bg-neutral-dark rounded-lg shadow border border-neutral-light dark:border-neutral-dark">
                  {/* Goal Title */}
                  <h2 className="text-xl font-semibold mb-2 text-neutral-darker dark:text-white">{goal.title}</h2>
                  
                  {/* --- Progress Bar --- */}
                  <div className="mb-3">
                     <div className="flex justify-between text-xs text-neutral dark:text-neutral-light mb-1">
                        <span>Progress</span>
                        <span>{goal.progressPercent}%</span>
                     </div>
                     <div className="w-full bg-neutral-light dark:bg-neutral-darker rounded-full h-2">
                        <div 
                           className="bg-primary h-2 rounded-full transition-all duration-500 ease-out" 
                           style={{ width: `${goal.progressPercent}%` }}
                        ></div>
                     </div>
                  </div>
                  {/* ------------------ */}

                  {/* Optional Description */}
                  {goal.description && <p className="text-neutral dark:text-neutral-light mb-3 whitespace-pre-wrap">{goal.description}</p>}
                  
                  {/* Footer with Status, Due Date, Actions */}
                  <div className="flex justify-between items-center text-sm text-neutral dark:text-neutral-light border-t border-neutral-light dark:border-neutral-dark pt-3">
                      <div className="flex items-center space-x-4">
                        <span>Status: <span className="font-medium capitalize">{goal.status.replace('_', ' ')}</span></span>
                        {goal.due_date && <span className="ml-4">Due: {new Date(goal.due_date).toLocaleDateString()}</span>}
                      </div>
                      <div className="space-x-3 flex items-center">
                          <Link 
                             to={`/goals/${goal.id}`}
                             title="View Details"
                             className="text-secondary dark:text-secondary-light hover:text-secondary-dark dark:hover:text-secondary inline-flex items-center"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </Link>
                          <button 
                             onClick={() => setEditingGoal(goal)} // Set goal to edit
                             title="Edit Goal"
                             className="text-primary dark:text-primary-light hover:text-primary-dark dark:hover:text-primary inline-flex items-center"
                          >
                              <PencilSquareIcon className="h-5 w-5" />
                          </button>
                          <button 
                             onClick={() => handleDeleteGoal(goal.id)} 
                             title="Delete Goal"
                             className="text-danger dark:text-danger-light hover:text-danger-dark dark:hover:text-danger inline-flex items-center"
                          >
                              <TrashIcon className="h-5 w-5" />
                          </button>
                      </div>
                  </div>
                </div>
              )
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default GoalsPage; 