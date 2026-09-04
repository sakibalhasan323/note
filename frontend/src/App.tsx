import React, { useMemo, useState } from 'react';
import { WebsiteProvider } from './context/WebsiteContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotesProvider, useNotes } from './context/NotesContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { QuickNoteCreator } from './components/QuickNoteCreator';
import { NoteCard } from './components/NoteCard';
import { NoteEditorModal } from './components/NoteEditorModal';
import { ConfirmModal } from './components/ConfirmModal';
import { AuthModal } from './components/AuthModal';
import { SettingsModal } from './components/SettingsModal';
import { EmptyState } from './components/EmptyState';
import { PrivateNoteUnlockPrompt } from './components/PrivateNoteUnlockPrompt';
import { AdminPage } from './components/AdminPage';
import { Note } from './types';
import { Trash2, Plus, Pin, StickyNote, Lock, Unlock, Search, X } from 'lucide-react';

const MainDashboard: React.FC = () => {
  const {
    activeSection,
    searchQuery,
    setSearchQuery,
    colorFilter,
    pinnedNotes,
    unpinnedNotes,
    archivedNotes,
    trashedNotes,
    privateNotes,
    notes,
    updateNote,
    isPrivateUnlocked,
    lockPrivateNotes,
    deletePermanently,
    emptyTrash,
    openNewNoteModal,
    userSettings,
    updateUserSettings,
  } = useNotes();

  const { currentUser } = useAuth();

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [noteToDeletePermanently, setNoteToDeletePermanently] = useState<Note | null>(null);
  const [isEmptyTrashConfirmOpen, setIsEmptyTrashConfirmOpen] = useState(false);
  const [isAddExistingOpen, setIsAddExistingOpen] = useState(false);

  const isSearching = searchQuery.trim().length > 0 || colorFilter !== 'all';
  const privatePinnedNotes = useMemo(() => privateNotes.filter((note) => note.is_pinned), [privateNotes]);
  const privateUnpinnedNotes = useMemo(() => privateNotes.filter((note) => !note.is_pinned), [privateNotes]);

  // Render notes grid
  const renderNotesGrid = (notesList: Note[]) => (
    <div className={userSettings.view_mode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-start' : 'grid grid-cols-2 md:flex md:flex-col gap-3'}>
      {notesList.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          onConfirmPermanentDelete={(n) => setNoteToDeletePermanently(n)}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Header */}
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        viewMode={userSettings.view_mode}
        onViewModeChange={(mode) => updateUserSettings({ view_mode: mode })}
      />

      <div className="flex-1 flex w-full max-w-7xl mx-auto">
        {/* Navigation Sidebar */}
        <Sidebar onOpenSettings={() => setIsSettingsOpen(true)} />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          {/* Mobile Search Bar - Strictly at the top of content area on small screens */}
          <div className="md:hidden mb-4">
            <div className="flex items-center gap-2">
            <div className="relative flex items-center flex-1 min-w-0 h-11 bg-white dark:bg-slate-850 rounded-xl px-3.5 border border-slate-200 dark:border-slate-800 shadow-xs focus-within:ring-2 focus-within:ring-indigo-500/30">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-2 shrink-0 pointer-events-none" />
              <input
                id="mobile-notes-search"
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none focus:outline-none text-sm w-full text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md shrink-0"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {activeSection === 'private' && isPrivateUnlocked && <button type="button" onClick={() => setIsAddExistingOpen(!isAddExistingOpen)} className="h-11 shrink-0 rounded-xl bg-amber-600 px-3 text-xs font-semibold text-white shadow-xs"><Plus className="mr-1 inline h-3.5 w-3.5" />Add</button>}
            </div>
          </div>

          {/* Welcome banner - only shown when not logged in */}

          {/* Section: ALL NOTES */}
          {activeSection === 'all' && (
            <div>
              {/* Quick Note Box at top */}
              {!isSearching && <QuickNoteCreator />}

              {/* Pinned notes section */}
              {pinnedNotes.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4 px-1 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    <Pin className="w-3.5 h-3.5 fill-current text-indigo-500" />
                    <span>Pinned</span>
                  </div>
                  {renderNotesGrid(pinnedNotes)}
                </div>
              )}

              {/* Unpinned notes section */}
              {unpinnedNotes.length > 0 && (
                <div>
                  {pinnedNotes.length > 0 && (
                    <div className="flex items-center gap-2 mb-4 px-1 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      <StickyNote className="w-3.5 h-3.5" />
                      <span>Recent Notes</span>
                    </div>
                  )}
                  {renderNotesGrid(unpinnedNotes)}
                </div>
              )}

              {/* Empty state */}
              {pinnedNotes.length === 0 && unpinnedNotes.length === 0 && (
                <EmptyState
                  isSearch={isSearching}
                  searchQuery={searchQuery}
                  activeSection="all"
                  onCreateNote={() => openNewNoteModal()}
                />
              )}
            </div>
          )}

          {/* Section: PINNED ONLY */}
          {activeSection === 'pinned' && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Pin className="w-5 h-5 text-indigo-600 fill-current" />
                  <span>Pinned Notes</span>
                </h1>
                <span className="text-xs font-medium text-slate-400">
                  {pinnedNotes.length} note{pinnedNotes.length === 1 ? '' : 's'}
                </span>
              </div>

              {pinnedNotes.length > 0 ? (
                renderNotesGrid(pinnedNotes)
              ) : (
                <EmptyState
                  isSearch={isSearching}
                  searchQuery={searchQuery}
                  activeSection="pinned"
                  onCreateNote={() => openNewNoteModal()}
                />
              )}
            </div>
          )}

          {/* Section: PRIVATE NOTES */}
          {activeSection === 'private' && (
            <div>
              {!isPrivateUnlocked ? (
                <PrivateNoteUnlockPrompt />
              ) : (
                <div>
                  {isAddExistingOpen && (
                      <div className="mb-4 border-b border-amber-500/20 pb-3">
                        <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">Choose a public note to move here</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {notes.filter((note) => !note.is_private && !note.is_deleted).map((note) => (
                            <button key={note.id} type="button" onClick={() => { updateNote(note.id, { is_private: true }); setIsAddExistingOpen(false); }} className="truncate rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:border-amber-400">
                              {note.title || 'Untitled note'}
                            </button>
                          ))}
                        </div>
                      </div>
                  )}

                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <QuickNoteCreator makePrivate />
                    </div>
                    <button type="button" onClick={() => setIsAddExistingOpen(!isAddExistingOpen)} className="hidden md:inline-flex mt-0.5 shrink-0 items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-3 text-xs font-semibold text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/50">
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add existing note</span>
                    </button>
                  </div>

                  {privateNotes.length > 0 ? (
                    <>
                      {privatePinnedNotes.length > 0 && (
                        <div className="mb-8">
                          <div className="flex items-center gap-2 mb-4 px-1 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            <Pin className="w-3.5 h-3.5 fill-current text-indigo-500" />
                            <span>Pinned</span>
                          </div>
                          {renderNotesGrid(privatePinnedNotes)}
                        </div>
                      )}
                      {privateUnpinnedNotes.length > 0 && (
                        <div>
                          {privatePinnedNotes.length > 0 && (
                            <div className="flex items-center gap-2 mb-4 px-1 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                              <StickyNote className="w-3.5 h-3.5" />
                              <span>Recent Private Notes</span>
                            </div>
                          )}
                          {renderNotesGrid(privateUnpinnedNotes)}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                        <Lock className="w-6 h-6" />
                      </div>
                      <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                        No private notes yet
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 mb-4">
                        Create a private note protected by your password.
                      </p>
                      <button
                        type="button"
                        onClick={() => openNewNoteModal('default', true)}
                        className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
                      >
                        Create Private Note
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Section: ARCHIVE */}
          {activeSection === 'archive' && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Archived Notes
                </h1>
                <span className="text-xs font-medium text-slate-400">
                  {archivedNotes.length} archived
                </span>
              </div>

              {archivedNotes.length > 0 ? (
                renderNotesGrid(archivedNotes)
              ) : (
                <EmptyState
                  isSearch={isSearching}
                  searchQuery={searchQuery}
                  activeSection="archive"
                  onCreateNote={() => openNewNoteModal()}
                />
              )}
            </div>
          )}

          {/* Section: TRASH */}
          {activeSection === 'trash' && (
            <div>
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Trash2 className="w-5 h-5 text-red-500" />
                    <span>Trash</span>
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Notes here are preserved and can be restored, or permanently deleted.
                  </p>
                </div>

                {trashedNotes.length > 0 && (
                  <button
                    type="button"
                    id="empty-trash-btn"
                    onClick={() => setIsEmptyTrashConfirmOpen(true)}
                    className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/40 dark:hover:bg-red-900/50 dark:text-red-300 border border-red-200 dark:border-red-900/50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Empty Trash</span>
                  </button>
                )}
              </div>

              {trashedNotes.length > 0 ? (
                renderNotesGrid(trashedNotes)
              ) : (
                <EmptyState
                  isSearch={isSearching}
                  searchQuery={searchQuery}
                  activeSection="trash"
                  onCreateNote={() => openNewNoteModal()}
                />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Floating Add Note Button (Controlled via Settings: Active / Inactive) */}
      {userSettings.floating_add_button_enabled && (
        <button
          type="button"
          id="floating-add-note-btn"
          onClick={() => openNewNoteModal()}
          title="Add Note"
          className="fixed right-6 bottom-6 z-40 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-xl flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-indigo-500/40 cursor-pointer"
          aria-label="Add new note"
        >
          <Plus className="w-7 h-7 stroke-[2.5]" />
        </button>
      )}

      {/* Note Editor Modal */}
      <NoteEditorModal />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* User Auth Modal */}
      <AuthModal />

      {/* Confirm Permanent Delete Modal */}
      <ConfirmModal
        isOpen={!!noteToDeletePermanently}
        title="Permanently delete note?"
        message={`"${noteToDeletePermanently?.title || 'This note'}" will be deleted forever and cannot be recovered.`}
        confirmLabel="Delete forever"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={() => {
          if (noteToDeletePermanently) {
            deletePermanently(noteToDeletePermanently.id);
            setNoteToDeletePermanently(null);
          }
        }}
        onCancel={() => setNoteToDeletePermanently(null)}
      />

      {/* Confirm Empty Trash Modal */}
      <ConfirmModal
        isOpen={isEmptyTrashConfirmOpen}
        title="Empty entire trash?"
        message="All notes currently in trash will be permanently erased. This action cannot be undone."
        confirmLabel="Empty Trash"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={() => {
          emptyTrash();
          setIsEmptyTrashConfirmOpen(false);
        }}
        onCancel={() => setIsEmptyTrashConfirmOpen(false)}
      />
    </div>
  );
};

export default function App() {
  if (window.location.pathname === '/admin') {
    return <AdminPage />;
  }

  return (
    <WebsiteProvider>
      <AuthProvider>
        <NotesProvider>
          <MainDashboard />
        </NotesProvider>
      </AuthProvider>
    </WebsiteProvider>
  );
}
