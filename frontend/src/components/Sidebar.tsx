import React from 'react';
import { useNotes } from '../context/NotesContext';
import { ViewSection, NOTE_COLORS, NoteColor } from '../types';
import { StickyNote, Pin, Archive, Trash2, Settings, X, Palette, Lock } from 'lucide-react';

interface SidebarProps {
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenSettings }) => {
  const {
    activeSection,
    setActiveSection,
    counts,
    colorFilter,
    setColorFilter,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
  } = useNotes();

  const navItems: { id: ViewSection; label: string; icon: React.ComponentType<{ className?: string }>; count: number }[] = [
    { id: 'all', label: 'All Notes', icon: StickyNote, count: counts.all },
    { id: 'pinned', label: 'Pinned', icon: Pin, count: counts.pinned },
    { id: 'private', label: 'Private Notes', icon: Lock, count: counts.private },
    { id: 'archive', label: 'Archive', icon: Archive, count: counts.archive },
    { id: 'trash', label: 'Trash', icon: Trash2, count: counts.trash },
  ];

  const handleSelectSection = (section: ViewSection) => {
    setActiveSection(section);
    setIsMobileSidebarOpen(false);
  };

  const content = (
    <div className="flex flex-col h-full p-4">
      {/* Navigation list */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              type="button"
              onClick={() => handleSelectSection(item.id)}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? 'text-indigo-600 dark:text-indigo-400 stroke-[2.2]' : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.count > 0 && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    isActive
                      ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Color Filter Section */}
      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          <Palette className="w-3.5 h-3.5" />
          <span>Filter by Color</span>
        </div>
        <div className="flex items-center flex-wrap gap-1.5 px-2 py-1">
          <button
            type="button"
            onClick={() => setColorFilter('all')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
              colorFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All
          </button>
          {NOTE_COLORS.map((col) => (
            <button
              key={col.id}
              type="button"
              title={col.name}
              onClick={() => setColorFilter(col.id as NoteColor)}
              className={`w-6 h-6 rounded-full border transition-all ${
                colorFilter === col.id ? 'ring-2 ring-indigo-500 ring-offset-1 scale-110' : 'opacity-80 hover:opacity-100'
              }`}
              style={{
                backgroundColor: col.lightBg,
                borderColor: col.lightBorder,
              }}
              aria-label={`Filter by ${col.name}`}
            />
          ))}
        </div>
      </div>

      {/* Footer / Settings Link */}
      <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          id="sidebar-settings-btn"
          onClick={() => {
            setIsMobileSidebarOpen(false);
            onOpenSettings();
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <Settings className="w-5 h-5 text-slate-400 dark:text-slate-500" />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block w-64 shrink-0 sticky top-16 h-[calc(100vh-4rem)] border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
        {content}
      </aside>

      {/* Mobile Drawer Backdrop and Sidebar */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full shadow-2xl z-10 flex flex-col animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="font-bold text-base text-slate-900 dark:text-slate-100">
                Menu
              </span>
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {content}
          </div>
        </div>
      )}
    </>
  );
};
