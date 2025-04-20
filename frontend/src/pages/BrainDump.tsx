import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { BrainDumpItem } from '../types';
import { PlusIcon, CheckIcon, TrashIcon } from '@heroicons/react/24/outline';

const BrainDumpPage: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<BrainDumpItem[]>([]);
  const [newItemContent, setNewItemContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch unprocessed items on load
  useEffect(() => {
    const fetchItems = async () => {
      if (!user) {
        setError("User not logged in.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase
          .from('brain_dump_items')
          .select('*')
          .eq('user_id', user.id)
          .eq('processed', false) // Only fetch unprocessed items
          .order('created_at', { ascending: true }); // Show oldest first
        if (fetchError) throw fetchError;
        if (data) setItems(data);
      } catch (err: any) {
        console.error("Error fetching brain dump items:", err);
        setError(err.message || "Failed to fetch items.");
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [user]);

  // Handle adding a new item
  const handleAddItem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !newItemContent.trim()) return;

    setSaving(true);
    try {
      const { data, error: insertError } = await supabase
        .from('brain_dump_items')
        .insert({ 
            content: newItemContent.trim(), 
            user_id: user.id, 
            processed: false 
        })
        .select()
        .single();
      
      if (insertError) throw insertError;

      if (data) {
        setItems([...items, data]); // Add to the end of the list
        setNewItemContent(''); // Clear input
      }
    } catch (err: any) {
      console.error("Error adding brain dump item:", err);
      setError(err.message || "Failed to add item.");
    } finally {
        setSaving(false);
    }
  };

  // Handle marking an item as processed
  const handleProcessItem = async (itemId: string) => {
    // In the future, this could open a modal to create a task/goal
    // For now, just mark as processed and remove from the list
    try {
        const { error: updateError } = await supabase
            .from('brain_dump_items')
            .update({ processed: true, updated_at: new Date().toISOString() })
            .eq('id', itemId);
        
        if (updateError) throw updateError;

        setItems(items.filter(item => item.id !== itemId));
        // TODO: Add success feedback / link to create task/goal?

    } catch (err: any) {
        console.error("Error processing item:", err);
        setError(err.message || "Failed to process item.");
    }
  };

  // Handle deleting an item
  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      const { error: deleteError } = await supabase
        .from('brain_dump_items')
        .delete()
        .eq('id', itemId);

      if (deleteError) throw deleteError;

      setItems(items.filter(item => item.id !== itemId));
    } catch (err: any) {
      console.error("Error deleting brain dump item:", err);
      setError(err.message || "Failed to delete item.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Themed title and description */}
      <h1 className="text-3xl font-bold text-neutral-darker dark:text-neutral-lighter">Brain Dump</h1>
      <p className="text-neutral dark:text-neutral-light">Quickly capture thoughts, ideas, or tasks here. Process them later.</p>

      {/* Input Form - Themed */}
      <form onSubmit={handleAddItem} className="mb-6">
        {/* Themed textarea */}
        <textarea
          value={newItemContent}
          onChange={(e) => setNewItemContent(e.target.value)}
          placeholder="Dump your thoughts here... (Press Enter to save)"
          rows={2}
          className="w-full p-2 border border-neutral-light dark:border-neutral-dark rounded-md shadow-sm bg-white dark:bg-neutral-darker focus:outline-none focus:ring-primary dark:focus:ring-primary-light focus:border-primary dark:focus:border-primary-light text-neutral-darker dark:text-white"
          onKeyDown={(e) => {
             if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // Prevent newline on enter
                handleAddItem(e); // Submit form
             }
          }}
        />
        {/* Themed button */}
        <button 
           type="submit" 
           disabled={saving || !newItemContent.trim()} 
           className="mt-2 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-darker focus:ring-primary disabled:opacity-50"
         >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" /> 
            {saving ? 'Adding...' : 'Add to Dump'}
         </button>
      </form>

      {/* Item List */}
      <h2 className="text-xl font-semibold text-neutral-darker dark:text-white mb-3 border-t border-neutral-light dark:border-neutral-dark pt-4">Inbox</h2>
      {/* Themed Loading/Error */}
      {loading && <p className="text-neutral dark:text-neutral-light">Loading items...</p>}
      {error && <p className="text-danger dark:text-danger-light mb-4">Error: {error}</p>}
      
      {!loading && !error && (
        <div className="space-y-2">
          {items.length === 0 ? (
             // Themed empty state
            <p className="text-neutral dark:text-neutral-light text-center py-4">Your brain dump inbox is empty.</p>
          ) : (
            items.map((item) => (
               // Themed card
              <div key={item.id} className="p-3 bg-white dark:bg-neutral-dark rounded-lg shadow border border-neutral-light dark:border-neutral-dark flex items-center justify-between">
                 {/* Themed content */}
                 <p className="text-neutral-darker dark:text-white flex-grow mr-4 whitespace-pre-wrap">{item.content}</p>
                 {/* Themed buttons */}
                 <div className="flex-shrink-0 space-x-2 flex items-center">
                    {/* Process Button */}
                    <button 
                       onClick={() => handleProcessItem(item.id)} 
                       className="text-secondary dark:text-secondary-light hover:text-secondary-dark dark:hover:text-secondary inline-flex items-center space-x-1"
                       title="Mark as processed"
                    >
                       <CheckIcon className="h-5 w-5" />
                       <span>Process</span>
                    </button>
                    {/* Delete Button */}
                    <button 
                       onClick={() => handleDeleteItem(item.id)} 
                       className="text-danger dark:text-danger-light hover:text-danger-dark dark:hover:text-danger inline-flex items-center space-x-1"
                       title="Delete item"
                    >
                       <TrashIcon className="h-5 w-5" />
                       <span>Delete</span>
                    </button>
                 </div>
              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
};

export default BrainDumpPage; 