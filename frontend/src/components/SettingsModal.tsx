import React from 'react';
import { useNotes } from '../context/NotesContext';
import { useAuth } from '../context/AuthContext';
import { NoteColor, ThemePreference } from '../types';
import { ColorPicker } from './ColorPicker';
import { X, Sun, Moon, Laptop, LogOut, User, Palette, PlusCircle, Maximize2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    counts,
    themePreference,
    setThemePreference,
    userSettings,
    updateUserSettings,
  } = useNotes();
  const { currentUser, logout, openAuth } = useAuth();

  if (!isOpen) return null;

  const handleDefaultColorChange = (c: NoteColor) => {
    updateUserSettings({ defaultColor: c });
  };

  const handleToggleFloatingButton = (active: boolean) => {
    updateUserSettings({ floating_add_button_enabled: active });
  };

  const handleToggleExpandByDefault = (active: boolean) => {
    updateUserSettings({ expand_notes_by_default: active });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="hidden sm:block fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="relative w-full sm:max-w-md sm:rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl z-10 p-6 animate-in zoom-in-95 duration-150 min-h-screen sm:min-h-0 sm:max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <h2 id="settings-title" className="text-lg font-bold text-slate-800 dark:text-slate-100">
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-6">
          {/* Appearance: Light / Dark / System */}
          <div>
            <div className="mb-2">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Appearance</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose light, dark, or automatic system theme
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setThemePreference('light')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  themePreference === 'light'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Light</span>
              </button>

              <button
                type="button"
                onClick={() => setThemePreference('dark')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  themePreference === 'dark'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>Dark</span>
              </button>

              <button
                type="button"
                onClick={() => setThemePreference('system')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  themePreference === 'system'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Laptop className="w-4 h-4" />
                <span>System</span>
              </button>
            </div>
          </div>

          {/* Floating Add Note Button Control */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Floating Add Note Button
                </p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Quick creation button in the bottom corner
              </p>
            </div>

            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => handleToggleFloatingButton(true)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  userSettings.floating_add_button_enabled
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => handleToggleFloatingButton(false)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  !userSettings.floating_add_button_enabled
                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Inactive
              </button>
            </div>
          </div>

          {/* Open notes in Expanded view by default */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-1.5">
                <Maximize2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Open notes expanded
                </p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Always open notes in expanded view
              </p>
            </div>

            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => handleToggleExpandByDefault(true)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  userSettings.expand_notes_by_default
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => handleToggleExpandByDefault(false)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  !userSettings.expand_notes_by_default
                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Inactive
              </button>
            </div>
          </div>

          {/* Default note color */}
          {/* Default note color */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Default Note Color
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  New notes will start with this card color
                </p>
              </div>
              <Palette className="w-4 h-4 text-slate-400" />
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center">
              <ColorPicker
                selectedColor={userSettings.defaultColor}
                onSelectColor={handleDefaultColorChange}
              />
            </div>
          </div>

          {/* Account setting */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">Account</p>
            {currentUser ? (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {currentUser.photo_url ? (
                    <img src={currentUser.photo_url} alt={currentUser.name} referrerPolicy="no-referrer" className="w-9 h-9 rounded-full border border-indigo-200 object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                      {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                      {currentUser.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {currentUser.email}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <User className="w-4 h-4" />
                  <span>Not logged in</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    openAuth();
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
                >
                  Sign In
                </button>
              </div>
            )}
          </div>

          {/* Quick Note Summary */}
          {currentUser && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Your Library</span>
              <span>{counts.all} active • {counts.pinned} pinned • {counts.private} private</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
