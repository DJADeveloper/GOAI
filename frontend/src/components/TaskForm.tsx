import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Task } from '../types';

// Define simpler types for dropdowns
interface GoalOption {
    id: string;
    title: string;
}
interface TaskOption {
    id: string;
    title: string;
}

interface TaskFormProps {
  initialData?: Task | null; // For editing
  onSave: (task: Task) => void; // Callback
  onCancel: () => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ initialData, onSave, onCancel }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<string>('');
  const [selectedGoalId, setSelectedGoalId] = useState<string | ''>('');
  const [availableGoals, setAvailableGoals] = useState<GoalOption[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(false);
  
  // --- State for Dependencies ---
  const [availableTasks, setAvailableTasks] = useState<TaskOption[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [selectedBlockingTaskIds, setSelectedBlockingTaskIds] = useState<string[]>([]); // IDs of tasks this task is BLOCKED BY
  // ------------------------------

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isEditing = !!initialData;
  const currentTaskId = initialData?.id;

  // Fetch available goals
  useEffect(() => {
    const fetchGoals = async () => {
      if (!user) return;
      setLoadingGoals(true);
      try {
        const { data, error } = await supabase
          .from('goals')
          .select('id, title') 
          .eq('user_id', user.id)
          .in('status', ['pending', 'in_progress']);
        if (error) throw error;
        if (data) setAvailableGoals(data as GoalOption[]);
      } catch (err) { console.error("Error fetching goals for form:", err); }
      finally { setLoadingGoals(false); }
    };
    fetchGoals();
  }, [user]);

  // Fetch available tasks for dependency selection
  useEffect(() => {
    const fetchTasks = async () => {
        if (!user) return;
        setLoadingTasks(true);
        try {
            const { data, error } = await supabase
                .from('tasks')
                .select('id, title')
                .eq('user_id', user.id);
            
            if (error) throw error;
            // Filter out the current task if editing
            const filteredTasks = currentTaskId ? data?.filter(task => task.id !== currentTaskId) : data;
            setAvailableTasks((filteredTasks as TaskOption[]) || []);

        } catch (err) {
            console.error("Error fetching tasks for dependencies:", err);
            // Handle error appropriately
        } finally {
            setLoadingTasks(false);
        }
    };
    fetchTasks();
  }, [user, currentTaskId]);

  // Pre-fill form if editing, including fetching existing dependencies
  useEffect(() => {
    if (initialData && user) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setDueDate(initialData.due_date ? new Date(initialData.due_date).toISOString().slice(0, 16) : '');
      setSelectedGoalId(initialData.goal_id || '');

      // Fetch existing dependencies for this task (tasks it depends on / is blocked by)
      const fetchDependencies = async () => {
          try {
              const { data, error } = await supabase
                  .from('task_dependencies')
                  .select('blocking_task_id') // Select the ID of the task that blocks this one
                  .eq('user_id', user.id)
                  .eq('dependent_task_id', initialData.id); // This task is the dependent one

              if (error) throw error;
              
              const blockingIds = data ? data.map(dep => dep.blocking_task_id) : [];
              setSelectedBlockingTaskIds(blockingIds);

          } catch (err) {
              console.error("Error fetching existing task dependencies:", err);
              setFormError("Failed to load existing dependencies.");
          }
      };
      fetchDependencies();
    }
  }, [initialData, user]);

  // Handle change in multi-select
  const handleDependencyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedIds = Array.from(event.target.selectedOptions, option => option.value);
      setSelectedBlockingTaskIds(selectedIds);
  };

  // Handle form submission (including dependency updates)
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !title.trim()) {
      setFormError('Title is required.');
      return;
    }

    setSaving(true);
    setFormError(null);

    // 1. Save the core task data
    const taskData = {
      title: title.trim(),
      description: description.trim() || null,
      user_id: user.id,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      goal_id: selectedGoalId || null,
    };

    let savedTask: Task | null = null;
    try {
      if (isEditing && initialData) {
        const { data, error } = await supabase.from('tasks').update(taskData).eq('id', initialData.id).select().single();
        if (error) throw error;
        savedTask = data as Task;
      } else {
        const { data, error } = await supabase.from('tasks').insert({ ...taskData, completed: false }).select().single();
        if (error) throw error;
        savedTask = data as Task;
      }
    } catch (err: any) {
      console.error(isEditing ? "Error updating task:" : "Error creating task:", err);
      setFormError(err.message || (isEditing ? "Failed to update task." : "Failed to create task."));
      setSaving(false);
      return; // Stop if task saving fails
    }

    // 2. If task save was successful, update dependencies
    if (savedTask) {
        try {
            const dependentTaskId = savedTask.id;
            let existingBlockingIds: string[] = [];

            // Fetch current dependencies again to be safe (or use state if confident)
            const { data: currentDeps, error: fetchErr } = await supabase
                .from('task_dependencies')
                .select('blocking_task_id')
                .eq('user_id', user.id)
                .eq('dependent_task_id', dependentTaskId);
            
            if (fetchErr) throw fetchErr;
            existingBlockingIds = currentDeps ? currentDeps.map(d => d.blocking_task_id) : [];

            // Determine dependencies to add and remove
            const idsToAdd = selectedBlockingTaskIds.filter(id => !existingBlockingIds.includes(id));
            const idsToRemove = existingBlockingIds.filter(id => !selectedBlockingTaskIds.includes(id));

            // Add new dependencies
            if (idsToAdd.length > 0) {
                const rowsToAdd = idsToAdd.map(blockingId => ({ 
                    user_id: user.id, 
                    blocking_task_id: blockingId, 
                    dependent_task_id: dependentTaskId 
                }));
                const { error: insertError } = await supabase.from('task_dependencies').insert(rowsToAdd);
                if (insertError) throw insertError;
            }

            // Remove old dependencies
            if (idsToRemove.length > 0) {
                const { error: deleteError } = await supabase
                    .from('task_dependencies')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('dependent_task_id', dependentTaskId)
                    .in('blocking_task_id', idsToRemove);
                if (deleteError) throw deleteError;
            }

            // If everything succeeded
            onSave(savedTask);
            if (!isEditing) {
                setTitle(''); setDescription(''); setDueDate(''); setSelectedGoalId('');
                setSelectedBlockingTaskIds([]); // Reset dependencies
            }

        } catch (depError: any) {
            console.error("Error updating task dependencies:", depError);
            setFormError(`Task saved, but failed to update dependencies: ${depError.message}`);
            // Still call onSave, but with a warning in the form?
            onSave(savedTask); 
        }
    }

    setSaving(false);
  };

  return (
    <div className="p-4 mb-6 bg-white dark:bg-neutral-dark rounded-lg shadow border border-neutral-light dark:border-neutral-dark">
      <h2 className="text-xl font-semibold mb-4 text-neutral-darker dark:text-white">{isEditing ? 'Edit Task' : 'Create New Task'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="task-title" className="block text-sm font-medium text-neutral-dark dark:text-neutral-light">Title <span className="text-danger">*</span></label>
          <input id="task-title" type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 mt-1 border border-neutral-light dark:border-neutral-dark rounded-md shadow-sm bg-white dark:bg-neutral-darker focus:outline-none focus:ring-primary dark:focus:ring-primary-light focus:border-primary dark:focus:border-primary-light text-neutral-darker dark:text-white" />
        </div>
        <div>
          <label htmlFor="task-description" className="block text-sm font-medium text-neutral-dark dark:text-neutral-light">Description</label>
          <textarea id="task-description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 mt-1 border border-neutral-light dark:border-neutral-dark rounded-md shadow-sm bg-white dark:bg-neutral-darker focus:outline-none focus:ring-primary dark:focus:ring-primary-light focus:border-primary dark:focus:border-primary-light text-neutral-darker dark:text-white" />
        </div>
        <div>
            <label htmlFor="task-due-date" className="block text-sm font-medium text-neutral-dark dark:text-neutral-light">Due Date/Time</label>
            <input id="task-due-date" type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-3 py-2 mt-1 border border-neutral-light dark:border-neutral-dark rounded-md shadow-sm bg-white dark:bg-neutral-darker focus:outline-none focus:ring-primary dark:focus:ring-primary-light focus:border-primary dark:focus:border-primary-light text-neutral-darker dark:text-white" />
         </div>
        <div>
            <label htmlFor="task-goal" className="block text-sm font-medium text-neutral-dark dark:text-neutral-light">Link to Goal (Optional)</label>
            <select id="task-goal" value={selectedGoalId} onChange={(e) => setSelectedGoalId(e.target.value)} disabled={loadingGoals} className="w-full px-3 py-2 mt-1 border border-neutral-light dark:border-neutral-dark rounded-md shadow-sm bg-white dark:bg-neutral-darker focus:outline-none focus:ring-primary dark:focus:ring-primary-light focus:border-primary dark:focus:border-primary-light text-neutral-darker dark:text-white appearance-none disabled:opacity-50 dark:disabled:opacity-60">
                <option value="">-- No Goal --</option>
                {loadingGoals ? <option disabled>Loading goals...</option> : availableGoals.map(goal => (<option key={goal.id} value={goal.id}>{goal.title}</option>))}
            </select>
        </div>

        {/* --- Dependency Selection --- */}
        <div>
            <label htmlFor="task-dependencies" className="block text-sm font-medium text-neutral-dark dark:text-neutral-light">Blocked By (Select Tasks)</label>
            <select 
               id="task-dependencies"
               multiple // Enable multi-select
               value={selectedBlockingTaskIds} // Controlled component
               onChange={handleDependencyChange}
               disabled={loadingTasks}
               className="w-full px-3 py-2 mt-1 border border-neutral-light dark:border-neutral-dark rounded-md shadow-sm bg-white dark:bg-neutral-darker focus:outline-none focus:ring-primary dark:focus:ring-primary-light focus:border-primary dark:focus:border-primary-light text-neutral-darker dark:text-white disabled:opacity-50 dark:disabled:opacity-60 h-32" // Give it some height
            >
                {loadingTasks ? (
                   <option disabled>Loading tasks...</option>
                ) : availableTasks.length === 0 ? (
                    <option disabled>No other tasks available</option>
                ) : (
                   availableTasks.map(task => (
                      // Filter out the current task if editing (should be handled by fetch, but belt-and-suspenders)
                      task.id !== currentTaskId && (
                          <option key={task.id} value={task.id}>{task.title}</option>
                      )
                   ))
                )}
            </select>
             <p className="mt-1 text-xs text-neutral dark:text-neutral-light">Select tasks that must be completed *before* this one. (Hold Cmd/Ctrl to select multiple)</p>
        </div>
        {/* -------------------------- */}

        {formError && <p className="text-sm text-danger dark:text-danger-light">{formError}</p>}
        <div className="flex justify-end space-x-3 pt-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-neutral-dark dark:text-neutral-light bg-white dark:bg-neutral-dark border border-neutral-light dark:border-neutral-dark rounded-md shadow-sm hover:bg-neutral-lighter dark:hover:bg-neutral-darker focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-dark focus:ring-primary-light">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-dark focus:ring-primary disabled:opacity-50">
            {saving ? 'Saving...' : (isEditing ? 'Update Task' : 'Save Task')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TaskForm; 