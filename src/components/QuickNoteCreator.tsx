import React, { useState, useRef, useEffect } from 'react';
import { useNotes } from '../context/NotesContext';
import { NoteColor } from '../types';
import { ColorPicker } from './ColorPicker';
import { Pin, Palette, Check } from 'lucide-react';

export const QuickNoteCreator: React.FC = () => {
  const { createNote, activeSection } = useNotes();
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState<NoteColor>('default');
  const [isPinned, setIsPinned] = useState(activeSection === 'pinned');
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentInputRef = useRef<HTMLTextAreaElement>(null);

  // Close and save when clicking outside if there's content
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleClose();
      }
    }
    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded, title, content, color, isPinned]);

  // Expand when clicking input
  const handleFocus = () => {
    setIsExpanded(true);
  };

  const handleClose = () => {
    if (title.trim() || content.trim()) {
      createNote({
        title: title.trim(),
        content: content.trim(),
        color,
        is_pinned: isPinned,
      });
    }
    setTitle('');
    setContent('');
    setColor('default');
    setIsPinned(activeSection === 'pinned');
    setIsExpanded(false);
    setIsColorPickerOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleClose();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-8 px-4" ref={containerRef}>
      <div
        className={`relative rounded-xl border transition-all duration-200 shadow-xs hover:shadow-md ${
          isExpanded
            ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700'
            : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
      >
        {isExpanded && (
          <div className="flex items-center justify-between px-4 pt-3.5 pb-1">
            <input
              id="quick-note-title"
              type="text"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none text-[15px]"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              title={isPinned ? 'Unpin note' : 'Pin note'}
              className={`p-1.5 rounded-lg transition-colors ${
                isPinned
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
            </button>
          </div>
        )}

        <div className="px-4 py-3">
          <textarea
            ref={contentInputRef}
            id="quick-note-content"
            placeholder={isExpanded ? 'Take a note...' : 'Take a quick note...'}
            value={content}
            onFocus={handleFocus}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={isExpanded ? 3 : 1}
            className="w-full bg-transparent resize-none text-[13px] text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
          />
        </div>

        {isExpanded && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/40 rounded-b-xl">
            <div className="relative flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                title="Change note color"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
              >
                <Palette className="w-4 h-4" />
              </button>

              {isColorPickerOpen && (
                <div className="absolute left-0 bottom-9 z-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1.5 shadow-lg animate-in fade-in zoom-in-95 duration-150">
                  <ColorPicker
                    selectedColor={color}
                    onSelectColor={(c) => {
                      setColor(c);
                      setIsColorPickerOpen(false);
                    }}
                    size="sm"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Save</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
