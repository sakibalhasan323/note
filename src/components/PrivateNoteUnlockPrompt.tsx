import React, { useState } from 'react';
import { useNotes } from '../context/NotesContext';
import { Lock, KeyRound, Eye, EyeOff, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

interface PrivateNoteUnlockPromptProps {
  onSuccess?: () => void;
  targetNoteId?: string;
}

export const PrivateNoteUnlockPrompt: React.FC<PrivateNoteUnlockPromptProps> = ({
  onSuccess,
  targetNoteId,
}) => {
  const { unlockPrivateSection, unlockSinglePrivateNote, resetPrivatePassword } = useNotes();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [newResetPassword, setNewResetPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter a password');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let ok = false;
      if (targetNoteId) {
        ok = await unlockSinglePrivateNote(targetNoteId, password.trim());
      } else {
        ok = await unlockPrivateSection(password.trim());
      }

      if (ok) {
        setPassword('');
        setError(null);
        if (onSuccess) onSuccess();
      } else {
        setError('Incorrect password');
      }
    } catch (err: any) {
      setError(err?.message || 'Verification error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await resetPrivatePassword(newResetPassword);
      if (res.success) {
        setSuccessMsg('Password updated and notes unlocked!');
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 600);
      } else {
        setError(res.error || 'Failed to reset password');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto my-12 p-6 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl text-center animate-in fade-in zoom-in-95 duration-200">
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
        <Lock className="w-7 h-7" />
      </div>

      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
        {isResetMode ? 'Reset Private Password' : 'Private Note'}
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-6">
        {isResetMode
          ? 'Enter a new password or leave blank to remove password protection.'
          : `This ${targetNoteId ? 'note' : 'section'} is protected.`}
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-center justify-center gap-2 text-xs font-semibold text-red-600 dark:text-red-400 animate-in shake duration-150">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {!isResetMode ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative text-left">
            <div className="relative">
              <input
                id="private-note-password-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                autoFocus
                className="w-full h-11 px-4 pr-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            id="private-note-unlock-btn"
            disabled={isSubmitting || !password.trim()}
            className="w-full h-11 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 text-white font-semibold text-sm shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            <span>{isSubmitting ? 'Verifying...' : 'Unlock'}</span>
          </button>

          <div className="pt-2">
            <button
              type="button"
              id="private-note-forgot-password-btn"
              onClick={() => {
                setIsResetMode(true);
                setError(null);
              }}
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium cursor-pointer"
            >
              Forgot or reset password?
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="relative text-left">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              New Password (or leave empty to clear)
            </label>
            <div className="relative">
              <input
                id="private-note-reset-password-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter new password"
                value={newResetPassword}
                onChange={(e) => {
                  setNewResetPassword(e.target.value);
                  if (error) setError(null);
                }}
                autoFocus
                className="w-full h-11 px-4 pr-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            id="private-note-confirm-reset-btn"
            disabled={isSubmitting}
            className="w-full h-11 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 text-white font-semibold text-sm shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
            <span>{isSubmitting ? 'Resetting...' : 'Reset & Unlock'}</span>
          </button>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setIsResetMode(false);
                setError(null);
              }}
              className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:underline cursor-pointer"
            >
              Back to unlock
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
