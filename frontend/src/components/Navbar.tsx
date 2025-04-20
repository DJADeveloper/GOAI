import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth hook
import { useTheme } from '../context/ThemeContext'; // Import useTheme hook
import { SunIcon, MoonIcon } from '@heroicons/react/24/solid'; // Import icons for toggle

// Mock auth state - replace with actual auth context later
// const isAuthenticated = false; // REMOVE MOCK STATE

const Navbar: React.FC = () => {
  const { session, logout, loading } = useAuth(); // Use the Auth context
  const { theme, toggleTheme } = useTheme(); // Use the Theme context
  const isAuthenticated = !!session;

  const handleLogout = async () => {
    try {
      await logout();
      // Navigation usually handled by onAuthStateChange listener in context/App
    } catch (error) {
      console.error('Logout failed:', error);
      // Optionally show an error to the user
    }
  };

  // Avoid rendering auth-dependent parts until loading is finished
  // Although App.tsx handles global loading, this can prevent brief flashes
  if (loading && !session) { 
    // Only show minimal navbar if loading and no session yet
     return (
      <nav className="bg-gray-800 text-white p-4 fixed top-0 left-0 w-full z-10">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-xl font-bold">GOAI</Link>
          <div>{/* Placeholder while loading */}</div>
        </div>
      </nav>
     )
  }

  return (
    <nav className="bg-neutral-darker text-primary-text p-4 fixed top-0 left-0 w-full z-10 border-b border-neutral-dark">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-bold">GOAI</Link>
        <div className="flex items-center space-x-4">
          {/* Theme Toggle Button */}
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-neutral-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-darker focus:ring-primary"
          >
            {theme === 'light' ? (
              <MoonIcon className="h-5 w-5 text-primary-light" />
            ) : (
              <SunIcon className="h-5 w-5 text-yellow-300" /> 
            )}
          </button>

          {/* Auth Links/Button */}
          {isAuthenticated ? (
            <>
              {/* Optionally display user email/name */}
              {/* <span className="mr-4">{session.user.email}</span> */} 
              <button onClick={handleLogout} className="ml-4 hover:text-gray-300">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-neutral-light">Login</Link>
              <Link to="/register" className="hover:text-neutral-light">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 