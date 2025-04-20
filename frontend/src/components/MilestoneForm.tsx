import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Milestone } from '../types';

interface MilestoneFormProps {
  initialData?: Milestone | null; // For editing
  goalId: string; // Parent goal ID is required
  onSave: (milestone: Milestone) => void; // Callback
  onCancel: () => void;
}

const MilestoneForm: React.FC<MilestoneFormProps> = ({ initialData, goalId, onSave, onCancel }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<string>(''); // YYYY-MM-DD format for date input
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isEditing = !!initialData;

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setDueDate(initialData.due_date ? new Date(initialData.due_date).toISOString().split('T')[0] : '');
    }
  }, [initialData]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !title.trim()) {
      setFormError('Title is required.');
      return;
    }
    if (!goalId) {
        setFormError('Goal ID is missing.'); // Should not happen if component is used correctly
        return;
    }

    setSaving(true);
    setFormError(null);

    const milestoneData = {
      title: title.trim(),
      description: description.trim() || null,
      user_id: user.id,
      goal_id: goalId, // Assign the parent goal ID
      due_date: dueDate || null,
      // completed status is handled separately (toggle)
    };

    try {
      let savedMilestone: Milestone | null = null;
      if (isEditing && initialData) {
        // Update existing milestone
        const { data, error } = await supabase
          .from('milestones')
          .update(milestoneData) 
          .eq('id', initialData.id)
          .select()
          .single();
        if (error) throw error;
        savedMilestone = data as Milestone;
      } else {
        // Create new milestone (completed defaults to false in DB)
        const { data, error } = await supabase
          .from('milestones')
          .insert({ ...milestoneData, completed: false })
          .select()
          .single();
        if (error) throw error;
        savedMilestone = data as Milestone;
      }

      if (savedMilestone) {
        onSave(savedMilestone);
        // Optionally reset local form state on create
        if (!isEditing) {
             setTitle('');
             setDescription('');
             setDueDate('');
        }
      }

    } catch (err: any) {
      console.error(isEditing ? "Error updating milestone:" : "Error creating milestone:", err);
      setFormError(err.message || (isEditing ? "Failed to update milestone." : "Failed to create milestone."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 mb-6 bg-neutral-lighter dark:bg-neutral-dark rounded-lg shadow border border-neutral-light dark:border-neutral-dark">
      <h3 className="text-lg font-semibold mb-4 text-neutral-darker dark:text-white">
        {isEditing ? 'Edit Milestone' : 'Add New Milestone'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="milestone-title" className="block text-sm font-medium text-neutral-dark dark:text-neutral-light">Title <span className="text-danger">*</span></label>
          <input
            id="milestone-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 mt-1 border border-neutral-light dark:border-neutral-dark rounded-md shadow-sm bg-white dark:bg-neutral-darker focus:outline-none focus:ring-primary dark:focus:ring-primary-light focus:border-primary dark:focus:border-primary-light text-neutral-darker dark:text-white"
          />
        </div>
        {/* Description */}
        <div>
          <label htmlFor="milestone-description" className="block text-sm font-medium text-neutral-dark dark:text-neutral-light">Description</label>
          <textarea
            id="milestone-description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 mt-1 border border-neutral-light dark:border-neutral-dark rounded-md shadow-sm bg-white dark:bg-neutral-darker focus:outline-none focus:ring-primary dark:focus:ring-primary-light focus:border-primary dark:focus:border-primary-light text-neutral-darker dark:text-white"
          />
        </div>
        {/* Due Date */}
         <div>
            <label htmlFor="milestone-due-date" className="block text-sm font-medium text-neutral-dark dark:text-neutral-light">Due Date</label>
            <input 
               id="milestone-due-date"
               type="date" // Milestones use date type
               value={dueDate}
               onChange={(e) => setDueDate(e.target.value)}
               className="w-full px-3 py-2 mt-1 border border-neutral-light dark:border-neutral-dark rounded-md shadow-sm bg-white dark:bg-neutral-darker focus:outline-none focus:ring-primary dark:focus:ring-primary-light focus:border-primary dark:focus:border-primary-light text-neutral-darker dark:text-white"
            />
         </div>
        
        {formError && <p className="text-sm text-danger dark:text-danger-light">{formError}</p>}
        {/* Buttons */}
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
            {saving ? 'Saving...' : (isEditing ? 'Update Milestone' : 'Save Milestone')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MilestoneForm; 