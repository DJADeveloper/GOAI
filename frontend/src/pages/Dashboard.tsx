import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Task, Habit, ProgressEvent, Goal, BrainDumpItem, Milestone } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { FlagIcon, ClipboardIcon, SparklesIcon, ClockIcon, CheckCircleIcon, PlusIcon, CheckIcon, InboxIcon, TrashIcon, CalendarDaysIcon, StarIcon, ExclamationTriangleIcon, ListBulletIcon } from '@heroicons/react/24/outline';
import Modal from '../components/Modal';
import GoalForm from '../components/GoalForm';
import TaskForm from '../components/TaskForm';
import HabitForm from '../components/HabitForm';
import { format } from 'date-fns'; // For date formatting
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js'; // Import Chart.js elements and Bar elements
import { Doughnut, Bar } from 'react-chartjs-2'; // Import Doughnut chart and Bar chart
import { useTheme } from '../context/ThemeContext';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title); // Register elements

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDateString = () => {
  return new Date().toISOString().split('T')[0];
};

// Helper function to check if a task is due today or overdue
const isTaskDueTodayOrOverdue = (task: Task): boolean => {
    if (!task.due_date) return false;
    const dueDate = new Date(task.due_date);
    const today = new Date();
    // Set time to 00:00:00 for comparison to avoid time zone issues affecting the date part
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return dueDate <= today;
};

// Placeholder types for fetched data until full implementation
type GoalProgress = { completed: number; active: number; upcomingDeadlines: Goal[] };
type HabitStreaks = { name: string; streak: number }[];
type TaskCounts = { today: number; upcoming: number; overdue: number };
type RecentActivity = ProgressEvent[]; // Assuming ProgressEvent is suitable

// --- Copy/Adapt Streak Calculation Logic ---
// (Copied from HabitsPage - consider moving to a shared utils file later)
const calculateCurrentStreak = (progressEvents: ProgressEvent[]): number => {
  if (!progressEvents || progressEvents.length === 0) {
    return 0;
  }
  const sortedEvents = [...progressEvents].sort((a, b) => b.event_date.localeCompare(a.event_date));
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let expectedDate = new Date(today);
  const mostRecentEventDate = new Date(sortedEvents[0].event_date + 'T00:00:00Z'); 
  mostRecentEventDate.setUTCHours(0,0,0,0);
  const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const yesterdayUTC = new Date(todayUTC);
  yesterdayUTC.setUTCDate(todayUTC.getUTCDate() - 1);
  if (mostRecentEventDate.getTime() !== todayUTC.getTime() && mostRecentEventDate.getTime() !== yesterdayUTC.getTime()) {
      return 0;
  }
  if (mostRecentEventDate.getTime() === todayUTC.getTime()) {
      streak = 1;
      expectedDate = new Date(yesterdayUTC);
  } else { 
      streak = 1;
      expectedDate = new Date(yesterdayUTC);
      expectedDate.setUTCDate(expectedDate.getUTCDate() - 1); 
  }
  const startIndex = (mostRecentEventDate.getTime() === todayUTC.getTime()) ? 1 : 0;
  for (let i = startIndex; i < sortedEvents.length; i++) {
    const eventDate = new Date(sortedEvents[i].event_date + 'T00:00:00Z');
    eventDate.setUTCHours(0, 0, 0, 0);
    const expectedDateUTC = new Date(Date.UTC(expectedDate.getFullYear(), expectedDate.getMonth(), expectedDate.getDate()));
    if (eventDate.getTime() === expectedDateUTC.getTime()) {
      streak++;
      expectedDate.setUTCDate(expectedDate.getUTCDate() - 1);
    } else {
      break;
    }
  }
  return streak;
};
// -----------------------------------------

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('User'); // Default name
  
  // State for dashboard data
  const [activeGoalCount, setActiveGoalCount] = useState(0);
  const [pendingTaskCount, setPendingTaskCount] = useState(0);
  const [tasksDueToday, setTasksDueToday] = useState<Task[]>([]);
  const [allHabits, setAllHabits] = useState<Habit[]>([]);
  const [completedHabitsToday, setCompletedHabitsToday] = useState<Set<string>>(new Set());
  const [brainDumpItems, setBrainDumpItems] = useState<BrainDumpItem[]>([]);
  const [upcomingMilestones, setUpcomingMilestones] = useState<Milestone[]>([]);
  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);

  // State for Brain Dump Input
  const [brainDumpContent, setBrainDumpContent] = useState('');
  const [savingBrainDump, setSavingBrainDump] = useState(false);
  const [brainDumpError, setBrainDumpError] = useState<string | null>(null);

  // State for Modals
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showHabitModal, setShowHabitModal] = useState(false);

  // State for each widget's data (initialize with defaults or empty)
  const [goalProgress, setGoalProgress] = useState<GoalProgress | null>(null);
  const [habitStreaks, setHabitStreaks] = useState<HabitStreaks | null>(null);
  const [taskCounts, setTaskCounts] = useState<TaskCounts>({ today: 0, upcoming: 0, overdue: 0 });
  const [recentActivity, setRecentActivity] = useState<RecentActivity | null>(null);
  const [brainDumpInput, setBrainDumpInput] = useState('');

  const { theme } = useTheme(); // Get theme context

  // --- Chart Data Preparation ---
  const goalChartData = useMemo(() => {
    return {
      labels: ['Active/Pending', 'Completed'],
      datasets: [
        {
          label: '# of Goals',
          data: [
              goalProgress ? goalProgress.active : 0, 
              goalProgress ? goalProgress.completed : 0
          ],
          backgroundColor: [
            'rgba(59, 130, 246, 0.6)', // Primary color with opacity (Tailwind blue-500)
            'rgba(16, 185, 129, 0.6)', // Secondary color with opacity (Tailwind emerald-500)
          ],
          borderColor: [
            'rgba(59, 130, 246, 1)', // Primary color solid
            'rgba(16, 185, 129, 1)', // Secondary color solid
          ],
          borderWidth: 1,
        },
      ],
    };
  }, [goalProgress, theme]);

  const goalChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
             color: document.documentElement.classList.contains('dark') ? '#F3F4F6' : '#374151', // Use theme colors
             boxWidth: 12,
             padding: 15,
          }
        },
        tooltip: {
          callbacks: {
            label: function(context: any) {
                let label = context.dataset.label || '';
                if (label) {
                    label += ': ';
                }
                if (context.parsed !== null) {
                    label += context.parsed;
                }
                const total = context.dataset.data.reduce((acc: number, data: number) => acc + data, 0);
                const percentage = total > 0 ? Math.round((context.parsed / total) * 100) : 0;
                label += ` (${percentage}%)`;
                return label;
            }
          }
        }
      },
      cutout: '60%', // Make it a Doughnut chart
    };
  }, [theme]);
  // ---------------------------

  // --- Chart Data Preparation (Habit Streaks) ---
  const habitChartData = useMemo(() => {
    return {
      labels: habitStreaks?.map(h => h.name) || [],
      datasets: [
        {
          label: 'Current Streak',
          data: habitStreaks?.map(h => h.streak) || [],
          backgroundColor: 'rgba(245, 158, 11, 0.6)', // Accent color with opacity (Tailwind amber-500)
          borderColor: 'rgba(245, 158, 11, 1)', // Accent color solid
          borderWidth: 1,
        },
      ],
    };
  }, [habitStreaks, theme]);

  const habitChartOptions = useMemo(() => {
    return {
      indexAxis: 'y' as const, // Horizontal bar chart
      responsive: true,
      maintainAspectRatio: false,
      scales: {
         x: {
           beginAtZero: true,
           ticks: {
              stepSize: 1, // Ensure integer ticks for streaks
              color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#6B7280', // Theme ticks
           },
           grid: { color: document.documentElement.classList.contains('dark') ? '#374151' : '#E5E7EB' } // Theme grid
         },
         y: {
           ticks: { color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#6B7280' }, // Theme ticks
           grid: { display: false } // Hide y-axis grid lines
         }
      },
      plugins: {
        legend: {
          display: false, // Hide legend for simplicity
        },
        tooltip: {
          callbacks: {
            label: function(context: any) {
              let label = context.dataset.label || '';
              if (label) { label += ': '; }
              if (context.parsed.x !== null) {
                label += context.parsed.x + (context.parsed.x === 1 ? ' day' : ' days');
              }
              return label;
            }
          }
        }
      },
    };
  }, [theme]);
  // -----------------------------------------

  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setUserName(user.user_metadata.full_name);
    } else if (user?.email) {
      setUserName(user.email.split('@')[0]); // Use part of email if no name
    }

    const fetchDashboardData = async () => {
      if (!user) {
        setError("User not logged in.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // For date comparisons

      try {
        // Fetch all data concurrently
        const [goalsRes, tasksRes, habitsRes, progressEventsRes] = await Promise.all([
          supabase // Fetch Goals for progress/deadlines
            .from('goals')
            .select('id, title, status, due_date')
            .eq('user_id', user.id),
          supabase // Fetch Tasks for counts
            .from('tasks')
            .select('id, title, completed, due_date')
            .eq('user_id', user.id),
          supabase // Fetch Habits names
            .from('habits')
            .select('id, name')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true }), // Keep order consistent
          supabase // Fetch ALL progress events for habits for streak calculation
            .from('progress_events')
            .select('id, habit_id, event_date')
            .eq('user_id', user.id)
            .filter('habit_id', 'not.is', null)
            .order('event_date', { ascending: false })
        ]);

        // --- Process fetched data --- 

        // 1. Goals Data
        if (goalsRes.error) throw goalsRes.error;
        const allGoals = (goalsRes.data as Goal[]) || [];
        const activeGoals = allGoals.filter(g => g.status === 'in_progress' || g.status === 'pending');
        const completedGoalsCount = allGoals.filter(g => g.status === 'completed').length;
        const upcomingDeadlines = allGoals
           .filter(g => g.due_date && new Date(g.due_date) >= today)
           .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
           .slice(0, 3); // Get top 3 upcoming
        setGoalProgress({
           completed: completedGoalsCount, 
           active: activeGoals.length,
           upcomingDeadlines: upcomingDeadlines
        });

        // 2. Tasks Data
        if (tasksRes.error) throw tasksRes.error;
        const allTasks = (tasksRes.data as Task[]) || [];
        let todayCount = 0;
        let upcomingCount = 0;
        let overdueCount = 0;
        allTasks.forEach(task => {
            if (!task.completed) {
                if (task.due_date) {
                   try {
                     const dueDate = new Date(task.due_date);
                     dueDate.setHours(0, 0, 0, 0);
                     if (dueDate.getTime() === today.getTime()) {
                        todayCount++;
                     } else if (dueDate < today) {
                        overdueCount++;
                     } else {
                        upcomingCount++;
                     }
                   } catch (e) { console.error("Error parsing task due date:", task.due_date); }
                } else {
                   upcomingCount++; // Treat tasks without due date as upcoming
                }
            }
        });
        setTaskCounts({ today: todayCount, upcoming: upcomingCount, overdue: overdueCount });

        // 3. Habits Data (Calculate Streaks)
        if (habitsRes.error) throw habitsRes.error;
        if (progressEventsRes.error) throw progressEventsRes.error; // Check progress error
        
        const allHabits = (habitsRes.data as Habit[]) || [];
        const allProgress = (progressEventsRes.data as ProgressEvent[]) || [];

        // Group progress events by habit_id
        const progressByHabit = new Map<string, ProgressEvent[]>();
        allProgress.forEach(event => {
            if (event.habit_id) {
                const list = progressByHabit.get(event.habit_id) || [];
                list.push(event);
                progressByHabit.set(event.habit_id, list);
            }
        });

        // Calculate streak for each habit and sort
        let calculatedStreaks = allHabits.map(habit => ({
           name: habit.name,
           streak: calculateCurrentStreak(progressByHabit.get(habit.id) || [])
        }));

        // Sort by streak descending and take top 5
        calculatedStreaks.sort((a, b) => b.streak - a.streak);
        setHabitStreaks(calculatedStreaks.slice(0, 5)); 

        // 4. Activity Feed Data (Basic) - Assuming this uses the separate recent progress fetch
        // We might need another fetch limited to 10 if we used the full habit progress fetch
        // For now, let's assume the limited fetch for activity is okay. Re-fetch if needed.
        // OR: Filter the `allProgress` array for the activity feed? Needs processing.
        setRecentActivity(allProgress.slice(0, 10)); // Use slice from the full progress for now

      } catch (err: any) {
        console.error("Error fetching dashboard data:", err);
        setError(err.message || "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (loading) {
    return <div className="text-center py-10 text-neutral dark:text-neutral-light">Loading Dashboard...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-danger dark:text-danger-light">Error: {error}</div>;
  }

  // Filter habits that need to be done today (not already completed)
  const habitsToDoToday = allHabits.filter(habit => !completedHabitsToday.has(habit.id));

  // Handle Quick Task Complete
  const handleCompleteTask = async (taskId: string) => {
      try {
          const { error: updateError } = await supabase
              .from('tasks')
              .update({ completed: true, updated_at: new Date().toISOString() })
              .eq('id', taskId);
          
          if (updateError) throw updateError;

          // Optimistically remove from UI
          setTasksDueToday(prev => prev.filter(task => task.id !== taskId));
          setPendingTaskCount(prev => Math.max(0, prev - 1)); // Decrement pending count

      } catch (err: any) {
          console.error("Error completing task:", err);
          // TODO: Show error feedback to user
      }
  };

  // Handle Quick Habit Complete
  const handleCompleteHabit = async (habitId: string) => {
      if (!user) return;
      const today = getTodayDateString();
      try {
           // Create a new progress event
           const newEventData = {
               user_id: user.id,
               habit_id: habitId,
               event_date: today,
           };
           const { data, error: insertError } = await supabase
               .from('progress_events')
               .insert(newEventData)
               .select()
               .single();

           if (insertError) throw insertError;

           if (data) {
               // Optimistically update UI
               setCompletedHabitsToday(prev => new Set(prev).add(habitId));
               // No need to filter habitsToDoToday explicitly, it recalculates on render
           }

      } catch (err: any) {
          console.error("Error completing habit:", err);
          // TODO: Show error feedback to user
      }
  };

  // Handle Brain Dump Submission
  const handleAddBrainDumpItem = async (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    if (!user || !brainDumpContent.trim()) return;

    setSavingBrainDump(true);
    setBrainDumpError(null);
    try {
        const { error: insertError } = await supabase
            .from('brain_dump_items')
            .insert({ 
                content: brainDumpContent.trim(), 
                user_id: user.id, 
                processed: false 
            })
            .select()
            .single();
        
        if (insertError) throw insertError;

        setBrainDumpContent(''); // Clear input on success
        // Optionally show success feedback

    } catch (err: any) {
        console.error("Error adding brain dump item:", err);
        setBrainDumpError(err.message || "Failed to add item.");
    } finally {
        setSavingBrainDump(false);
    }
  };

  // Handle Processing (Placeholder - just removes from list for now)
  const handleProcessBrainDumpItem = async (itemId: string) => {
      try {
        // In future, this would trigger task/goal creation flow
        const { error: updateError } = await supabase
            .from('brain_dump_items')
            .update({ processed: true, updated_at: new Date().toISOString() })
            .eq('id', itemId);
        
        if (updateError) throw updateError;

        setBrainDumpItems(prev => prev.filter(item => item.id !== itemId));
      } catch (err: any) {
          console.error("Error processing brain dump item:", err);
           // TODO: Show error feedback to user
      }
  };

  // Handle Deleting Brain Dump Item
  const handleDeleteBrainDumpItem = async (itemId: string) => {
      if (!window.confirm('Are you sure you want to delete this item?')) return;
      try {
          const { error: deleteError } = await supabase
              .from('brain_dump_items')
              .delete()
              .eq('id', itemId);
          
          if (deleteError) throw deleteError;

          setBrainDumpItems(prev => prev.filter(item => item.id !== itemId));
      } catch (err: any) { 
          console.error("Error deleting brain dump item:", err);
          // TODO: Show error feedback to user
      }
  };

  // Handlers for Modal Forms
  const handleGoalFormSave = (newGoal: Goal) => {
    // Optional: Update goal count optimistically or refetch data
    setActiveGoalCount(prev => prev + 1);
    setShowGoalModal(false); // Close modal
  };

  const handleTaskFormSave = (newTask: Task) => {
    // Optional: Update task count/lists optimistically or refetch data
    setPendingTaskCount(prev => prev + 1);
    if (isTaskDueTodayOrOverdue(newTask)) {
       setTasksDueToday(prev => [...prev, newTask]); // Add to due list if applicable
    }
    setShowTaskModal(false); // Close modal
  };

  const handleHabitFormSave = (newHabit: Habit) => {
    // Optional: Update habit lists optimistically or refetch data
    setAllHabits(prev => [...prev, newHabit]);
    setShowHabitModal(false); // Close modal
  };

  const handleModalCancel = () => {
    setShowGoalModal(false);
    setShowTaskModal(false);
    setShowHabitModal(false);
  };

  const cardBaseStyle = "bg-white dark:bg-neutral-dark rounded-2xl shadow p-4 sm:p-6"; // Base style for all cards
  const headingStyle = "text-xl font-semibold text-neutral-darker dark:text-white mb-4";

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className={`${cardBaseStyle} bg-gradient-to-r from-primary dark:from-primary-dark to-secondary dark:to-secondary-dark text-white`}>
        <h1 className="text-2xl font-bold mb-1">Good {getGreetingTime()}, {userName}!</h1>
        <p className="text-primary-text dark:text-secondary-text opacity-90">Today is {format(new Date(), 'EEEE, MMMM do')}. Let's make progress!</p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6"> {/* 12-column grid with 1rem gap (gap-6 = 1.5rem, adjust if needed) */} 
        
        {/* Goals Progress Card (4 cols) */}
        <div className={`md:col-span-4 ${cardBaseStyle} flex flex-col`}> {/* Use flex-col */} 
          <h2 className={headingStyle}>Goals Progress</h2>
          <div className="relative h-48 mb-4"> {/* Chart container */} 
             {goalProgress && (goalProgress.active + goalProgress.completed > 0) ? (
                <Doughnut data={goalChartData} options={goalChartOptions} />
             ) : (
                <p className="text-center text-neutral dark:text-neutral-light mt-16">No goal data available.</p>
             )}
          </div>
          <div className="mt-auto"> {/* Push deadlines to bottom */} 
             <h3 className="text-sm font-medium text-neutral-dark dark:text-neutral-light mb-2 border-t border-neutral-light dark:border-neutral-dark pt-3">Upcoming Deadlines:</h3>
             {goalProgress && goalProgress.upcomingDeadlines.length > 0 ? (
                <ul className="space-y-1 text-xs">
                   {goalProgress.upcomingDeadlines.map(goal => (
                      <li key={goal.id} className="flex justify-between items-center">
                         <Link to={`/goals/${goal.id}`} className="text-primary hover:underline truncate mr-2">{goal.title}</Link>
                         <span className="text-neutral dark:text-neutral-light flex-shrink-0">{format(new Date(goal.due_date!), 'MMM d')}</span>
                      </li>
                   ))}
                </ul>
             ) : (
                <p className="text-xs text-neutral dark:text-neutral-light italic">No upcoming deadlines.</p>
             )}
          </div>
        </div>

        {/* Habits Streak Card (4 cols) */}
        <div className={`md:col-span-4 ${cardBaseStyle} flex flex-col`}> {/* Use flex-col */} 
          <h2 className={headingStyle}>Habit Streaks</h2>
          <div className="relative h-48 mb-4"> {/* Chart container */} 
             {habitStreaks && habitStreaks.length > 0 ? (
                <Bar data={habitChartData} options={habitChartOptions} />
             ) : (
                <p className="text-center text-neutral dark:text-neutral-light mt-16">No habit data available or no streaks yet.</p>
             )}
          </div>
           {/* TODO: Add Badges based on streaks below */}
          <div className="mt-auto pt-3 border-t border-neutral-light dark:border-neutral-dark"> 
             <p className="text-xs text-neutral dark:text-neutral-light italic">Showing top {habitStreaks?.length || 0} habits by current streak.</p>
          </div>
        </div>

        {/* Tasks Overview Card - md:col-span-4 */}
        <div className={`md:col-span-4 ${cardBaseStyle}`}>
          <h2 className={headingStyle}>Tasks Overview</h2>
          {taskCounts.today === 0 && taskCounts.upcoming === 0 && taskCounts.overdue === 0 ? (
            <p className="text-neutral dark:text-neutral-light">No pending tasks found.</p>
          ) : (
            <div className="space-y-3">
              {/* Tasks Due Today */}
              <div className="flex items-center justify-between">
                <div className="flex items-center text-neutral-dark dark:text-neutral-light">
                  <ClockIcon className="h-5 w-5 mr-2 text-blue-500" />
                  <span>Due Today</span>
                </div>
                <span className="font-semibold text-lg text-neutral-darker dark:text-white">{taskCounts.today}</span>
              </div>
              {/* Overdue Tasks */}
              <div className="flex items-center justify-between">
                <div className="flex items-center text-neutral-dark dark:text-neutral-light">
                   <ExclamationTriangleIcon className={`h-5 w-5 mr-2 ${taskCounts.overdue > 0 ? 'text-danger' : 'text-neutral'}`} />
                   <span>Overdue</span>
                </div>
                 <span className={`font-semibold text-lg ${taskCounts.overdue > 0 ? 'text-danger dark:text-danger-light' : 'text-neutral-darker dark:text-white'}`}>
                    {taskCounts.overdue}
                 </span>
              </div>
              {/* Upcoming Tasks */}
              <div className="flex items-center justify-between">
                <div className="flex items-center text-neutral-dark dark:text-neutral-light">
                  <CalendarDaysIcon className="h-5 w-5 mr-2 text-gray-500" />
                  <span>Upcoming</span>
                </div>
                <span className="font-semibold text-lg text-neutral-darker dark:text-white">{taskCounts.upcoming}</span>
              </div>
            </div>
          )}
           {/* Link to Tasks Page */}
           <div className="mt-4 pt-3 border-t border-neutral-light dark:border-neutral-dark">
              <Link to="/tasks" className="text-sm font-medium text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary">
                 View All Tasks &rarr;
              </Link>
           </div>
        </div>

        {/* Brain Dump Quick Entry (6 cols) */}
        <div className={`md:col-span-6 ${cardBaseStyle}`}>
          <h2 className={headingStyle}>Quick Brain Dump</h2>
           {/* TODO: Add Textarea and Toggle */} 
           <textarea 
              placeholder="What's on your mind?" 
              rows={3}
              className="w-full p-2 border border-neutral-light dark:border-neutral-dark rounded-md bg-neutral-lighter dark:bg-neutral-darker focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-primary-light text-neutral-darker dark:text-white mb-2"
           />
           <button className="btn btn-secondary btn-sm">Save to Dump</button> {/* Placeholder button */} 
        </div>

        {/* Activity Feed (6 cols) */}
        <div className={`md:col-span-6 ${cardBaseStyle}`}>
          <h2 className={headingStyle}>Recent Activity</h2>
           {/* TODO: Add Activity List */} 
          <p className="text-neutral dark:text-neutral-light text-sm">Activity feed coming soon...</p>
        </div>

        {/* Predictive Forecast (12 cols) */}
        {/* <div className={`md:col-span-12 ${cardBaseStyle}`}>
          <h2 className={headingStyle}>Forecast</h2>
          <p className="text-neutral dark:text-neutral-light text-sm">Predictive chart coming soon...</p>
        </div> */}
        {/* Commented out Forecast for now until data is ready */}

      </div>

      {/* Summary Section - Themed Styling with Dark Mode */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card Base Styles: bg-white dark:bg-neutral-dark border border-neutral-light dark:border-neutral-dark */}
        {/* Active Goals Card */}
        <div className="p-6 bg-white dark:bg-neutral-dark rounded-lg shadow-md border border-neutral-light dark:border-neutral-dark flex items-center space-x-4">
            <FlagIcon className="h-10 w-10 text-primary" />
            <div>
                <h2 className="text-lg font-semibold text-neutral-dark dark:text-neutral-light">Active Goals</h2>
                <p className="text-3xl font-bold text-neutral-darker dark:text-white">{activeGoalCount}</p>
                <Link to="/goals" className="text-sm text-primary hover:text-primary-dark dark:hover:text-primary-light hover:underline mt-1">View Goals &rarr;</Link>
            </div>
        </div>
        {/* Pending Tasks Card */}
        <div className="p-6 bg-white dark:bg-neutral-dark rounded-lg shadow-md border border-neutral-light dark:border-neutral-dark flex items-center space-x-4">
            <ClipboardIcon className="h-10 w-10 text-accent" />
            <div>
                <h2 className="text-lg font-semibold text-neutral-dark dark:text-neutral-light">Pending Tasks</h2>
                <p className="text-3xl font-bold text-neutral-darker dark:text-white">{pendingTaskCount}</p>
                <Link to="/tasks" className="text-sm text-accent hover:text-accent-dark dark:hover:text-accent-light hover:underline mt-1">View Tasks &rarr;</Link>
            </div>
        </div>
        {/* Habits Today Card */}
        <div className="p-6 bg-white dark:bg-neutral-dark rounded-lg shadow-md border border-neutral-light dark:border-neutral-dark flex items-center space-x-4">
            <SparklesIcon className="h-10 w-10 text-secondary" />
            <div>
                <h2 className="text-lg font-semibold text-neutral-dark dark:text-neutral-light">Habits Remaining Today</h2>
                <p className="text-3xl font-bold text-neutral-darker dark:text-white">{habitsToDoToday.length}<span className="text-xl font-normal text-neutral dark:text-neutral-light"> / {allHabits.length}</span></p>
                <Link to="/habits" className="text-sm text-secondary hover:text-secondary-dark dark:hover:text-secondary-light hover:underline mt-1">View Habits &rarr;</Link>
            </div>
        </div>
      </section>

      {/* Quick Add & Brain Dump Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Add Buttons - Updated to open modals */}
          <div className="p-4 bg-white dark:bg-neutral-dark rounded-lg shadow border border-neutral-light dark:border-neutral-dark">
              <h3 className="text-lg font-semibold text-neutral-dark dark:text-neutral-light mb-3">Quick Add</h3>
              <div className="flex flex-wrap gap-2">
                  <button onClick={() => setShowGoalModal(true)} className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md shadow-sm bg-primary text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-dark focus:ring-primary">
                      <PlusIcon className="-ml-0.5 mr-1.5 h-4 w-4" /> New Goal
                  </button>
                   <button onClick={() => setShowTaskModal(true)} className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md shadow-sm bg-accent text-white hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-dark focus:ring-accent">
                      <PlusIcon className="-ml-0.5 mr-1.5 h-4 w-4" /> New Task
                  </button>
                   <button onClick={() => setShowHabitModal(true)} className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md shadow-sm bg-secondary text-white hover:bg-secondary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-dark focus:ring-secondary">
                      <PlusIcon className="-ml-0.5 mr-1.5 h-4 w-4" /> New Habit
                  </button>
              </div>
          </div>
          {/* Brain Dump Input */}
           <div className="p-4 bg-white dark:bg-neutral-dark rounded-lg shadow border border-neutral-light dark:border-neutral-dark">
              <h3 className="text-lg font-semibold text-neutral-dark dark:text-neutral-light mb-3">Quick Dump</h3>
              <form onSubmit={handleAddBrainDumpItem} className="flex items-start space-x-2">
                    <textarea
                        value={brainDumpContent}
                        onChange={(e) => setBrainDumpContent(e.target.value)}
                        placeholder="Capture a quick thought..."
                        rows={1} // Start small, potentially expand on focus/typing
                        className="flex-grow p-2 border border-neutral-light dark:border-neutral-dark rounded-md shadow-sm bg-white dark:bg-neutral-darker focus:outline-none focus:ring-primary dark:focus:ring-primary-light focus:border-primary dark:focus:border-primary-light text-neutral-darker dark:text-white resize-none text-sm" // Added text-sm
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault(); 
                                handleAddBrainDumpItem(); 
                            }
                        }}
                    />
                    <button 
                        type="submit" 
                        disabled={savingBrainDump || !brainDumpContent.trim()}
                        className="px-3 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-dark focus:ring-primary disabled:opacity-50 whitespace-nowrap"
                    >
                        {savingBrainDump ? 'Adding...' : 'Add'}
                    </button>
              </form>
              {brainDumpError && <p className="text-xs text-danger dark:text-danger-light mt-1">{brainDumpError}</p>}
           </div>
      </section>

      {/* Today's Focus Section - Changed to 3 columns */}
      <section>
        <h2 className="text-2xl font-semibold text-neutral-darker dark:text-neutral-lighter mb-5 border-b border-neutral-light dark:border-neutral-dark pb-2">Today's Focus & Inbox</h2>
        
        {/* Updated grid to 3 columns on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tasks Due Column */}
            <div className="space-y-4">
                <h3 className="text-xl font-semibold text-neutral-dark dark:text-neutral-light flex items-center">
                    <ClockIcon className="h-6 w-6 mr-2 text-danger" /> 
                    Tasks Due
                </h3>
                {tasksDueToday.length > 0 ? (
                    <ul className="space-y-3">
                        {tasksDueToday.map(task => (
                        <li key={task.id} className="p-4 bg-white dark:bg-neutral-dark rounded-lg shadow border border-neutral-light dark:border-neutral-dark hover:shadow-md transition-shadow duration-200 flex justify-between items-center">
                             {/* Task Info */}
                            <div className="flex-grow mr-4">
                                <Link to={`/tasks#task-${task.id}`} className="text-primary hover:text-primary-dark dark:hover:text-primary-light font-medium block mb-1">{task.title}</Link>
                                {task.description && <p className="text-sm text-neutral dark:text-neutral-light mb-1">{task.description}</p>}
                                {task.due_date && <p className="text-xs text-danger dark:text-danger-light font-medium">Due: {new Date(task.due_date).toLocaleString()}</p>}
                            </div>
                            {/* Quick Complete Button */}
                            <button 
                                onClick={() => handleCompleteTask(task.id)}
                                title="Mark as complete"
                                className="flex-shrink-0 p-1.5 rounded-full text-neutral hover:text-secondary hover:bg-secondary-text dark:text-neutral-light dark:hover:text-white dark:hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-dark focus:ring-secondary"
                            >
                                <CheckIcon className="h-5 w-5" />
                            </button>
                        </li> 
                        ))}
                    </ul>
                ) : (
                    <div className="p-4 bg-neutral-lighter dark:bg-neutral-dark rounded-lg border border-neutral-light dark:border-neutral-dark text-center text-neutral dark:text-neutral-light">
                        No tasks due today or overdue!
                    </div>
                )}
            </div>

            {/* Habits Column */}
            <div className="space-y-4">
                <h3 className="text-xl font-semibold text-neutral-dark dark:text-neutral-light flex items-center">
                   <CheckCircleIcon className="h-6 w-6 mr-2 text-secondary" /> 
                   Habits to Complete
                </h3>
                {habitsToDoToday.length > 0 ? (
                    <ul className="space-y-3">
                        {habitsToDoToday.map(habit => (
                            <li key={habit.id} className="p-4 bg-white dark:bg-neutral-dark rounded-lg shadow border border-neutral-light dark:border-neutral-dark hover:shadow-md transition-shadow duration-200 flex justify-between items-center">
                                {/* Habit Info */}
                                <div className="flex-grow mr-4">
                                    <Link to={`/habits#habit-${habit.id}`} className="text-primary hover:text-primary-dark dark:hover:text-primary-light font-medium block mb-1">{habit.name}</Link>
                                    {habit.description && <p className="text-sm text-neutral dark:text-neutral-light">{habit.description}</p>}
                                </div>
                                {/* Quick Complete Button */}
                                <button 
                                    onClick={() => handleCompleteHabit(habit.id)}
                                    title="Mark as done today"
                                    className="flex-shrink-0 p-1.5 rounded-full text-neutral hover:text-secondary hover:bg-secondary-text dark:text-neutral-light dark:hover:text-white dark:hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-dark focus:ring-secondary"
                                >
                                    <CheckIcon className="h-5 w-5" />
                                </button>
                            </li> 
                        ))}
                    </ul>
                ) : (
                    <div className="p-4 bg-secondary-text dark:bg-neutral-dark rounded-lg border border-secondary-light dark:border-neutral-dark text-center text-secondary-dark dark:text-secondary-light">
                        All habits completed for today! Great job!
                    </div>
                )}
            </div>

            {/* Brain Dump Inbox Column */}
            <div className="space-y-4">
                <h3 className="text-xl font-semibold text-neutral-dark dark:text-neutral-light flex items-center">
                   <InboxIcon className="h-6 w-6 mr-2 text-blue-500" /> 
                   Brain Dump Inbox
                </h3>
                {brainDumpItems.length > 0 ? (
                    <ul className="space-y-3">
                        {brainDumpItems.map(item => (
                            <li key={item.id} className="p-4 bg-white dark:bg-neutral-dark rounded-lg shadow border border-neutral-light dark:border-neutral-dark hover:shadow-md transition-shadow duration-200 flex justify-between items-center">
                                {/* Item Content */}
                                <p className="text-sm text-neutral-darker dark:text-white flex-grow mr-2 whitespace-pre-wrap">{item.content}</p>
                                {/* Action Buttons */}
                                <div className="flex-shrink-0 flex items-center space-x-1.5">
                                    <button 
                                        onClick={() => handleProcessBrainDumpItem(item.id)}
                                        title="Process Item (Mark as Done)"
                                        className="p-1 rounded-full text-neutral hover:text-secondary hover:bg-secondary-text dark:text-neutral-light dark:hover:text-white dark:hover:bg-secondary focus:outline-none focus:ring-1 focus:ring-offset-1 dark:focus:ring-offset-neutral-dark focus:ring-secondary"
                                    >
                                        <CheckIcon className="h-4 w-4" />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteBrainDumpItem(item.id)}
                                        title="Delete Item"
                                        className="p-1 rounded-full text-neutral hover:text-danger hover:bg-danger-text dark:text-neutral-light dark:hover:text-white dark:hover:bg-danger focus:outline-none focus:ring-1 focus:ring-offset-1 dark:focus:ring-offset-neutral-dark focus:ring-danger"
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </li> 
                        ))}
                    </ul>
                ) : (
                    <div className="p-4 bg-neutral-lighter dark:bg-neutral-dark rounded-lg border border-neutral-light dark:border-neutral-dark text-center text-neutral dark:text-neutral-light">
                        Brain dump inbox is empty.
                    </div>
                )}
            </div>
        </div>
      </section>

      {/* --- NEW: Daily Goal Review Section --- */}
      <section>
         <h2 className="text-2xl font-semibold text-neutral-darker dark:text-neutral-lighter mb-5 border-b border-neutral-light dark:border-neutral-dark pb-2 flex items-center">
            <StarIcon className="h-6 w-6 mr-2 text-yellow-500" />
            Daily Goal Review
         </h2>
         <div className="space-y-3">
            {activeGoals.length > 0 ? (
               <ul className="space-y-3">
                  {activeGoals.map(goal => (
                     <li key={goal.id} className="p-4 bg-white dark:bg-neutral-dark rounded-lg shadow border border-neutral-light dark:border-neutral-dark hover:shadow-md transition-shadow duration-200 flex justify-between items-center">
                        <Link to={`/goals/${goal.id}`} className="text-lg font-medium text-primary hover:text-primary-dark dark:hover:text-primary-light flex-grow mr-4">
                           {goal.title}
                        </Link>
                        <span
                           className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                              goal.status === 'in_progress' 
                                 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                 : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' // Pending or other
                           }`}
                        >
                           {goal.status.replace('_', ' ')}
                        </span>
                     </li>
                  ))}
               </ul>
            ) : (
               <div className="p-4 bg-neutral-lighter dark:bg-neutral-dark rounded-lg border border-neutral-light dark:border-neutral-dark text-center text-neutral dark:text-neutral-light">
                  No active goals to review. Create some goals first!
               </div>
            )}
         </div>
      </section>

      {/* Upcoming Milestones Section */}
      <section>
        <h2 className="text-2xl font-semibold text-neutral-darker dark:text-neutral-lighter mb-5 border-b border-neutral-light dark:border-neutral-dark pb-2">Upcoming Milestones</h2>
        <div className="space-y-3">
          {upcomingMilestones.length > 0 ? (
            <ul className="space-y-3">
              {upcomingMilestones.map(milestone => (
                <li key={milestone.id} className="p-4 bg-white dark:bg-neutral-dark rounded-lg shadow border border-neutral-light dark:border-neutral-dark hover:shadow-md transition-shadow duration-200">
                  <div className="flex justify-between items-center">
                    <div className="flex-grow mr-4">
                       <Link to={`/goals/${milestone.goal_id}#milestone-${milestone.id}`} className="text-primary hover:text-primary-dark dark:hover:text-primary-light font-medium block mb-1">{milestone.title}</Link>
                       {milestone.goals?.title && (
                          <p className="text-xs text-neutral dark:text-neutral-light mb-1">
                              Goal: <span className="italic">{milestone.goals.title}</span>
                          </p>
                       )}
                       {milestone.due_date && (
                          <p className="text-xs text-accent dark:text-accent-light font-medium flex items-center">
                             <CalendarDaysIcon className="h-3.5 w-3.5 mr-1 inline-block" /> 
                             Due: {new Date(milestone.due_date).toLocaleDateString()}
                          </p>
                        )}
                    </div>
                    {/* Add quick complete button later if desired */}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 bg-neutral-lighter dark:bg-neutral-dark rounded-lg border border-neutral-light dark:border-neutral-dark text-center text-neutral dark:text-neutral-light">
               No upcoming milestones found.
            </div>
          )}
           {activeGoalCount > 0 && upcomingMilestones.length > 0 && (
               <div className="text-right mt-2">
                 <Link to="/goals" className="text-sm text-primary hover:text-primary-dark dark:hover:text-primary-light hover:underline">View All Goals & Milestones &rarr;</Link>
               </div>
           )}
        </div>
      </section>

      {/* --- Modals --- */}
      {/* Goal Modal */}
      <Modal isOpen={showGoalModal} onClose={handleModalCancel} title="Create New Goal">
          <GoalForm 
              onSave={handleGoalFormSave} 
              onCancel={handleModalCancel} 
          />
      </Modal>

      {/* Task Modal */}
      <Modal isOpen={showTaskModal} onClose={handleModalCancel} title="Create New Task">
          <TaskForm 
              onSave={handleTaskFormSave} 
              onCancel={handleModalCancel} 
          />
      </Modal>

      {/* Habit Modal */}
      <Modal isOpen={showHabitModal} onClose={handleModalCancel} title="Create New Habit">
          <HabitForm 
              onSave={handleHabitFormSave} 
              onCancel={handleModalCancel} 
          />
      </Modal>

    </div>
  );
};

// Helper function for greeting
const getGreetingTime = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 18) return 'Afternoon';
  return 'Evening';
};

export default DashboardPage; 