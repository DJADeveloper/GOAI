import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Habit } from '../types';

// Example frequencies - can be expanded or made more dynamic
const frequencyOptions = ['daily', 'weekly', 'mon,wed,fri', 'weekends', 'weekdays'];

interface HabitFormProps {
  initialData?: Habit | null; // For editing
  onSave: (habit: Habit) => void; // Callback
  onCancel: () => void;
  // TODO: Add prop for goal linking?
}

const HabitForm: React.FC<HabitFormProps> = ({ initialData, onSave, onCancel }) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<string>(frequencyOptions[0]); // Default to first option
  // TODO: Add state for goal_id
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isEditing = !!initialData;

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      setFrequency(initialData.frequency || frequencyOptions[0]);
      // TODO: Set initial goal_id
    }
  }, [initialData]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !name.trim()) {
      setFormError('Habit name is required.');
      return;
    }

    setSaving(true);
    setFormError(null);

    const habitData = {
      name: name.trim(),
      description: description.trim() || null,
      frequency: frequency,
      user_id: user.id,
      // goal_id: selectedGoalId || null, // TODO: Add goal linking
    };

    try {
      let savedHabit: Habit | null = null;
      if (isEditing && initialData) {
        const { data, error } = await supabase
          .from('habits')
          .update(habitData)
          .eq('id', initialData.id)
          .select()
          .single();
        if (error) throw error;
        savedHabit = data as Habit;
      } else {
        const { data, error } = await supabase
          .from('habits')
          .insert(habitData)
          .select()
          .single();
        if (error) throw error;
        savedHabit = data as Habit;
      }

      if (savedHabit) {
        onSave(savedHabit);
        if (!isEditing) {
             setName('');
             setDescription('');
             setFrequency(frequencyOptions[0]);
        }
      }

    } catch (err: any) {
      console.error(isEditing ? "Error updating habit:" : "Error creating habit:", err);
      setFormError(err.message || (isEditing ? "Failed to update habit." : "Failed to create habit."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 mb-6 bg-white dark:bg-neutral-dark rounded-lg shadow border border-neutral-light dark:border-neutral-dark">
      <h2 className="text-xl font-semibold mb-4 text-neutral-darker dark:text-white">{isEditing ? 'Edit Habit' : 'Create New Habit'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="habit-name" className="block text-sm font-medium text-neutral-dark dark:text-neutral-light">Name <span className="text-danger">*</span></label>
          <input
            id="habit-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 mt-1 border border-neutral-light dark:border-neutral-dark rounded-md shadow-sm bg-white dark:bg-neutral-darker focus:outline-none focus:ring-primary dark:focus:ring-primary-light focus:border-primary dark:focus:border-primary-light text-neutral-darker dark:text-white"
          />
        </div>
        <div>
          <label htmlFor="habit-description" className="block text-sm font-medium text-neutral-dark dark:text-neutral-light">Description</label>
          <textarea
            id="habit-description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 mt-1 border border-neutral-light dark:border-neutral-dark rounded-md shadow-sm bg-white dark:bg-neutral-darker focus:outline-none focus:ring-primary dark:focus:ring-primary-light focus:border-primary dark:focus:border-primary-light text-neutral-darker dark:text-white"
          />
        </div>
        <div>
           <label htmlFor="habit-frequency" className="block text-sm font-medium text-neutral-dark dark:text-neutral-light">Frequency</label>
           <select 
              id="habit-frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-neutral-light dark:border-neutral-dark rounded-md shadow-sm bg-white dark:bg-neutral-darker focus:outline-none focus:ring-primary dark:focus:ring-primary-light focus:border-primary dark:focus:border-primary-light text-neutral-darker dark:text-white appearance-none"
           >
              {frequencyOptions.map(f => (
                 <option key={f} value={f}>{f.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
              ))}
              {/* TODO: Add 'custom' option? */} 
           </select>
        </div>
         {/* TODO: Add Goal Selection Dropdown */} 

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
            {saving ? 'Saving...' : (isEditing ? 'Update Habit' : 'Save Habit')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default HabitForm; 