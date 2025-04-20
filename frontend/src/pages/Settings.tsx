import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { SunIcon, MoonIcon } from '@heroicons/react/24/solid';

const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-neutral-darker dark:text-neutral-lighter">Settings</h1>

      {/* Appearance Settings Section */}
      <div className="p-6 bg-white dark:bg-neutral-dark rounded-lg shadow border border-neutral-light dark:border-neutral-dark">
        <h2 className="text-xl font-semibold mb-4 text-neutral-darker dark:text-white">Appearance</h2>
        <div className="flex items-center justify-between">
          <p className="text-neutral-dark dark:text-neutral-light">
            Current Theme: <span className="font-medium capitalize">{theme}</span>
          </p>
          <button 
            onClick={toggleTheme}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-dark bg-primary text-white hover:bg-primary-dark focus:ring-primary"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <MoonIcon className="h-5 w-5 mr-2" />
            ) : (
              <SunIcon className="h-5 w-5 mr-2" /> 
            )}
            Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
          </button>
        </div>
      </div>

      {/* Placeholder for Notification Settings - Could fetch/update via API/Supabase later */}
      {/* 
      <div className="p-6 bg-white dark:bg-neutral-dark rounded-lg shadow border border-neutral-light dark:border-neutral-dark">
        <h2 className="text-xl font-semibold mb-4 text-neutral-darker dark:text-white">Notifications</h2>
        </div> 
      */}

      {/* Placeholder for Account Settings */}
      {/* 
      <div className="p-6 bg-white dark:bg-neutral-dark rounded-lg shadow border border-neutral-light dark:border-neutral-dark">
        <h2 className="text-xl font-semibold mb-4 text-neutral-darker dark:text-white">Account</h2>
         </div> 
      */}

    </div>
  );
};

export default SettingsPage; 