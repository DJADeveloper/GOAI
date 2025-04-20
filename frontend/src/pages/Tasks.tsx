import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Task, Goal } from '../types';
import TaskForm from '../components/TaskForm';
import { Link } from 'react-router-dom';
import { PencilSquareIcon, TrashIcon, PlusIcon, XMarkIcon, CheckCircleIcon, LockClosedIcon, BellAlertIcon } from '@heroicons/react/24/outline';

// Define structure for raw dependency data
interface TaskDependency {
    id: string;
    user_id: string;
    blocking_task_id: string;
    dependent_task_id: string;
    created_at: string;
}

// Extend Task type to include dependency info and potentially blocking task details
interface TaskWithDetails extends Task {
  goals?: Pick<Goal, 'title'> | null;
  blockingTasks?: { id: string; title: string; completed: boolean }[];
  isBlocked?: boolean;
}

const TasksPage: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithDetails | null>(null);
  // --- State for Notifications ---
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
  // ------------------------------

  // Function to process tasks and add dependency info
  const processTasksWithDependencies = (
      rawTasks: Task[], 
      dependencies: TaskDependency[]
  ): TaskWithDetails[] => {
      const taskMap = new Map(rawTasks.map(task => [task.id, task]));
      const blockedByMap = new Map<string, { id: string; title: string; completed: boolean }[]>();

      // Populate the map of tasks blocked by others
      dependencies.forEach(dep => {
          const blockingTask = taskMap.get(dep.blocking_task_id);
          if (blockingTask) {
              const dependents = blockedByMap.get(dep.dependent_task_id) || [];
              dependents.push({ 
                  id: blockingTask.id, 
                  title: blockingTask.title, 
                  completed: blockingTask.completed 
              });
              blockedByMap.set(dep.dependent_task_id, dependents);
          }
      });

      // Augment tasks with dependency info
      return rawTasks.map(task => {
          const blockingTasks = blockedByMap.get(task.id) || [];
          const isBlocked = blockingTasks.some(blocker => !blocker.completed);
          return {
              ...task,
              blockingTasks,
              isBlocked,
          };
      });
  };

  // Effect to request notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                setNotificationPermission(permission);
            });
        } else {
            setNotificationPermission(Notification.permission);
        }
    }
  }, []);

  // Fetch tasks AND dependencies on load, then check for notifications
  useEffect(() => {
    const fetchTasksAndDeps = async () => {
      if (!user) {
        setError("User not logged in.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);

        // Fetch tasks (with goal title) and dependencies concurrently
        const [tasksResponse, depsResponse] = await Promise.all([
            supabase
                .from('tasks')
                .select('*, goals ( title ) ')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false }),
            supabase
                .from('task_dependencies')
                .select('*')
                .eq('user_id', user.id)
        ]);
        
        if (tasksResponse.error) throw tasksResponse.error;
        if (depsResponse.error) throw depsResponse.error;

        const rawTasks = (tasksResponse.data as Task[]) || [];
        const dependencies = (depsResponse.data as TaskDependency[]) || [];

        // Process tasks to include dependency info
        const processedTasks = processTasksWithDependencies(rawTasks, dependencies);
        setTasks(processedTasks);

        // --- Check for Notifications after tasks are loaded ---
        if (notificationPermission === 'granted') {
            const now = new Date();
            const oneDayInMillis = 24 * 60 * 60 * 1000;

            processedTasks.forEach(task => {
                if (!task.completed && task.due_date) {
                    try {
                       const dueDate = new Date(task.due_date);
                       const timeDiff = dueDate.getTime() - now.getTime();

                       // Check if overdue or due within the next 24 hours
                       if (timeDiff < oneDayInMillis) { 
                           console.log(`Task "${task.title}" is due soon or overdue. Triggering notification.`); // Log for debugging
                           // Simple notification - can be enhanced later
                           new Notification('Task Reminder', {
                               body: `Task "${task.title}" is ${timeDiff < 0 ? 'overdue' : 'due soon'}.`,
                               // icon: '/path/to/icon.png' // Optional
                               // tag: `task-reminder-${task.id}` // Optional: prevents duplicate notifications if tag exists
                           });
                       }
                    } catch (dateError) {
                        console.error(`Error parsing due date for task ${task.id}: ${task.due_date}`, dateError);
                    }
                }
            });
        }
        // --------------------------------------------------------

      } catch (err: any) {
        console.error("Error fetching tasks or dependencies:", err);
        setError(err.message || "Failed to fetch tasks.");
      } finally {
        setLoading(false);
      }
    };
    fetchTasksAndDeps();
  }, [user, notificationPermission]); // Rerun if user changes OR notification permission changes to granted

  // Handle saving (needs to potentially refetch to update dependency status)
  const handleSaveTask = (savedTask: Task) => {
    // Simple approach: Refetch all tasks and dependencies after save
    // More complex: Optimistically update the saved task and its dependencies locally
    // For now, let's plan to refetch (or require manual refresh)
    // TODO: Implement refetching or optimistic updates for dependencies

    // Basic update (without dependency recalculation)
     const taskWithGoal = {
         ...savedTask,
         goals: savedTask.goal_id ? { title: 'Goal Link' } : null, // Placeholder title
         blockingTasks: editingTask?.blockingTasks || [], // Keep existing deps temporarily
         isBlocked: editingTask?.isBlocked || false,
     };

     if (editingTask) {
         setTasks(tasks.map(t => t.id === savedTask.id ? taskWithGoal : t));
         setEditingTask(null);
     } else {
         setTasks([taskWithGoal, ...tasks]);
         setShowCreateForm(false);
     }
     // Recommend a refetch function call here in a real implementation
     alert("Task saved. Refresh page to see updated dependency status."); // Temp feedback
  };

  // Handle toggling completion status (prevent if blocked)
  const handleToggleComplete = async (task: TaskWithDetails) => {
    if (task.isBlocked) {
        alert(`Cannot complete task: "${task.title}". It is blocked by incomplete prerequisite tasks.`);
        return; // Prevent completion if blocked
    }
    
    // --- Existing completion logic --- 
    try {
      const updates = { completed: !task.completed, updated_at: new Date().toISOString() };
      const { data, error: updateError } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', task.id)
        .select('*, goals ( title ) ') // Keep fetching goal title
        .single();

      if (updateError) throw updateError;

      if (data) {
        // TODO: Refetch needed here to update dependency statuses of OTHER tasks
        // Simple update for now:
        setTasks(tasks.map(t => t.id === data.id ? { ...t, completed: data.completed } : t));
        alert("Task status updated. Refresh page to see updated dependency statuses."); // Temp feedback
      }
    } catch (err: any) {
      console.error("Error toggling task completion:", err);
       setError(err.message || "Failed to toggle task completion.");
    }
    // ------------------------------- 
  };

  // Handle deleting a task (dependencies will cascade delete in DB)
  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task? This may also affect other tasks that depend on it.')) return;
    try {
      const { error: deleteError } = await supabase.from('tasks').delete().eq('id', taskId);
      if (deleteError) throw deleteError;
      setTasks(tasks.filter(t => t.id !== taskId));
      // TODO: Refetch needed here to update dependencies
      alert("Task deleted. Refresh page to see updated dependency statuses."); // Temp feedback
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

      {/* Notification Permission Info */}
      {notificationPermission === 'denied' && (
        <div className="p-3 bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded-md text-yellow-800 dark:text-yellow-200 text-sm">
            <BellAlertIcon className="h-5 w-5 inline-block mr-2" />
            Browser notifications are currently blocked. Please enable them in your browser settings if you want task reminders.
        </div>
      )}
       {notificationPermission === 'default' && (
        <div className="p-3 bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700 rounded-md text-blue-800 dark:text-blue-200 text-sm">
            <BellAlertIcon className="h-5 w-5 inline-block mr-2" />
            Enable browser notifications to receive reminders for tasks that are due soon.
        </div>
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
                // Add conditional styling for blocked tasks
                <div key={task.id} className={`p-4 bg-white dark:bg-neutral-dark rounded-lg shadow border border-neutral-light dark:border-neutral-dark flex items-center justify-between ${task.completed ? 'opacity-60' : ''} ${task.isBlocked ? 'border-l-4 border-danger' : ''}`}>
                  <div className="flex items-center flex-grow mr-4">
                     {/* Themed Checkbox */}
                     <input 
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => handleToggleComplete(task)}
                        // Disable checkbox if task is blocked
                        disabled={task.isBlocked && !task.completed}
                        className={`h-5 w-5 text-primary focus:ring-primary border-neutral-light dark:border-neutral-dark rounded mr-3 cursor-pointer bg-white dark:bg-neutral-darker checked:bg-primary dark:checked:bg-primary disabled:opacity-50 disabled:cursor-not-allowed dark:disabled:bg-neutral-dark`}
                        title={task.isBlocked ? "Cannot complete: Blocked by other tasks" : "Mark as complete/incomplete"}
                     />
                     <div className="flex-grow">
                        {/* Themed title/description */}
                        <div className="flex items-center space-x-2">
                           <h2 className={`text-lg font-semibold text-neutral-darker dark:text-white ${task.completed ? 'line-through' : ''}`}>{task.title}</h2>
                           {/* Show lock icon if blocked */}
                           {task.isBlocked && (
                               <LockClosedIcon 
                                   className="h-4 w-4 text-danger flex-shrink-0"
                                   title={`Blocked by: ${task.blockingTasks?.filter(t => !t.completed).map(t => t.title).join(', ')}`}
                               />
                           )}
                        </div>
                        {task.description && <p className={`text-sm text-neutral dark:text-neutral-light ${task.completed ? 'line-through' : ''}`}>{task.description}</p>}
                        {/* Display blocking task titles if blocked */}
                        {task.isBlocked && (
                            <p className="text-xs text-danger dark:text-danger-light mt-1">
                                Blocked by: {task.blockingTasks?.filter(t => !t.completed).map(t => t.title).join(', ')}
                            </p>
                        )}
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