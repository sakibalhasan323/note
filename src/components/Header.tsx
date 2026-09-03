import React, { useRef, useState, useEffect } from 'react';
import { useNotes } from '../context/NotesContext';
import { useAuth } from '../context/AuthContext';
import { useWebsite } from '../context/WebsiteContext';
import { Search, X, Sun, Moon, Menu, RefreshCw, User, Settings, LogOut, LogIn } from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings }) => {
  const {
    searchQuery,
    setSearchQuery,
    theme,
    toggleTheme,
    setIsMobileSidebarOpen,
    reloadNotes,
    isReloading,
  } = useNotes();

  const { currentUser, openAuth, logout } = useAuth();
  const { settings } = useWebsite();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const handleClearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  // Close profile menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Left: Mobile hamburger menu + Website Logo / Name */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            id="mobile-menu-btn"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 select-none">
            {settings.logo ? (
              <img
                src={settings.logo}
                alt={settings.website_name}
                className="w-8 h-8 rounded-lg object-contain"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-base shadow-sm"
                style={{ backgroundColor: settings.primary_color || '#6366f1' }}
              >
                {settings.website_name ? settings.website_name.charAt(0).toUpperCase() : 'N'}
              </div>
            )}
            <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
              {settings.website_name || 'Note'}
            </span>
          </div>
        </div>

        {/* Center: Search Bar (Desktop only - strictly hidden on mobile per requirements) */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative flex items-center w-full h-10 bg-slate-100 dark:bg-slate-800 rounded-[10px] px-3.5 transition-colors focus-within:ring-2 focus-within:ring-indigo-500/30">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-2 shrink-0 pointer-events-none" />
            <input
              ref={searchInputRef}
              id="desktop-global-search"
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-sm w-full text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-md shrink-0"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right Section:
            Desktop: Reload button | Cloud status | Theme toggle | Profile icon (NO username, NO settings icon)
            Mobile: Reload button | Profile avatar
        */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Reload Button (Refreshes data without logging out) */}
          <button
            type="button"
            id="header-reload-btn"
            onClick={reloadNotes}
            title="Reload notes"
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none transition-colors"
            aria-label="Reload notes"
          >
            <RefreshCw className={`w-4 h-4 ${isReloading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          {/* Theme Toggle (Desktop only - on mobile, theme is inside Settings per requirement) */}
          <button
            type="button"
            id="header-theme-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
            className="hidden md:flex p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          {/* Profile Icon / Avatar (NO username displayed per requirements) */}
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              id="header-profile-btn"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              title={currentUser ? `Account: ${currentUser.name}` : 'User profile'}
              className="p-0.5 rounded-full text-slate-600 dark:text-slate-300 hover:ring-2 hover:ring-indigo-500/30 transition-all focus:outline-none cursor-pointer"
              aria-label="Profile"
            >
              {currentUser ? (
                currentUser.photo_url ? (
                  <img
                    src={currentUser.photo_url}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold text-xs flex items-center justify-center shadow-xs">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
              )}
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1.5 z-40 text-sm animate-in fade-in zoom-in-95 duration-100">
                {currentUser ? (
                  <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-700/60">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">
                      {currentUser.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {currentUser.email}
                    </p>
                  </div>
                ) : (
                  <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-700/60">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Not logged in
                    </p>
                  </div>
                )}

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenSettings();
                    }}
                    className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Settings</span>
                  </button>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-700/60 pt-1">
                  {currentUser ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        logout();
                      }}
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        openAuth();
                      }}
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors font-medium cursor-pointer"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Log In</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
