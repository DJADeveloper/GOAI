import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Task, Goal } from '../types';
import TaskForm from '../components/TaskForm';
import { Link } from 'react-router-dom';
import { PencilSquareIcon, TrashIcon, PlusIcon, XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

// Modify Task type locally to include optional goal details
interface TaskWithGoal extends Task {
  goals?: Pick<Goal, 'title'> | null; // Select only the title from the Goal
}

const TasksPage: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskWithGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithGoal | null>(null);

  // Fetch tasks on load, including linked goal title
  useEffect(() => {
    const fetchTasks = async () => {
      if (!user) {
        setError("User not logged in.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        // Use Supabase query to fetch tasks and related goal title
        const { data, error: fetchError } = await supabase
          .from('tasks')
          .select('*, goals ( title ) ') // Fetch all task fields and the title from the related goal
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }); 

        if (fetchError) throw fetchError;
        if (data) setTasks(data as TaskWithGoal[]); // Cast data to the extended type

      } catch (err: any) {
        console.error("Error fetching tasks:", err);
        setError(err.message || "Failed to fetch tasks.");
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, [user]);

  // Handle saving (Create or Update from form)
  const handleSaveTask = (savedTask: Task) => {
      // Fetch the goal title if a goal_id was saved/updated
      const goalTitle = savedTask.goal_id 
          ? editingTask?.goals?.title // Try to reuse existing title if editing
          : 'Loading...'; // Or show loading/refetch - simpler for now is not showing immediately
      
      const taskWithGoal = { 
          ...savedTask, 
          goals: savedTask.goal_id ? { title: goalTitle || ''} : null 
      };

    if (editingTask) {
      // Need to refetch or manually add goal title if goal_id changed
      setTasks(tasks.map(t => t.id === savedTask.id ? taskWithGoal : t));
      setEditingTask(null);
    } else {
      setTasks([taskWithGoal, ...tasks]);
      setShowCreateForm(false);
    }
     // Consider refetching the list here if goal_id was added/changed 
     // to ensure the goal title is displayed correctly without manual handling.
  };

  // Handle toggling completion status
  const handleToggleComplete = async (task: TaskWithGoal) => {
    try {
      const updates = { completed: !task.completed, updated_at: new Date().toISOString() };
      // Select the goal title again on update to keep data consistent
      const { data, error: updateError } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', task.id)
        .select('*, goals ( title ) ')
        .single();

      if (updateError) throw updateError;

      if (data) {
        setTasks(tasks.map(t => t.id === data.id ? (data as TaskWithGoal) : t));
      }
    } catch (err: any) {
      console.error("Error toggling task completion:", err);
    }
  };

  // Handle deleting a task
  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      const { error: deleteError } = await supabase.from('tasks').delete().eq('id', taskId);
      if (deleteError) throw deleteError;
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (err: any) {
      console.error("Error deleting task:", err);
      setError(err.message || "Failed to delete task.");
    }
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingTask(null);
  };

  const isFormVisible = showCreateForm || !!editingTask;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         {/* Themed title */}
         <h1 className="text-3xl font-bold text-neutral-darker dark:text-neutral-lighter">My Tasks</h1>
         {/* Themed button */}
         <button 
            onClick={() => { 
              if (editingTask) handleCancel();
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
               <><PlusIcon className="-ml-1 mr-2 h-5 w-5" />New Task</>
            )}
         </button>
      </div>

      {isFormVisible && (
        <TaskForm 
            key={editingTask?.id || 'create'}
            initialData={editingTask} 
            onSave={handleSaveTask} 
            onCancel={handleCancel} 
        />
      )}

      {/* Themed Loading/Error */}
      {loading && <p className="text-neutral dark:text-neutral-light">Loading tasks...</p>}
      {error && <p className="text-danger dark:text-danger-light">Error: {error}</p>}
      
      {/* Task List */}
      {!loading && !error && (
        <div className="space-y-3">
          {tasks.length === 0 && !isFormVisible ? (
            // Themed empty state
            <p className="text-neutral dark:text-neutral-light text-center py-4">You haven't created any tasks yet. Click '+ New Task' to start!</p>
          ) : (
            tasks.map((task) => (
              task.id === editingTask?.id ? null : (
                // Themed list item card
                <div key={task.id} className={`p-4 bg-white dark:bg-neutral-dark rounded-lg shadow border border-neutral-light dark:border-neutral-dark flex items-center justify-between ${task.completed ? 'opacity-60' : ''}`}>
                  <div className="flex items-center flex-grow mr-4">
                     {/* Themed Checkbox */}
                     <input 
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => handleToggleComplete(task)}
                        className="h-5 w-5 text-primary focus:ring-primary border-neutral-light dark:border-neutral-dark rounded mr-3 cursor-pointer bg-white dark:bg-neutral-darker checked:bg-primary dark:checked:bg-primary"
                        // Apply custom styling for dark mode checkbox background if needed
                     />
                     <div className="flex-grow">
                        {/* Themed title/description */}
                        <h2 className={`text-lg font-semibold text-neutral-darker dark:text-white ${task.completed ? 'line-through' : ''}`}>{task.title}</h2>
                        {task.description && <p className={`text-sm text-neutral dark:text-neutral-light ${task.completed ? 'line-through' : ''}`}>{task.description}</p>}
                        {task.due_date && <p className={`text-xs text-neutral dark:text-neutral-light mt-1 ${task.completed ? 'line-through' : ''}`}>Due: {new Date(task.due_date).toLocaleString()}</p>}
                        {/* --- Display linked Goal title --- */}
                        {task.goals && (
                           <p className="text-xs text-primary dark:text-primary-light mt-1">
                              Goal: 
                              <Link to={`/goals/${task.goal_id}`} className="hover:underline ml-1">
                                 {task.goals.title}
                              </Link>
                           </p>
                        )}
                     </div>
                  </div>
                  {/* Action Buttons - Themed */} 
                  <div className="flex-shrink-0 space-x-2 flex items-center">
                      <button 
                         onClick={() => setEditingTask(task)} 
                         title="Edit Task"
                         className="text-primary dark:text-primary-light hover:text-primary-dark dark:hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
                         disabled={task.completed} // Disable edit if completed?
                      >
                          <PencilSquareIcon className="h-5 w-5" />
                      </button>
                      <button 
                         onClick={() => handleDeleteTask(task.id)} 
                         title="Delete Task"
                         className="text-danger dark:text-danger-light hover:text-danger-dark dark:hover:text-danger inline-flex items-center"
                      >
                          <TrashIcon className="h-5 w-5" />
                      </button>
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

export default TasksPage; 