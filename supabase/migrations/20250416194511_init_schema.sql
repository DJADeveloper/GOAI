-- Trigger function to automatically update 'updated_at' columns
create extension if not exists moddatetime schema extensions;

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- GOALS Table
create table public.goals (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    title text not null check (length(title) > 0),
    description text,
    due_date date,
    status text default 'pending' not null check (status in ('pending', 'in_progress', 'completed', 'archived')),
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);
alter table public.goals enable row level security;
create index ix_goals_user_id on public.goals(user_id);
create index ix_goals_created_at on public.goals(created_at desc);
create trigger handle_updated_at before update on public.goals
  for each row execute procedure public.handle_updated_at();


-- MILESTONES Table (Optional: Assuming milestones belong to goals)
create table public.milestones (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    goal_id uuid references public.goals(id) on delete cascade not null,
    title text not null check (length(title) > 0),
    description text,
    due_date date,
    completed boolean default false not null,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);
alter table public.milestones enable row level security;
create index ix_milestones_user_id on public.milestones(user_id);
create index ix_milestones_goal_id on public.milestones(goal_id);
create trigger handle_updated_at before update on public.milestones
  for each row execute procedure public.handle_updated_at();


-- TASKS Table
create table public.tasks (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    goal_id uuid references public.goals(id) on delete set null, -- Task can exist without a goal, or goal deletion doesn't delete task
    title text not null check (length(title) > 0),
    description text,
    due_date timestamptz, -- Use timestamptz if time is relevant, date otherwise
    completed boolean default false not null,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);
alter table public.tasks enable row level security;
create index ix_tasks_user_id on public.tasks(user_id);
create index ix_tasks_goal_id on public.tasks(goal_id);
create index ix_tasks_created_at on public.tasks(created_at desc);
create trigger handle_updated_at before update on public.tasks
  for each row execute procedure public.handle_updated_at();


-- HABITS Table
create table public.habits (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    goal_id uuid references public.goals(id) on delete set null, -- Habit can exist without a goal
    name text not null check (length(name) > 0),
    description text,
    frequency text not null, -- e.g., 'daily', 'weekly', 'mon,wed,fri', consider jsonb for more structure
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);
alter table public.habits enable row level security;
create index ix_habits_user_id on public.habits(user_id);
create index ix_habits_goal_id on public.habits(goal_id);
create trigger handle_updated_at before update on public.habits
  for each row execute procedure public.handle_updated_at();


-- BRAIN DUMP ITEMS Table
create table public.brain_dump_items (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    content text not null check (length(content) > 0),
    processed boolean default false not null, -- Has it been turned into a task/goal/etc.?
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);
alter table public.brain_dump_items enable row level security;
create index ix_brain_dump_items_user_id on public.brain_dump_items(user_id);
create index ix_brain_dump_items_created_at on public.brain_dump_items(created_at desc);
create trigger handle_updated_at before update on public.brain_dump_items
  for each row execute procedure public.handle_updated_at();


-- PROGRESS EVENTS Table (Tracks completion/progress for habits, tasks, maybe goals)
create table public.progress_events (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    habit_id uuid references public.habits(id) on delete cascade,
    task_id uuid references public.tasks(id) on delete cascade,
    goal_id uuid references public.goals(id) on delete cascade,
    event_date date default now() not null,
    notes text,
    value numeric, -- Optional: track quantitative progress (e.g., pages read, minutes exercised)
    created_at timestamptz default now() not null,
    -- Add constraint to ensure at least one link is present if needed
    constraint check_link_present check (habit_id is not null or task_id is not null or goal_id is not null)
);
alter table public.progress_events enable row level security;
create index ix_progress_events_user_id on public.progress_events(user_id);
create index ix_progress_events_habit_id on public.progress_events(habit_id);
create index ix_progress_events_task_id on public.progress_events(task_id);
create index ix_progress_events_goal_id on public.progress_events(goal_id);
create index ix_progress_events_event_date on public.progress_events(event_date desc);
-- No updated_at needed if events are immutable once created


-- NOTIFICATION SETTINGS Table (One row per user)
create table public.notification_settings (
    user_id uuid primary key references auth.users(id) on delete cascade not null,
    email_notifications boolean default true not null,
    push_notifications boolean default false not null, -- Placeholder for future
    reminder_frequency text default 'daily' not null, -- e.g., 'daily', 'weekly', 'never'
    updated_at timestamptz default now() not null -- Only updated_at needed here
);
alter table public.notification_settings enable row level security;
create trigger handle_updated_at before update on public.notification_settings
  for each row execute procedure public.handle_updated_at();

-- RLS Policies (Can be included here or in a separate migration/query)

-- GOALS RLS Policies
create policy "Allow ALL for users based on user_id" on public.goals
  for all -- Applies to SELECT, INSERT, UPDATE, DELETE
  to authenticated -- Only affects logged-in users
  using (auth.uid() = user_id) -- Checks existing rows for SELECT, UPDATE, DELETE
  with check (auth.uid() = user_id); -- Checks new/updated rows for INSERT, UPDATE

-- MILESTONES RLS Policies
create policy "Allow ALL for users based on user_id" on public.milestones
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- TASKS RLS Policies
create policy "Allow ALL for users based on user_id" on public.tasks
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- HABITS RLS Policies
create policy "Allow ALL for users based on user_id" on public.habits
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- BRAIN DUMP ITEMS RLS Policies
create policy "Allow ALL for users based on user_id" on public.brain_dump_items
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- PROGRESS EVENTS RLS Policies
create policy "Allow ALL for users based on user_id" on public.progress_events
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- NOTIFICATION SETTINGS RLS Policies
create policy "Allow ALL for users based on user_id" on public.notification_settings
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
