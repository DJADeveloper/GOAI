import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Task } from '../types';

// Define a simpler type for the goal dropdown
interface GoalOption {
    id: string;
    title: string;
}

interface TaskFormProps {
  initialData?: Task | null; // For editing
  onSave: (task: Task) => void; // Callback
  onCancel: () => void;
  // TODO: Add prop to pass available goals for linking?
}

const TaskForm: React.FC<TaskFormProps> = ({ initialData, onSave, onCancel }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<string>(''); // YYYY-MM-DDTHH:mm format for datetime-local
  const [selectedGoalId, setSelectedGoalId] = useState<string | ''>(''); // State for goal selection
  const [availableGoals, setAvailableGoals] = useState<GoalOption[]>([]); // Use GoalOption type
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isEditing = !!initialData;

  // Fetch available goals for the dropdown
  useEffect(() => {
    const fetchGoals = async () => {
      if (!user) return;
      setLoadingGoals(true);
      try {
        // Fetch only id and title, and ensure data matches GoalOption[]
        const { data, error } = await supabase
          .from('goals')
          .select('id, title') 
          .eq('user_id', user.id)
          .in('status', ['pending', 'in_progress']);
        
        if (error) throw error;
        if (data) {
          // Explicitly cast or ensure the fetched data matches GoalOption[]
          setAvailableGoals(data as GoalOption[]);
        }

      } catch (err) {
         console.error("Error fetching goals for form:", err);
      } finally {
         setLoadingGoals(false);
      }
    };
    fetchGoals();
  }, [user]);

  // Pre-fill form if editing
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      // Format timestamptz for input type="datetime-local" (YYYY-MM-DDTHH:mm)
      setDueDate(initialData.due_date ? new Date(initialData.due_date).toISOString().slice(0, 16) : '');
      setSelectedGoalId(initialData.goal_id || ''); // Pre-fill selected goal
    }
  }, [initialData]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !title.trim()) {
      setFormError('Title is required.');
      return;
    }

    setSaving(true);
    setFormError(null);

    const taskData = {
      title: title.trim(),
      description: description.trim() || null,
      user_id: user.id,
      due_date: dueDate ? new Date(dueDate).toISOString() : null, // Convert back to ISO string for DB
      goal_id: selectedGoalId || null, // Include selected goal_id
      // completed status handled separately (usually toggle, not in this form)
    };

    try {
      let savedTask: Task | null = null;
      if (isEditing && initialData) {
        const { data, error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', initialData.id)
          .select()
          .single();
        if (error) throw error;
        savedTask = data as Task;
      } else {
        const { data, error } = await supabase
          .from('tasks')
          .insert({ ...taskData, completed: false }) // Default completed to false
          .select()
          .single();
        if (error) throw error;
        savedTask = data as Task;
      }

      if (savedTask) {
        onSave(savedTask);
        if (!isEditing) {
             setTitle('');
             setDescription('');
             setDueDate('');
             setSelectedGoalId(''); // Reset goal selection
        }
      }

    } catch (err: any) {
      console.error(isEditing ? "Error updating task:" : "Error creating task:", err);
      setFormError(err.message || (isEditing ? "Failed to update task." : "Failed to create task."));
    } finally {
      setSaving(false);
    }
  };

  return (
    // Themed form container
    <div className="p-4 mb-6 bg-white dark:bg-neutral-dark rounded-lg shadow border border-neutral-light dark:border-neutral-dark">
      {/* Themed title */}
      <h2 className="text-xl font-semibold mb-4 text-neutral-darker dark:text-white">{isEditing ? 'Edit Task' : 'Create New Task'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          {/* Themed label */}
          <label htmlFor="task-title" className="block text-sm font-medium text-neutral-dark dark:text-neutral-light">Title <span className="text-danger">*</span></label>
          {/* Themed input */}
          <input
            id="task-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 mt-1 border border-neutral-light dark:border-neutral-dark rounded-md shadow-sm bg-white dark:bg-neutral-darker focus:outline-none focus:ring-primary dark:focus:ring-primary-light focus:border-primary dark:focus:border-primary-light text-neutral-darker dark:text-white"
          />
        </div>
        {/* Description */}
        <div>
          {/* Themed label */}
          <label htmlFor="task-description" className="block text-sm font-medium text-neutral-dark dark:text-neutral-light">Description</label>
          {/* Themed textarea */}
          <textarea
            id="task-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 mt-1 border border-neutral-light dark:border-neutral-dark rounded-md shadow-sm bg-white dark:bg-neutral-darker focus:outline-none focus:ring-primary dark:focus:ring-primary-light focus:border-primary dark:focus:border-primary-light text-neutral-darker dark:text-white"
          />
        </div>
        {/* Due Date */}
        <div>
            {/* Themed label */}
            <label htmlFor="task-due-date" className="block text-sm font-medium text-neutral-dark dark:text-neutral-light">Due Date/Time</label>
            {/* Themed input */}
            <input 
               id="task-due-date"
               type="datetime-local" // Use datetime-local for timestamptz
               value={dueDate}
               onChange={(e) => setDueDate(e.target.value)}
               className="w-full px-3 py-2 mt-1 border border-neutral-light dark:border-neutral-dark rounded-md shadow-sm bg-white dark:bg-neutral-darker focus:outline-none focus:ring-primary dark:focus:ring-primary-light focus:border-primary dark:focus:border-primary-light text-neutral-darker dark:text-white"
            />
         </div>
        {/* Goal Selection Dropdown */}
        <div>
            {/* Themed label */}
            <label htmlFor="task-goal" className="block text-sm font-medium text-neutral-dark dark:text-neutral-light">Link to Goal (Optional)</label>
            {/* Themed select */}
            <select 
               id="task-goal"
               value={selectedGoalId}
               onChange={(e) => setSelectedGoalId(e.target.value)}
               disabled={loadingGoals}
               className="w-full px-3 py-2 mt-1 border border-neutral-light dark:border-neutral-dark rounded-md shadow-sm bg-white dark:bg-neutral-darker focus:outline-none focus:ring-primary dark:focus:ring-primary-light focus:border-primary dark:focus:border-primary-light text-neutral-darker dark:text-white appearance-none disabled:opacity-50 dark:disabled:opacity-60"
            >
                <option value="">-- No Goal --</option>
                {loadingGoals ? (
                   <option disabled>Loading goals...</option>
                ) : (
                   availableGoals.map(goal => (
                      <option key={goal.id} value={goal.id}>{goal.title}</option>
                   ))
                )}
            </select>
        </div>

        {/* Themed error */}
        {formError && <p className="text-sm text-danger dark:text-danger-light">{formError}</p>}
        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-2">
          {/* Themed Cancel button */}
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-neutral-dark dark:text-neutral-light bg-white dark:bg-neutral-dark border border-neutral-light dark:border-neutral-dark rounded-md shadow-sm hover:bg-neutral-lighter dark:hover:bg-neutral-darker focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-dark focus:ring-primary-light"
          >
            Cancel
          </button>
          {/* Themed Save button */}
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-dark focus:ring-primary disabled:opacity-50"
          >
            {saving ? 'Saving...' : (isEditing ? 'Update Task' : 'Save Task')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TaskForm; 