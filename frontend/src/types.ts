// Defines the structure of data fetched from Supabase

// Based on the public.goals table in the migration
export interface Goal {
  id: string; // uuid
  user_id: string; // uuid references auth.users
  title: string;
  description?: string | null; // text, optional
  due_date?: string | null; // date, optional (ISO string format from DB)
  status: 'pending' | 'in_progress' | 'completed' | 'archived'; // text, matches check constraint
  created_at: string; // timestamptz (ISO string format from DB)
  updated_at: string; // timestamptz (ISO string format from DB)
}

// Based on the public.tasks table in the migration
export interface Task {
    id: string; // uuid
    user_id: string; // uuid references auth.users
    goal_id?: string | null; // uuid references public.goals, optional
    title: string;
    description?: string | null; // text, optional
    due_date?: string | null; // timestamptz, optional (ISO string format from DB)
    completed: boolean; // boolean, required
    created_at: string; // timestamptz (ISO string format from DB)
    updated_at: string; // timestamptz (ISO string format from DB)
}

// Based on the public.habits table in the migration
export interface Habit {
    id: string; // uuid
    user_id: string; // uuid references auth.users
    goal_id?: string | null; // uuid references public.goals, optional
    name: string; // text
    description?: string | null; // text, optional
    frequency: string; // text (e.g., 'daily', 'weekly', 'mon,wed,fri')
    created_at: string; // timestamptz (ISO string format from DB)
    updated_at: string; // timestamptz (ISO string format from DB)
}

// Based on the public.progress_events table in the migration
export interface ProgressEvent {
    id: string; // uuid
    user_id: string; // uuid references auth.users
    habit_id?: string | null; // uuid references public.habits, optional
    task_id?: string | null; // uuid references public.tasks, optional
    goal_id?: string | null; // uuid references public.goals, optional
    event_date: string; // date (ISO string format from DB, YYYY-MM-DD)
    notes?: string | null; // text, optional
    value?: number | null; // numeric, optional
    created_at: string; // timestamptz (ISO string format from DB)
}

// Based on the public.brain_dump_items table in the migration
export interface BrainDumpItem {
    id: string; // uuid
    user_id: string; // uuid references auth.users
    content: string; // text
    processed: boolean; // boolean
    created_at: string; // timestamptz (ISO string format from DB)
    updated_at: string; // timestamptz (ISO string format from DB)
}

// Based on the public.milestones table in the migration
export interface Milestone {
    id: string; // uuid
    user_id: string; // uuid references auth.users
    goal_id: string; // uuid references public.goals
    title: string;
    description?: string | null;
    due_date?: string | null; // date, optional
    completed: boolean;
    created_at: string; // timestamptz
    updated_at: string; // timestamptz
    // Optional: Include goal title if fetched via join
    goals?: { title: string } | null;
}

// Add other types here as needed (NotificationSetting, etc.) 