import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth hook
import { HomeIcon, CheckBadgeIcon, ListBulletIcon, SparklesIcon, InboxStackIcon, ChartBarIcon, CogIcon, UserCircleIcon, CalendarDaysIcon } from '@heroicons/react/24/outline' // Import icons

const Sidebar: React.FC = () => {
  const { session } = useAuth(); // Use the Auth context
  const isAuthenticated = !!session;

  // Sidebar should only be rendered by App.tsx if authenticated,
  // but this check adds an extra layer of safety.
  if (!isAuthenticated) {
    return null;
  }

  const linkClasses = "flex items-center space-x-3 px-3 py-2 rounded-md text-neutral-dark hover:bg-neutral-lighter dark:text-neutral-light dark:hover:bg-neutral-dark hover:text-primary dark:hover:text-primary-light transition-colors duration-150";
  const iconClasses = "h-5 w-5";

  return (
    <aside className="w-64 bg-white dark:bg-neutral-darker p-4 h-full border-r border-neutral-light dark:border-neutral-dark fixed top-16 left-0">
      <nav>
        <ul className="space-y-1">
          <li><Link to="/dashboard" className={linkClasses}><HomeIcon className={iconClasses} /><span>Dashboard</span></Link></li>
          <li><Link to="/goals" className={linkClasses}><CheckBadgeIcon className={iconClasses} /><span>Goals</span></Link></li>
          <li><Link to="/tasks" className={linkClasses}><ListBulletIcon className={iconClasses} /><span>Tasks</span></Link></li>
          <li><Link to="/habits" className={linkClasses}><SparklesIcon className={iconClasses} /><span>Habits</span></Link></li>
          <li><Link to="/calendar" className={linkClasses}><CalendarDaysIcon className={iconClasses} /><span>Calendar</span></Link></li>
          <li><Link to="/brain-dump" className={linkClasses}><InboxStackIcon className={iconClasses} /><span>Brain Dump</span></Link></li>
          <li><Link to="/analytics" className={linkClasses}><ChartBarIcon className={iconClasses} /><span>Analytics</span></Link></li>
          <li><Link to="/settings" className={linkClasses}><CogIcon className={iconClasses} /><span>Settings</span></Link></li>
          <li><Link to="/profile" className={linkClasses}><UserCircleIcon className={iconClasses} /><span>Profile</span></Link></li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar; 