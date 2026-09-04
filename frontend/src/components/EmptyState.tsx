import React from 'react';
import { ViewSection } from '../types';
import { StickyNote, Search, Archive, Trash2, Plus } from 'lucide-react';

interface EmptyStateProps {
  isSearch: boolean;
  searchQuery?: string;
  activeSection: ViewSection;
  onCreateNote: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  isSearch,
  searchQuery,
  activeSection,
  onCreateNote,
}) => {
  if (isSearch) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-4">
          <Search className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          No notes found
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
          {searchQuery ? (
            <>
              No matches for <span className="font-semibold text-slate-700 dark:text-slate-300">"{searchQuery}"</span>. Try searching with a different term.
            </>
          ) : (
            'Try adjusting your search or color filter.'
          )}
        </p>
      </div>
    );
  }

  switch (activeSection) {
    case 'pinned':
      return (
        <div className="py-20 flex flex-col items-center justify-center text-center px-4">
          <div className="w-14 h-14 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
            <StickyNote className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            No pinned notes
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
            Pin your most important thoughts and checklists so they stay right at the top.
          </p>
        </div>
      );

    case 'archive':
      return (
        <div className="py-20 flex flex-col items-center justify-center text-center px-4">
          <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-4">
            <Archive className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Archive is empty
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
            Archived notes stay safely stored away from your main dashboard until you need them.
          </p>
        </div>
      );

    case 'trash':
      return (
        <div className="py-20 flex flex-col items-center justify-center text-center px-4">
          <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-4">
            <Trash2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Trash is empty
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
            Deleted notes will appear here before being permanently removed.
          </p>
        </div>
      );

    case 'all':
    default:
      return (
        <div className="py-20 flex flex-col items-center justify-center text-center px-4">
          <div className="w-14 h-14 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 shadow-2xs">
            <StickyNote className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Your notes will appear here
          </h3>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
            Capture quick thoughts, daily reminders, lists, and ideas in a clean, uncluttered space.
          </p>
          <button
            type="button"
            id="empty-create-note-btn"
            onClick={onCreateNote}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create your first note</span>
          </button>
        </div>
      );
  }
};
