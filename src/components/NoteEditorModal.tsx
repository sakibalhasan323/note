import React, { useState, useEffect, useRef } from 'react';
import { useNotes } from '../context/NotesContext';
import { NoteColor } from '../types';
import { getNoteStyle } from '../lib/colorUtils';
import { ColorPicker } from './ColorPicker';
import {
  Pin,
  Archive,
  ArchiveRestore,
  Trash2,
  Palette,
  Check,
  X,
  Clock,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';

export const NoteEditorModal: React.FC = () => {
  const {
    editingNote,
    isEditorOpen,
    closeEditor,
    updateNote,
    togglePin,
    toggleArchive,
    moveToTrash,
    isSaving,
    theme,
  } = useNotes();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState<NoteColor>('default');
  const [isPrivate, setIsPrivate] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // Sync state when modal opens with editingNote
  useEffect(() => {
    if (editingNote) {
      setTitle(editingNote.title || '');
      setContent(editingNote.content || '');
      setColor(editingNote.color || 'default');
      setIsPrivate(!!editingNote.is_private);
      setNewPassword('');
      setShowPasswordInput(false);
    }
  }, [editingNote]);

  // Autosave when title or content or color changes
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (!editingNote) return;
    if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    updateTimeoutRef.current = setTimeout(() => {
      updateNote(editingNote.id, { title: newTitle });
    }, 200);
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    if (!editingNote) return;
    if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    updateTimeoutRef.current = setTimeout(() => {
      updateNote(editingNote.id, { content: newContent });
    }, 200);
  };

  const handleColorChange = (newColor: NoteColor) => {
    setColor(newColor);
    if (editingNote) {
      updateNote(editingNote.id, { color: newColor });
    }
    setShowColorPicker(false);
  };

  const handleTogglePrivate = (enable: boolean) => {
    setIsPrivate(enable);
    if (enable) {
      setShowPasswordInput(true);
    } else {
      setShowPasswordInput(false);
      if (editingNote) {
        updateNote(editingNote.id, { is_private: false, private_password_hash: undefined });
      }
    }
  };

  const handleSavePassword = () => {
    if (!editingNote) return;
    if (newPassword.trim().length > 0) {
      updateNote(editingNote.id, { is_private: true }, newPassword.trim());
      setShowPasswordInput(false);
      setNewPassword('');
    }
  };

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard escape & shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isEditorOpen) {
        closeEditor();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && isEditorOpen) {
        closeEditor();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditorOpen, closeEditor]);

  if (!isEditorOpen || !editingNote) return null;

  const isDark = theme === 'dark';
  const style = getNoteStyle(color, isDark);

  const createdDate = new Date(editingNote.created_at).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const updatedDate = new Date(editingNote.updated_at).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={closeEditor}
      />

      {/* Editor Modal Dialog */}
      <div
        id="note-editor-modal"
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-xl rounded-xl border shadow-xl z-10 flex flex-col overflow-hidden transition-colors animate-in zoom-in-95 fade-in duration-200"
        style={{
          backgroundColor: style.background,
          borderColor: style.borderColor,
        }}
      >
        {/* Top bar: Title & Pin, Autosave, and Close */}
        <div className="p-4 sm:p-5 pb-2 flex items-start justify-between gap-3">
          <input
            id="editor-note-title"
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full bg-transparent font-semibold text-lg sm:text-xl placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
            style={{ color: style.titleColor }}
          />

          <div className="flex items-center gap-1 shrink-0">
            {/* Autosave status indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-slate-500 dark:text-slate-400 bg-black/5 dark:bg-white/5 mr-1">
              {isSaving ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Saved</span>
                </>
              )}
            </div>

            {/* Private Protection Toggle */}
            <button
              type="button"
              id="editor-lock-toggle-btn"
              title={isPrivate ? 'Protected note (Click to remove lock)' : 'Lock as private note'}
              onClick={() => handleTogglePrivate(!isPrivate)}
              className={`p-2 rounded-lg transition-colors ${
                isPrivate
                  ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Lock className={`w-4 h-4 ${isPrivate ? 'fill-current' : ''}`} />
            </button>

            {/* Pin Toggle */}
            <button
              type="button"
              title={editingNote.is_pinned ? 'Unpin note' : 'Pin note'}
              onClick={() => togglePin(editingNote.id)}
              className={`p-2 rounded-lg transition-colors ${
                editingNote.is_pinned
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Pin className={`w-4 h-4 ${editingNote.is_pinned ? 'fill-current' : ''}`} />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={closeEditor}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              aria-label="Close editor"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Password setup prompt if lock was just toggled on without a password */}
        {isPrivate && showPasswordInput && (
          <div className="px-4 sm:px-5 py-3 bg-amber-50/70 dark:bg-amber-950/20 border-b border-amber-200/60 dark:border-amber-900/40 text-xs">
            <p className="font-semibold text-amber-800 dark:text-amber-300 mb-1.5">
              Set a password for this private note:
            </p>
            <div className="flex items-center gap-2 max-w-sm">
              <div className="relative flex-1">
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  placeholder="Enter password..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-1.5 pr-8 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordText(!showPasswordText)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPasswordText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <button
                type="button"
                onClick={handleSavePassword}
                disabled={!newPassword.trim()}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg font-medium shadow-xs transition-colors"
              >
                Save
              </button>
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-400/80 mt-1">
              Passwords are securely hashed before saving and never stored as plain text.
            </p>
          </div>
        )}

        {/* Content Body Textarea */}
        <div className="px-4 sm:px-5 py-3">
          <textarea
            ref={textareaRef}
            id="editor-note-content"
            placeholder="Write your note..."
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            rows={8}
            className="w-full bg-transparent resize-none text-[13px] sm:text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none leading-relaxed min-h-[160px] max-h-[55vh]"
            style={{ color: style.bodyColor }}
          />
        </div>

        {/* Date metadata */}
        <div className="px-4 sm:px-5 py-1 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            <span>Created {createdDate}</span>
          </div>
          <span>Edited {updatedDate}</span>
        </div>

        {/* Bottom Toolbar & Done Action */}
        <div className="p-3 sm:p-4 border-t border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {/* Color Picker Toggle */}
            <div className="relative" ref={colorPickerRef}>
              <button
                type="button"
                title="Change note color"
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <Palette className="w-4 h-4" />
              </button>

              {showColorPicker && (
                <div className="absolute left-0 bottom-10 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                  <ColorPicker
                    selectedColor={color}
                    onSelectColor={handleColorChange}
                    size="sm"
                  />
                </div>
              )}
            </div>

            {/* Archive / Unarchive */}
            <button
              type="button"
              title={editingNote.is_archived ? 'Unarchive note' : 'Archive note'}
              onClick={() => toggleArchive(editingNote.id)}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              {editingNote.is_archived ? (
                <ArchiveRestore className="w-4 h-4" />
              ) : (
                <Archive className="w-4 h-4" />
              )}
            </button>

            {/* Delete / Move to Trash */}
            <button
              type="button"
              title="Delete note"
              onClick={() => moveToTrash(editingNote.id)}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            id="editor-done-btn"
            onClick={closeEditor}
            className="px-5 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
