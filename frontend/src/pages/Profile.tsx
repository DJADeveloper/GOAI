import React from 'react';
import { useAuth } from '../context/AuthContext';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-neutral-darker dark:text-neutral-lighter">Profile</h1>
      
      <div className="p-6 bg-white dark:bg-neutral-dark rounded-lg shadow border border-neutral-light dark:border-neutral-dark">
        <h2 className="text-xl font-semibold mb-4 text-neutral-darker dark:text-white">User Information</h2>
        {user ? (
          <div className="space-y-2">
            <p className="text-neutral-dark dark:text-neutral-light">
              <strong className="font-medium text-neutral-darker dark:text-white">Email:</strong> {user.email}
            </p>
            {/* Add more profile fields here as needed */}
            {/* Example: <p><strong>Username:</strong> {user.user_metadata?.username || 'Not set'}</p> */}
          </div>
        ) : (
          <p className="text-neutral dark:text-neutral-light">Loading user information...</p>
        )}
      </div>

      {/* Placeholder for future profile editing/actions */}
      {/* <div className="p-6 bg-white dark:bg-neutral-dark rounded-lg shadow border border-neutral-light dark:border-neutral-dark">
        <h2 className="text-xl font-semibold mb-4 text-neutral-darker dark:text-white">Actions</h2>
        <button className="btn btn-primary">Edit Profile</button> 
      </div> */}
    </div>
  );
};

export default ProfilePage; 