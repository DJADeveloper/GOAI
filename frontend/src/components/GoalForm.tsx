import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Goal } from '../types';

// Define the possible goal statuses based on the type
const goalStatuses: Goal['status'][] = ['pending', 'in_progress', 'completed', 'archived'];

interface GoalFormProps {
  initialData?: Goal | null; // Pass existing goal data for editing
  onSave: (goal: Goal) => void; // Callback for both create and update
  onCancel: () => void;
}

const GoalForm: React.FC<GoalFormProps> = ({ initialData, onSave, onCancel }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Goal['status']>('pending'); // Default to pending
  const [dueDate, setDueDate] = useState<string>(''); // Store as YYYY-MM-DD string for input
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isEditing = !!initialData;

  useEffect(() => {
    // Pre-fill form if editing
    if (initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setStatus(initialData.status || 'pending');
      // Format date for input type="date" (YYYY-MM-DD)
      setDueDate(initialData.due_date ? new Date(initialData.due_date).toISOString().split('T')[0] : '');
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

    const goalData = {
      title: title.trim(),
      description: description.trim() || null,
      user_id: user.id,
      status: status,
      due_date: dueDate || null, // Send null if empty string
    };

    try {
      let savedGoal: Goal | null = null;
      if (isEditing && initialData) {
        // Update existing goal
        const { data, error } = await supabase
          .from('goals')
          .update(goalData)
          .eq('id', initialData.id)
          .select()
          .single();
        if (error) throw error;
        savedGoal = data as Goal;
      } else {
        // Create new goal
        const { data, error } = await supabase
          .from('goals')
          .insert(goalData) // Status is already included in goalData
          .select()
          .single();
        if (error) throw error;
        savedGoal = data as Goal;
      }

      if (savedGoal) {
        onSave(savedGoal); // Pass the saved goal back
        // Reset local form state only on successful create, not necessarily on update
        if (!isEditing) {
             setTitle(''); 
             setDescription('');
             setStatus('pending');
             setDueDate('');
        }
      }

    } catch (err: any) {
      console.error(isEditing ? "Error updating goal:" : "Error creating goal:", err);
      setFormError(err.message || (isEditing ? "Failed to update goal." : "Failed to create goal."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 mb-6 bg-white dark:bg-neutral-dark rounded-lg shadow border border-neutral-light dark:border-neutral-dark">
      <h2 className="text-xl font-semibold mb-4 text-neutral-darker dark:text-white">{isEditing ? 'Edit Goal' : 'Create New Goal'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="goal-title" className="block text-sm font-medium text-neutral-dark dark:text-neutral-light">Title <span className="text-danger">*</span></label>
          <input
            id="goal-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 mt-1 border border-neutral-light dark:border-neutral-dark rounded-md shadow-sm bg-white dark:bg-neutral-darker focus:outline-none focus:ring-primary dark:focus:ring-primary-light focus:border-primary dark:focus:border-primary-light text-neutral-darker dark:text-white"
          />
        </div>
        <div>
          <label htmlFor="goal-description" className="block text-sm font-medium text-neutral-dark dark:text-neutral-light">Description</label>
          <textarea
            id="goal-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 mt-1 border border-neutral-light dark:border-neutral-dark rounded-md shadow-sm bg-white dark:bg-neutral-darker focus:outline-none focus:ring-primary dark:focus:ring-primary-light focus:border-primary dark:focus:border-primary-light text-neutral-darker dark:text-white"
          />
        </div>
        <div>
           <label htmlFor="goal-status" className="block text-sm font-medium text-neutral-dark dark:text-neutral-light">Status</label>
           <select 
              id="goal-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as Goal['status'])}
              className="w-full px-3 py-2 mt-1 border border-neutral-light dark:border-neutral-dark rounded-md shadow-sm bg-white dark:bg-neutral-darker focus:outline-none focus:ring-primary dark:focus:ring-primary-light focus:border-primary dark:focus:border-primary-light text-neutral-darker dark:text-white appearance-none"
           >
              {goalStatuses.map(s => (
                 <option key={s} value={s}>
                    {s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} {/* Format for display */} 
                 </option>
              ))}
           </select>
        </div>
         <div>
            <label htmlFor="goal-due-date" className="block text-sm font-medium text-neutral-dark dark:text-neutral-light">Due Date</label>
            <input 
               id="goal-due-date"
               type="date"
               value={dueDate}
               onChange={(e) => setDueDate(e.target.value)}
               className="w-full px-3 py-2 mt-1 border border-neutral-light dark:border-neutral-dark rounded-md shadow-sm bg-white dark:bg-neutral-darker focus:outline-none focus:ring-primary dark:focus:ring-primary-light focus:border-primary dark:focus:border-primary-light text-neutral-darker dark:text-white"
            />
         </div>
        {formError && <p className="text-sm text-danger dark:text-danger-light">{formError}</p>}
        <div className="flex justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-neutral-dark dark:text-neutral-light bg-white dark:bg-neutral-dark border border-neutral-light dark:border-neutral-dark rounded-md shadow-sm hover:bg-neutral-lighter dark:hover:bg-neutral-darker focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-dark focus:ring-primary-light"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-dark focus:ring-primary disabled:opacity-50"
          >
            {saving ? 'Saving...' : (isEditing ? 'Update Goal' : 'Save Goal')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GoalForm; 