import { supabase } from '../lib/supabaseClient';
import { ProgressEvent } from '../types';

export async function getProgressEvents(userId: string): Promise<ProgressEvent[]> {
  const { data, error } = await supabase
    .from('progress_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function createProgressEvent(progressEvent: Omit<ProgressEvent, 'id' | 'created_at'>): Promise<ProgressEvent> {
  const { data, error } = await supabase
    .from('progress_events')
    .insert([progressEvent])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateProgressEvent(id: string, updates: Partial<ProgressEvent>): Promise<ProgressEvent> {
  const { data, error } = await supabase
    .from('progress_events')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteProgressEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from('progress_events')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
} 