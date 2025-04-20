import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Task, Habit, ProgressEvent, Goal, BrainDumpItem, Milestone } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { FlagIcon, ClipboardIcon, SparklesIcon, ClockIcon, CheckCircleIcon, PlusIcon, CheckIcon, InboxIcon, TrashIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import Modal from '../components/Modal';
import GoalForm from '../components/GoalForm';
import TaskForm from '../components/TaskForm';
import HabitForm from '../components/HabitForm';

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

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for dashboard data
  const [activeGoalCount, setActiveGoalCount] = useState(0);
  const [pendingTaskCount, setPendingTaskCount] = useState(0);
  const [tasksDueToday, setTasksDueToday] = useState<Task[]>([]);
  const [allHabits, setAllHabits] = useState<Habit[]>([]);
  const [completedHabitsToday, setCompletedHabitsToday] = useState<Set<string>>(new Set());
  const [brainDumpItems, setBrainDumpItems] = useState<BrainDumpItem[]>([]);
  const [upcomingMilestones, setUpcomingMilestones] = useState<Milestone[]>([]);

  // State for Brain Dump Input
  const [brainDumpContent, setBrainDumpContent] = useState('');
  const [savingBrainDump, setSavingBrainDump] = useState(false);
  const [brainDumpError, setBrainDumpError] = useState<string | null>(null);

  // State for Modals
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showHabitModal, setShowHabitModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      if (!user) {
        setError("User not logged in.");
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      const today = getTodayDateString();

      try {
        // Fetch data concurrently
        const [goalsRes, tasksRes, habitsRes, progressRes, brainDumpRes, milestonesRes] = await Promise.all([
          supabase
            .from('goals')
            .select('id', { count: 'exact', head: true }) // Only count active goals
            .eq('user_id', user.id)
            .in('status', ['pending', 'in_progress']),
          supabase
            .from('tasks')
            .select('*') // Fetch all fields for filtering due dates
            .eq('user_id', user.id)
            .eq('completed', false), // Only pending tasks
          supabase
            .from('habits')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true }),
          supabase
            .from('progress_events')
            .select('habit_id') // Only need habit_id
            .eq('user_id', user.id)
            .eq('event_date', today)
            .filter('habit_id', 'not.is', null), // Ensure habit_id is not null
          supabase // Fetch unprocessed brain dump items
            .from('brain_dump_items')
            .select('*')
            .eq('user_id', user.id)
            .eq('processed', false)
            .order('created_at', { ascending: true }),
          supabase // Fetch upcoming milestones with goal title - Fetch all fields now
            .from('milestones')
            .select(`
              *,
              goals ( title )
            `)
            .eq('user_id', user.id)
            .eq('completed', false)
            .not('due_date', 'is', null) // Only those with due dates
            .order('due_date', { ascending: true })
            .limit(5) // Limit to a reasonable number for the dashboard
        ]);

        // Only update state if the component is still mounted
        if (isMounted) {
           // Process Goals Response
           if (goalsRes.error) throw goalsRes.error;
           setActiveGoalCount(goalsRes.count ?? 0);

           // Process Tasks Response
           if (tasksRes.error) throw tasksRes.error;
           const pendingTasks = (tasksRes.data as Task[]) || [];
           setPendingTaskCount(pendingTasks.length);
           setTasksDueToday(pendingTasks.filter(isTaskDueTodayOrOverdue));

           // Process Habits Response
           if (habitsRes.error) throw habitsRes.error;
           setAllHabits((habitsRes.data as Habit[]) || []);

           // Process Progress Events Response
           if (progressRes.error) throw progressRes.error;
           const completedIds = new Set<string>();
           progressRes.data?.forEach(event => {
             if (event.habit_id) {
               completedIds.add(event.habit_id);
             }
           });
           setCompletedHabitsToday(completedIds);

           // Process Brain Dump Response
           if (brainDumpRes.error) throw brainDumpRes.error;
           setBrainDumpItems((brainDumpRes.data as BrainDumpItem[]) || []);

           // Process Milestones Response
           if (milestonesRes.error) throw milestonesRes.error;
           // Ensure data matches Milestone type structure, especially the nested goals object
           setUpcomingMilestones((milestonesRes.data as Milestone[]) || []); 
        }

      } catch (err: any) {
        console.error("Error fetching dashboard data:", err);
         if (isMounted) {
            setError(err.message || "Failed to load dashboard data.");
         }
      } finally {
         if (isMounted) {
            setLoading(false);
         }
      }
    };

    fetchData();

    return () => { isMounted = false };
  }, [user]);

  if (loading) {
    return null;
  }

  if (error) {
    return <p className="text-danger">Error: {error}</p>;
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

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-neutral-darker dark:text-neutral-lighter">Dashboard</h1>

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
           {/* Link to Goals page for full view? */} 
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

export default DashboardPage; 