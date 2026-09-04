import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, LogIn, LogOut, CheckCircle2 } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    currentUser,
    loginWithGoogle,
    logout,
    isAuthOpen,
    closeAuth,
  } = useAuth();

  const [error, setError] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  if (!isAuthOpen) return null;

  const handleGoogleSignIn = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      const res = await loginWithGoogle();
      if (res.success) {
        closeAuth();
      } else if (res.error) {
        setError(res.error);
      }
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={closeAuth}
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl z-10 p-6 animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
              N
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {currentUser ? 'Google Account' : 'Sign In with Google'}
            </h2>
          </div>
          <button
            type="button"
            onClick={closeAuth}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {currentUser ? (
          /* Active Google session view */
          <div className="py-5 space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-3.5">
              {currentUser.photo_url ? (
                <img
                  src={currentUser.photo_url}
                  alt={currentUser.name}
                  className="w-12 h-12 rounded-full border-2 border-indigo-200 dark:border-indigo-800 object-cover shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-bold text-lg flex items-center justify-center shrink-0">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'G'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
                    {currentUser.name}
                  </p>
                  <span className="text-[10px] px-2 py-0.5 font-medium rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                    Google
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {currentUser.email}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-center gap-2.5 text-xs text-indigo-700 dark:text-indigo-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>Signed in to Firebase with Google. Notes sync automatically.</span>
            </div>

            <div className="pt-2 flex items-center justify-end border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                id="sign-out-btn"
                onClick={() => {
                  logout();
                  closeAuth();
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          /* Google Sign In Dialog */
          <div className="py-6 space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed text-center px-2">
              Sign in with your Google account to sync notes across devices.
            </p>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs">
                {error}
              </div>
            )}

            <button
              type="button"
              id="google-signin-btn"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full py-3 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-sm shadow-xs flex items-center justify-center gap-3 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>

            <div className="pt-2 text-center">
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Safe & direct authentication via Firebase Google Provider
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
