import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Note, NoteColor, ViewSection, ThemePreference, UserSettings } from '../types';
import { DEFAULT_USER, storage } from '../services/storage';
import { useAuth } from './AuthContext';
import { hashPassword, verifyPassword } from '../lib/crypto';
import {
  saveNoteToFirebase,
  deleteNoteFromFirebase,
  emptyTrashInFirebase,
  subscribeToFirebaseNotes,
  syncAllNotesToFirebase,
  checkFirebaseNotesStatus,
  runFirebaseLiveVerificationTest,
} from '../services/firebaseNotes';

export interface CloudStatusState {
  status: 'synced' | 'syncing' | 'offline' | 'error';
  lastSyncedAt: Date | null;
  firebaseCount: number;
  details: string;
  error?: string;
}

interface NotesContextType {
  notes: Note[];
  activeSection: ViewSection;
  setActiveSection: (section: ViewSection) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  colorFilter: NoteColor | 'all';
  setColorFilter: (color: NoteColor | 'all') => void;
  
  // Modals & Editing
  editingNote: Note | null;
  setEditingNote: (note: Note | null) => void;
  openNoteEditor: (note: Note, expanded?: boolean) => void;
  isEditorExpanded: boolean;
  isEditorOpen: boolean;
  openNewNoteModal: (defaultColor?: NoteColor, makePrivate?: boolean) => void;
  closeEditor: () => void;
  
  // Autosave & Reload status
  isSaving: boolean;
  isReloading: boolean;
  lastSavedAt: Date | null;
  reloadNotes: () => void;

  // Firebase Cloud State & Verification
  cloudStatus: CloudStatusState;
  syncAllToFirebase: () => Promise<void>;
  checkFirebaseStatus: () => Promise<any>;
  runVerificationProbe: () => Promise<any>;
  isVerificationModalOpen: boolean;
  setIsVerificationModalOpen: (open: boolean) => void;
  
  // Actions
  createNote: (data: {
    title?: string;
    content?: string;
    color?: NoteColor;
    is_pinned?: boolean;
    is_private?: boolean;
    password?: string;
  }) => Promise<Note>;
  updateNote: (id: string, updates: Partial<Omit<Note, 'id' | 'user_id' | 'created_at'>>, newPassword?: string) => Promise<void>;
  togglePin: (id: string) => void;
  toggleArchive: (id: string) => void;
  moveToTrash: (id: string) => void;
  restoreFromTrash: (id: string) => void;
  deletePermanently: (id: string) => void;
  emptyTrash: () => void;
  duplicateNote: (id: string) => void;

  // Counts for sidebar badges
  counts: {
    all: number;
    pinned: number;
    archive: number;
    trash: number;
    private: number;
  };

  // Filtered views
  pinnedNotes: Note[];
  unpinnedNotes: Note[];
  archivedNotes: Note[];
  trashedNotes: Note[];
  privateNotes: Note[];

  // Private notes unlocking state
  isPrivateUnlocked: boolean;
  unlockedNoteIds: Set<string>;
  unlockPrivateSection: (password: string) => Promise<boolean>;
  unlockSinglePrivateNote: (noteId: string, password: string) => Promise<boolean>;
  resetPrivatePassword: (newPassword?: string) => Promise<{ success: boolean; error?: string }>;
  lockPrivateNotes: () => void;

  // Theme & User Settings
  theme: 'light' | 'dark';
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
  toggleTheme: () => void;
  userSettings: UserSettings;
  updateUserSettings: (newSettings: Partial<UserSettings>) => void;

  // Mobile sidebar drawer state
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const ownerId = currentUser?.id || DEFAULT_USER.id;
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeSection, setActiveSection] = useState<ViewSection>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [colorFilter, setColorFilter] = useState<NoteColor | 'all'>('all');
  
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);

  // Cloud / Firebase sync status
  const [cloudStatus, setCloudStatus] = useState<CloudStatusState>({
    status: 'syncing',
    lastSyncedAt: null,
    firebaseCount: 0,
    details: 'Connecting to Firebase...',
  });

  // Private notes state
  const [isPrivateUnlocked, setIsPrivateUnlocked] = useState(false);
  const [unlockedNoteIds, setUnlockedNoteIds] = useState<Set<string>>(new Set());

  // User Settings state
  const [userSettings, setUserSettings] = useState<UserSettings>(() => {
    return currentUser ? storage.getUserSettings(currentUser.id) : {
      defaultColor: 'default',
      theme: 'system',
      floating_add_button_enabled: true,
      view_mode: 'grid',
      expand_notes_by_default: false,
    };
  });

  // Effective theme: 'light' | 'dark' computed from themePreference
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light');

  const applyThemeClass = useCallback((themeVal: 'light' | 'dark') => {
    if (typeof document !== 'undefined') {
      if (themeVal === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  const updateEffectiveTheme = useCallback((pref: ThemePreference) => {
    let resolved: 'light' | 'dark' = 'light';
    if (pref === 'system') {
      resolved = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      resolved = pref;
    }
    setEffectiveTheme(resolved);
    applyThemeClass(resolved);
  }, [applyThemeClass]);

  useEffect(() => {
    updateEffectiveTheme(userSettings.theme);

    if (userSettings.theme === 'system' && window.matchMedia) {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        const newTheme = e.matches ? 'dark' : 'light';
        setEffectiveTheme(newTheme);
        applyThemeClass(newTheme);
      };
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, [userSettings.theme, updateEffectiveTheme, applyThemeClass]);

  // Sync userSettings when currentUser changes
  useEffect(() => {
    if (currentUser) {
      const s = storage.getUserSettings(currentUser.id);
      setUserSettings(s);
      updateEffectiveTheme(s.theme);
    }
  }, [currentUser, updateEffectiveTheme]);

  const updateUserSettings = useCallback((newSettings: Partial<UserSettings>) => {
    setUserSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (currentUser) {
        storage.saveUserSettings(currentUser.id, updated);
      }
      if (newSettings.theme) {
        updateEffectiveTheme(newSettings.theme);
      }
      return updated;
    });
  }, [currentUser, updateEffectiveTheme]);

  const setThemePreference = useCallback((pref: ThemePreference) => {
    updateUserSettings({ theme: pref });
  }, [updateUserSettings]);

  const toggleTheme = useCallback(() => {
    const nextTheme = effectiveTheme === 'dark' ? 'light' : 'dark';
    updateUserSettings({ theme: nextTheme });
  }, [effectiveTheme, updateUserSettings]);

  // Load notes whenever the active user changes or reload is called
  const reloadNotes = useCallback(() => {
    setIsReloading(true);
    const userNotes = storage.getNotes(ownerId);
    if (!currentUser) {
      setCloudStatus({ status: 'offline', lastSyncedAt: null, firebaseCount: 0, details: 'Guest mode: notes are stored on this device' });
    }
    setNotes(userNotes);
    setTimeout(() => {
      setIsReloading(false);
    }, 300);
  }, [currentUser, ownerId]);

  // Initial load and Firebase real-time subscription
  useEffect(() => {
    reloadNotes();
    setIsEditorOpen(false);
      setIsEditorExpanded(false);
    setEditingNote(null);
    setIsPrivateUnlocked(false);
    setUnlockedNoteIds(new Set());

    if (!currentUser) return;

    setCloudStatus((prev) => ({
      ...prev,
      status: 'syncing',
      details: 'Syncing with Firebase Firestore...',
    }));

    // Subscribe to Firestore for real-time note updates
    const unsubscribe = subscribeToFirebaseNotes(
      currentUser.id,
      (remoteNotes) => {
        if (remoteNotes.length > 0) {
          remoteNotes.forEach((rNote) => {
            storage.saveNote(rNote);
          });
          setNotes(storage.getNotes(currentUser.id));
        }

        setCloudStatus({
          status: 'synced',
          lastSyncedAt: new Date(),
          firebaseCount: remoteNotes.length,
          details: `${remoteNotes.length} notes synced with Firebase Firestore`,
        });
      },
      (error) => {
        console.warn('Firebase sync note:', error);
        setCloudStatus((prev) => ({
          ...prev,
          status: 'offline',
          error: error?.message,
          details: 'Local mode (sign in with Google to sync with cloud)',
        }));
      }
    );

    // Initial sync of existing local notes to Firestore
    const local = storage.getNotes(currentUser.id);
    if (local.length > 0) {
      syncAllNotesToFirebase(currentUser.id, local)
        .then((res) => {
          if (res.successCount > 0) {
            setCloudStatus((prev) => ({
              ...prev,
              status: 'synced',
              lastSyncedAt: new Date(),
              details: `All ${local.length} notes saved in Firebase`,
            }));
          }
        })
        .catch(() => {});
    }

    // Migrate the guest private-note password hash into Firebase notes
    // so private notes become cloud-synced once the user signs in.
    const guestHash = storage.getGuestPrivatePasswordHash();
    const privateNotes = local.filter((n) => n.is_private && !n.is_deleted);
    if (guestHash && privateNotes.length > 0) {
      (async () => {
        for (const note of privateNotes) {
          if (!note.private_password_hash) {
            const updated: Note = {
              ...note,
              private_password_hash: guestHash,
              updated_at: Date.now(),
            };
            storage.saveNote(updated);
            await saveNoteToFirebase(updated);
          }
        }
        storage.clearGuestPrivatePasswordHash();
        setNotes(storage.getNotes(currentUser.id));
      })();
    }

    return () => unsubscribe();
  }, [currentUser, reloadNotes]);

  // Sync all local notes to Firebase manually
  const syncAllToFirebase = useCallback(async () => {
    if (!currentUser) return;
    setCloudStatus((prev) => ({ ...prev, status: 'syncing', details: 'Uploading notes to Firebase...' }));
    const currentNotes = storage.getNotes(currentUser.id);
    const result = await syncAllNotesToFirebase(currentUser.id, currentNotes);
    if (result.errorCount === 0) {
      setCloudStatus({
        status: 'synced',
        lastSyncedAt: new Date(),
        firebaseCount: currentNotes.length,
        details: `All ${currentNotes.length} notes verified saved in Firebase`,
      });
    } else {
      setCloudStatus({
        status: 'error',
        lastSyncedAt: new Date(),
        firebaseCount: result.successCount,
        details: `Saved ${result.successCount} notes to Firebase (${result.errorCount} warnings)`,
        error: result.errors.join(', '),
      });
    }
  }, [currentUser]);

  // Check Firebase status
  const checkFirebaseStatus = useCallback(async () => {
    if (!currentUser) return null;
    const currentNotes = storage.getNotes(currentUser.id);
    const status = await checkFirebaseNotesStatus(currentUser.id, currentNotes);
    if (status.connected) {
      setCloudStatus({
        status: status.allLocalSavedInFirebase ? 'synced' : 'syncing',
        lastSyncedAt: new Date(),
        firebaseCount: status.totalRemote,
        details: status.details,
      });
    }
    return status;
  }, [currentUser]);

  // Run live verification probe (saves test doc, reads it, deletes doc, verifies deleted)
  const runVerificationProbe = useCallback(async () => {
    if (!currentUser) return null;
    return await runFirebaseLiveVerificationTest(currentUser.id);
  }, [currentUser]);

  // Private note unlock functions
  const unlockPrivateSection = useCallback(async (password: string): Promise<boolean> => {
    const userPrivateNotes = notes.filter((n) => n.is_private && !n.is_deleted && n.user_id === ownerId);
    if (userPrivateNotes.length === 0 && !currentUser) {
      setIsPrivateUnlocked(true);
      return true;
    }

    if (!currentUser) {
      // Guest: verify against the local guest hash AND any per-note hashes so
      // whichever flow created the private note works consistently. Password is
      // trimmed the same way it was hashed during setup/reset.
      const pw = password.trim();
      const guestHash = storage.getGuestPrivatePasswordHash();
      const candidateHashes = [
        guestHash,
        ...userPrivateNotes.map((n) => n.private_password_hash),
      ].filter((h): h is string => !!h);

      for (const hash of candidateHashes) {
        if (await verifyPassword(pw, hash)) {
          storage.setGuestPrivatePasswordHash(hash);
          setIsPrivateUnlocked(true);
          const allPrivateIds = new Set(userPrivateNotes.map((n) => n.id));
          setUnlockedNoteIds(allPrivateIds);
          return true;
        }
      }

      // If a password already protects this section/notes, reject mismatch.
      if (candidateHashes.length > 0) {
        return false;
      }
      // No password set yet -> allow setting one on first use
      const newHash = await hashPassword(pw);
      storage.setGuestPrivatePasswordHash(newHash);
      setIsPrivateUnlocked(true);
      const allPrivateIds = new Set(userPrivateNotes.map((n) => n.id));
      setUnlockedNoteIds(allPrivateIds);
      return true;
    }

    // Authenticated: verify against at least one private note's stored hash
    for (const note of userPrivateNotes) {
      if (note.private_password_hash) {
        const isMatch = await verifyPassword(password, note.private_password_hash);
        if (isMatch) {
          setIsPrivateUnlocked(true);
          const allPrivateIds = new Set(userPrivateNotes.map((n) => n.id));
          setUnlockedNoteIds(allPrivateIds);
          return true;
        }
      }
    }
    return false;
  }, [currentUser, notes, ownerId]);

  const unlockSinglePrivateNote = useCallback(async (noteId: string, password: string): Promise<boolean> => {
    const target = notes.find((n) => n.id === noteId);
    if (!target || !target.is_private) return false;

    const pw = password.trim();
    const guestHash = storage.getGuestPrivatePasswordHash();
    const candidateHashes = [guestHash, target.private_password_hash].filter((h): h is string => !!h);

    // No password protects this note or the section -> open it freely.
    if (candidateHashes.length === 0) {
      setUnlockedNoteIds((prev) => new Set([...prev, noteId]));
      return true;
    }

    for (const hash of candidateHashes) {
      if (await verifyPassword(pw, hash)) {
        setUnlockedNoteIds((prev) => new Set([...prev, noteId]));
        return true;
      }
    }
    return false;
  }, [currentUser, notes]);

  // Auto-lock private notes when switching away or changing sections
  useEffect(() => {
    setIsPrivateUnlocked(false);
    setUnlockedNoteIds(new Set());
  }, [activeSection]);

  const lockPrivateNotes = useCallback(() => {
    setIsPrivateUnlocked(false);
    setUnlockedNoteIds(new Set());
  }, []);

  const resetPrivatePassword = useCallback(
    async (newPassword?: string): Promise<{ success: boolean; error?: string }> => {
      const newHash = newPassword && newPassword.trim() ? await hashPassword(newPassword.trim()) : undefined;

      if (!currentUser) {
        // Guest: store the password hash locally and align every private note
        // so the old hash can never cause an "incorrect password" again.
        if (newHash) {
          storage.setGuestPrivatePasswordHash(newHash);
          const allGuestNotes = storage.getNotes(ownerId);
          for (const note of allGuestNotes) {
            if (note.is_private && !note.is_deleted) {
              storage.saveNote({ ...note, private_password_hash: newHash, updated_at: Date.now() });
            }
          }
        }
        const allPrivateNotes = storage.getNotes(ownerId).filter((n) => n.is_private && !n.is_deleted);
        setIsPrivateUnlocked(true);
        setUnlockedNoteIds(new Set(allPrivateNotes.map((n) => n.id)));
        return { success: true };
      }

      try {
        setIsSaving(true);
        const allUserNotes = storage.getNotes(currentUser.id);
        const updatedNotes: Note[] = [];

        for (const note of allUserNotes) {
          if (note.is_private) {
            const updated: Note = {
              ...note,
              private_password_hash: newHash,
              updated_at: Date.now(),
            };
            storage.saveNote(updated);
            await saveNoteToFirebase(updated);
            updatedNotes.push(updated);
          }
        }

        // Clear the guest password hash now that it lives in Firebase
        storage.clearGuestPrivatePasswordHash();

        setNotes(storage.getNotes(currentUser.id));
        setIsPrivateUnlocked(true);
        setUnlockedNoteIds(new Set(updatedNotes.map((n) => n.id)));
        setIsSaving(false);
        return { success: true };
      } catch (err: any) {
        setIsSaving(false);
        return { success: false, error: err?.message || 'Failed to reset password' };
      }
    },
    [currentUser, ownerId]
  );

  // Actions
  const createNote = useCallback(
    async (data: {
      title?: string;
      content?: string;
      color?: NoteColor;
      is_pinned?: boolean;
      is_private?: boolean;
      password?: string;
    }): Promise<Note> => {
      setIsSaving(true);

      let passwordHash: string | undefined = undefined;
      if (data.is_private && data.password && data.password.trim()) {
        passwordHash = await hashPassword(data.password.trim());
        // For guests, keep the hash in localStorage so the private section can
        // be unlocked. It migrates to Firebase on sign-in.
        if (!currentUser) {
          storage.setGuestPrivatePasswordHash(passwordHash);
        }
      }

      const newNote = storage.createNote(ownerId, {
        title: data.title,
        content: data.content,
        color: data.color || userSettings.defaultColor || 'default',
        is_pinned: !!data.is_pinned,
        is_private: !!data.is_private,
        private_password_hash: passwordHash,
      });

      if (data.is_private) {
        setUnlockedNoteIds((prev) => new Set([...prev, newNote.id]));
      }

      reloadNotes();

      // Save to Firebase Firestore
      saveNoteToFirebase(newNote).then((res) => {
        if (res.success) {
          setCloudStatus((prev) => ({
            ...prev,
            status: 'synced',
            lastSyncedAt: new Date(),
            details: 'Saved in Firebase',
          }));
        }
      });

      setTimeout(() => {
        setIsSaving(false);
        setLastSavedAt(new Date());
      }, 250);
      return newNote;
    },
    [currentUser, ownerId, userSettings.defaultColor, reloadNotes]
  );

  const updateNote = useCallback(
    async (
      id: string,
      updates: Partial<Omit<Note, 'id' | 'user_id' | 'created_at'>>,
      newPassword?: string
    ) => {
      setIsSaving(true);

      const toSave = { ...updates };
      if (newPassword && newPassword.trim().length > 0) {
        toSave.private_password_hash = await hashPassword(newPassword.trim());
      }

      const updated = storage.updateNote(id, ownerId, toSave);
      if (updated) {
        setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
        if (editingNote && editingNote.id === id) {
          setEditingNote(updated);
        }

        // Save update to Firebase Firestore
        saveNoteToFirebase(updated).then((res) => {
          if (res.success) {
            setCloudStatus((prev) => ({
              ...prev,
              status: 'synced',
              lastSyncedAt: new Date(),
              details: 'Updated in Firebase',
            }));
          }
        });
      }
      setTimeout(() => {
        setIsSaving(false);
        setLastSavedAt(new Date());
      }, 250);
    },
    [currentUser, ownerId, editingNote]
  );

  const togglePin = useCallback(
    (id: string) => {
      const updated = storage.togglePin(id, ownerId);
      reloadNotes();
      if (editingNote && editingNote.id === id) {
        setEditingNote((prev) => (prev ? { ...prev, is_pinned: !prev.is_pinned } : null));
      }
      if (updated) {
        saveNoteToFirebase(updated);
      }
    },
    [ownerId, reloadNotes, editingNote]
  );

  const toggleArchive = useCallback(
    (id: string) => {
      const updated = storage.toggleArchive(id, ownerId);
      reloadNotes();
      if (editingNote && editingNote.id === id) {
        setEditingNote((prev) => (prev ? { ...prev, is_archived: !prev.is_archived } : null));
      }
      if (updated) {
        saveNoteToFirebase(updated);
      }
    },
    [ownerId, reloadNotes, editingNote]
  );

  const moveToTrash = useCallback(
    (id: string) => {
      const updated = storage.moveToTrash(id, ownerId);
      reloadNotes();
      if (editingNote && editingNote.id === id) {
        setIsEditorOpen(false);
        setEditingNote(null);
      }
      if (updated) {
        saveNoteToFirebase(updated);
      }
    },
    [ownerId, reloadNotes, editingNote]
  );

  const restoreFromTrash = useCallback(
    (id: string) => {
      const updated = storage.restoreFromTrash(id, ownerId);
      reloadNotes();
      if (updated) {
        saveNoteToFirebase(updated);
      }
    },
    [ownerId, reloadNotes]
  );

  const deletePermanently = useCallback(
    async (id: string) => {
      storage.deletePermanently(id, ownerId);
      reloadNotes();
      if (editingNote && editingNote.id === id) {
        setIsEditorOpen(false);
        setEditingNote(null);
      }

      // Permanently delete from Firebase Firestore
      const res = await deleteNoteFromFirebase(id);
      if (res.success) {
        setCloudStatus((prev) => ({
          ...prev,
          status: 'synced',
          lastSyncedAt: new Date(),
          details: 'Note permanently deleted from Firebase',
        }));
      }
    },
    [ownerId, reloadNotes, editingNote]
  );

  const emptyTrash = useCallback(async () => {
    const currentTrashedNotes = notes.filter((n) => n.user_id === ownerId && n.is_deleted);
    const trashedIds = currentTrashedNotes.map((n) => n.id);

    storage.emptyTrash(ownerId);
    reloadNotes();

    // Permanently delete all trashed notes from Firebase Firestore
    if (!currentUser) return;
    const res = await emptyTrashInFirebase(ownerId, trashedIds);
    if (res.success) {
      setCloudStatus((prev) => ({
        ...prev,
        status: 'synced',
        lastSyncedAt: new Date(),
        details: `Deleted ${res.deletedCount} notes permanently from Firebase`,
      }));
    }
  }, [currentUser, ownerId, notes, reloadNotes]);

  const duplicateNote = useCallback(
    (id: string) => {
      
      const target = notes.find((n) => n.id === id);
      if (!target) return;
      const duplicated = storage.createNote(ownerId, {
        title: target.title ? `${target.title} (Copy)` : 'Copy',
        content: target.content,
        color: target.color,
        is_pinned: false,
        is_private: target.is_private,
        private_password_hash: target.private_password_hash,
      });
      reloadNotes();
      if (duplicated) {
        saveNoteToFirebase(duplicated);
      }
    },
    [ownerId, notes, reloadNotes]
  );

  const openNewNoteModal = useCallback(
    (defaultColor?: NoteColor, makePrivate?: boolean) => {
      const newNote = storage.createNote(ownerId, {
        title: '',
        content: '',
        color: defaultColor || userSettings.defaultColor || 'default',
        is_pinned: activeSection === 'pinned',
        is_private: !!makePrivate || activeSection === 'private',
      });
      reloadNotes();
      setEditingNote(newNote);
      setIsEditorOpen(true);
      setIsEditorExpanded(userSettings.expand_notes_by_default);
    },
    [ownerId, activeSection, userSettings.defaultColor, userSettings.expand_notes_by_default, reloadNotes]
  );

  const closeEditor = useCallback(() => {
    setIsEditorOpen(false);
    if (editingNote && !editingNote.title.trim() && !editingNote.content.trim()) {
      if (currentUser) {
        storage.deletePermanently(editingNote.id, currentUser.id);
        reloadNotes();
      }
    }
    setEditingNote(null);
    setIsEditorExpanded(false);
  }, [editingNote, currentUser, reloadNotes]);

  const openNoteEditor = useCallback((note: Note, expanded = false) => {
    setEditingNote(note);
    setIsEditorExpanded(expanded);
    setIsEditorOpen(true);
  }, []);

  // Compute counts for sidebar badges
  // CRITICAL: Normal counts must NOT include private notes!
  const counts = useMemo(() => {
    const nonPrivate = notes.filter((n) => !n.is_private);
    const active = nonPrivate.filter((n) => !n.is_deleted && !n.is_archived);
    const pinned = active.filter((n) => n.is_pinned);
    const archived = nonPrivate.filter((n) => !n.is_deleted && n.is_archived);
    const trashed = nonPrivate.filter((n) => n.is_deleted);
    const privateNotesCount = notes.filter((n) => !n.is_deleted && n.is_private).length;

    return {
      all: active.length,
      pinned: pinned.length,
      archive: archived.length,
      trash: trashed.length,
      private: privateNotesCount,
    };
  }, [notes]);

  // Filter helper
  const filterBySearchAndColor = useCallback(
    (list: Note[]) => {
      const q = searchQuery.toLowerCase().trim();
      return list.filter((n) => {
        const matchesColor = colorFilter === 'all' || n.color === colorFilter;
        if (!matchesColor) return false;
        if (!q) return true;
        return (
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q)
        );
      });
    },
    [searchQuery, colorFilter]
  );

  // Normal views: strictly exclude private notes!
  const pinnedNotes = useMemo(() => {
    const list = notes.filter((n) => !n.is_private && !n.is_deleted && !n.is_archived && n.is_pinned);
    return filterBySearchAndColor(list);
  }, [notes, filterBySearchAndColor]);

  const unpinnedNotes = useMemo(() => {
    const list = notes.filter((n) => !n.is_private && !n.is_deleted && !n.is_archived && !n.is_pinned);
    return filterBySearchAndColor(list);
  }, [notes, filterBySearchAndColor]);

  const archivedNotes = useMemo(() => {
    const list = notes.filter((n) => !n.is_private && !n.is_deleted && n.is_archived);
    return filterBySearchAndColor(list);
  }, [notes, filterBySearchAndColor]);

  const trashedNotes = useMemo(() => {
    const list = notes.filter((n) => !n.is_private && n.is_deleted);
    return filterBySearchAndColor(list);
  }, [notes, filterBySearchAndColor]);

  // Private notes view
  const privateNotes = useMemo(() => {
    const list = notes.filter((n) => n.is_private && !n.is_deleted);
    return filterBySearchAndColor(list);
  }, [notes, filterBySearchAndColor]);

  return (
    <NotesContext.Provider
      value={{
        notes,
        activeSection,
        setActiveSection,
        searchQuery,
        setSearchQuery,
        colorFilter,
        setColorFilter,
        editingNote,
        openNoteEditor,
        isEditorExpanded,
        setEditingNote: (note) => {
          setEditingNote(note);
          setIsEditorExpanded(!!note && userSettings.expand_notes_by_default);
          setIsEditorOpen(!!note);
        },
        isEditorOpen,
        openNewNoteModal,
        closeEditor,
        isSaving,
        isReloading,
        lastSavedAt,
        reloadNotes,
        cloudStatus,
        syncAllToFirebase,
        checkFirebaseStatus,
        runVerificationProbe,
        isVerificationModalOpen,
        setIsVerificationModalOpen,
        createNote,
        updateNote,
        togglePin,
        toggleArchive,
        moveToTrash,
        restoreFromTrash,
        deletePermanently,
        emptyTrash,
        duplicateNote,
        counts,
        pinnedNotes,
        unpinnedNotes,
        archivedNotes,
        trashedNotes,
        privateNotes,
        isPrivateUnlocked,
        unlockedNoteIds,
        unlockPrivateSection,
        unlockSinglePrivateNote,
        resetPrivatePassword,
        lockPrivateNotes,
        theme: effectiveTheme,
        themePreference: userSettings.theme,
        setThemePreference,
        toggleTheme,
        userSettings,
        updateUserSettings,
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
};

export const useNotes = () => {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error('useNotes must be used within a NotesProvider');
  return ctx;
};
