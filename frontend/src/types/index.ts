export interface ProgressEvent {
  id: string;
  user_id: string;
  event_type: 'goal' | 'task' | 'habit';
  event_id: string;
  event_name: string;
  status: string;
  notes?: string;
  created_at: string;
} 