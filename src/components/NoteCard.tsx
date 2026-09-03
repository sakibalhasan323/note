import React, { useState, useRef, useEffect } from 'react';
import { Note, NoteColor } from '../types';
import { useNotes } from '../context/NotesContext';
import { getNoteStyle, formatNoteDate } from '../lib/colorUtils';
import { ColorPicker } from './ColorPicker';
import {
  Pin,
  Archive,
  ArchiveRestore,
  Trash2,
  RotateCcw,
  Palette,
  Copy,
  MoreVertical,
} from 'lucide-react';

interface NoteCardProps {
  note: Note;
  onConfirmPermanentDelete: (note: Note) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, onConfirmPermanentDelete }) => {
  const {
    togglePin,
    toggleArchive,
    moveToTrash,
    restoreFromTrash,
    updateNote,
    duplicateNote,
    setEditingNote,
    theme,
  } = useNotes();

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const isDark = theme === 'dark';
  const style = getNoteStyle(note.color, isDark);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleColorChange = (newColor: NoteColor) => {
    updateNote(note.id, { color: newColor });
    setShowColorPicker(false);
  };

  const handleCopyText = (e: React.MouseEvent) => {
    e.stopPropagation();
    const fullText = `${note.title}\n\n${note.content}`.trim();
    navigator.clipboard.writeText(fullText);
    setShowMoreMenu(false);
  };

  return (
    <div
      id={`note-card-${note.id}`}
      onClick={() => {
        if (!note.is_deleted) {
          setEditingNote(note);
        }
      }}
      className={`group relative flex flex-col rounded-xl border transition-all duration-200 p-4 select-none min-h-[160px] justify-between shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] ${
        note.is_deleted ? 'cursor-default' : 'cursor-pointer'
      }`}
      style={{
        backgroundColor: style.background,
        borderColor: style.borderColor,
      }}
    >
      {/* Top Header: Title & Pin button */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <h3
              className="font-semibold text-[15px] leading-snug break-words flex-1 truncate"
              style={{ color: style.titleColor }}
            >
              {note.title || (
                <span className="italic opacity-60 font-normal">
                  Untitled
                </span>
              )}
            </h3>
          </div>

          {!note.is_deleted && (
            <button
              type="button"
              title={note.is_pinned ? 'Unpin note' : 'Pin note'}
              onClick={(e) => {
                e.stopPropagation();
                togglePin(note.id);
              }}
              className={`p-1.5 rounded-lg transition-colors ${
                note.is_pinned
                  ? 'text-indigo-600 dark:text-indigo-400 opacity-100'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 focus:opacity-100'
              }`}
            >
              <Pin className={`w-4 h-4 ${note.is_pinned ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>

        {/* Content Preview */}
        <div
          className="text-[13px] leading-normal whitespace-pre-wrap break-words line-clamp-4"
          style={{ color: style.bodyColor }}
        >
          {note.content || (
            <span className="italic text-xs opacity-60">Empty note</span>
          )}
        </div>
      </div>

      {/* Footer info: date and bottom toolbar */}
      <div className="mt-3 pt-2 flex items-center justify-between border-t border-black/5 dark:border-white/5">
        <span
          className="text-[11px] font-medium"
          style={{ color: style.mutedColor }}
        >
          {formatNoteDate(note.updated_at)}
        </span>

        {/* Action Toolbar */}
        {note.is_deleted ? (
          /* Trashed note actions */
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Restore note"
              onClick={(e) => {
                e.stopPropagation();
                restoreFromTrash(note.id);
              }}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Delete permanently"
              onClick={(e) => {
                e.stopPropagation();
                onConfirmPermanentDelete(note);
              }}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          /* Active note actions */
          <div
            className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity text-slate-500"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Color selector button */}
            <div className="relative" ref={colorPickerRef}>
              <button
                type="button"
                title="Change note color"
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <Palette className="w-3.5 h-3.5" />
              </button>

              {showColorPicker && (
                <div className="absolute right-0 bottom-8 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                  <ColorPicker
                    selectedColor={note.color}
                    onSelectColor={handleColorChange}
                    size="sm"
                  />
                </div>
              )}
            </div>

            {/* Archive / Unarchive */}
            <button
              type="button"
              title={note.is_archived ? 'Unarchive note' : 'Archive note'}
              onClick={() => toggleArchive(note.id)}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              {note.is_archived ? (
                <ArchiveRestore className="w-3.5 h-3.5" />
              ) : (
                <Archive className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Move to Trash */}
            <button
              type="button"
              title="Delete note"
              onClick={() => moveToTrash(note.id)}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* More Menu */}
            <div className="relative" ref={moreMenuRef}>
              <button
                type="button"
                title="More actions"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {showMoreMenu && (
                <div className="absolute right-0 bottom-8 z-30 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-1 shadow-xl text-xs">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateNote(note.id);
                      setShowMoreMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Duplicate</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy text</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
