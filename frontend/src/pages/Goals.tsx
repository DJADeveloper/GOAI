import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Goal } from '../types';
import GoalForm from '../components/GoalForm'; // Import the new form component
import { Link } from 'react-router-dom';
import { PencilSquareIcon, TrashIcon, EyeIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

const GoalsPage: React.FC = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null); // Track which goal is being edited

  // Fetch goals on load
  useEffect(() => {
    const fetchGoals = async () => {
      if (!user) {
        setLoading(false);
        setError("User not logged in."); // Changed error message slightly
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (fetchError) throw fetchError;
        if (data) setGoals(data);
      } catch (err: any) {
        console.error("Error fetching goals:", err);
        setError(err.message || "Failed to fetch goals.");
      } finally {
        setLoading(false);
      }
    };
    fetchGoals();
  }, [user]);

  // Handle saving (Create or Update)
  const handleSaveGoal = (savedGoal: Goal) => {
    if (editingGoal) {
      // Update existing goal in state
      setGoals(goals.map(g => g.id === savedGoal.id ? savedGoal : g));
      setEditingGoal(null); // Exit editing mode
    } else {
      // Add new goal to state
      setGoals([savedGoal, ...goals]);
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

  // Determine if the form (either create or edit) should be shown
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
      
      {/* Goal List */}
      {!loading && !error && (
        <div className="space-y-4">
          {goals.length === 0 && !isFormVisible ? (
            // Themed empty state
            <p className="text-neutral dark:text-neutral-light text-center py-4">You haven't created any goals yet. Click '+ New Goal' to start!</p>
          ) : (
            goals.map((goal) => (
              // Don't render the goal being edited in the list
              goal.id === editingGoal?.id ? null : (
                // Themed card styling
                <div key={goal.id} className="p-4 bg-white dark:bg-neutral-dark rounded-lg shadow border border-neutral-light dark:border-neutral-dark">
                  <h2 className="text-xl font-semibold mb-2 text-neutral-darker dark:text-white">{goal.title}</h2>
                  {goal.description && <p className="text-neutral dark:text-neutral-light mb-3 whitespace-pre-wrap">{goal.description}</p>}
                  <div className="flex justify-between items-center text-sm text-neutral dark:text-neutral-light border-t border-neutral-light dark:border-neutral-dark pt-3">
                      <div className="flex items-center space-x-4"> {/* Group status and due date */}
                        <span>Status: <span className="font-medium capitalize">{goal.status.replace('_', ' ')}</span></span>
                        {goal.due_date && <span className="ml-4">Due: {new Date(goal.due_date).toLocaleDateString()}</span>}
                      </div>
                      <div className="space-x-3 flex items-center"> {/* Group buttons */}
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