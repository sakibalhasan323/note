import { Note, NoteColor, User, UserSettings } from '../types';

const NOTES_KEY = 'note_app_notes_v1';
const USERS_KEY = 'note_app_users_v1';
const SESSION_KEY = 'note_app_session_v1';
const SETTINGS_KEY = 'note_app_settings_v1';

// Starter demo user
export const DEFAULT_USER: User = {
  id: 'usr_demo_primary',
  name: 'Alex Morgan',
  email: 'alex.morgan@example.com',
  created_at: Date.now() - 86400000 * 7,
};

// Initial starter notes for newly initialized primary user
const createStarterNotes = (userId: string): Note[] => [
  {
    id: 'note_starter_1',
    user_id: userId,
    title: 'Welcome to Note ✍️',
    content: 'A minimal, distraction-free sticky-note notebook that stays out of your way.\n\n• Click any card to edit\n• Use color-coding for priority\n• Pin important items to the top\n• Changes are autosaved instantly',
    color: 'yellow',
    is_pinned: true,
    is_archived: false,
    is_deleted: false,
    created_at: Date.now() - 3600000 * 2,
    updated_at: Date.now() - 3600000 * 2,
  },
  {
    id: 'note_starter_2',
    user_id: userId,
    title: 'Weekly Groceries 🛒',
    content: '• Sourdough bread & farm butter\n• Organic oat milk & Greek yogurt\n• Fresh rosemary, thyme & basil\n• Ground dark roast coffee\n• Avocados and honey crisp apples',
    color: 'green',
    is_pinned: true,
    is_archived: false,
    is_deleted: false,
    created_at: Date.now() - 3600000 * 5,
    updated_at: Date.now() - 3600000 * 5,
  },
  {
    id: 'note_starter_3',
    user_id: userId,
    title: 'Minimalist Architecture Principles 🏛️',
    content: '"Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away."\n\n— Antoine de Saint-Exupéry\n\nKeep interactions simple, typography readable, and surfaces calm.',
    color: 'blue',
    is_pinned: false,
    is_archived: false,
    is_deleted: false,
    created_at: Date.now() - 3600000 * 24,
    updated_at: Date.now() - 3600000 * 24,
  },
  {
    id: 'note_starter_4',
    user_id: userId,
    title: 'Books on the Nightstand 📖',
    content: '1. The Design of Everyday Things — Don Norman\n2. Atomic Habits — James Clear\n3. Thinking, Fast and Slow — Daniel Kahneman\n4. Daily Rituals: How Artists Work',
    color: 'purple',
    is_pinned: false,
    is_archived: false,
    is_deleted: false,
    created_at: Date.now() - 3600000 * 48,
    updated_at: Date.now() - 3600000 * 48,
  },
  {
    id: 'note_starter_5',
    user_id: userId,
    title: 'Past Project Retrospective (Archived)',
    content: 'Q2 Website Redesign deliverables reached 98% target metrics. Key takeaway: streamlined navigation improved task completion by 34%.',
    color: 'pink',
    is_pinned: false,
    is_archived: true,
    is_deleted: false,
    created_at: Date.now() - 3600000 * 72,
    updated_at: Date.now() - 3600000 * 72,
  },
];

class StorageService {
  private getRawNotes(): Note[] {
    try {
      const data = localStorage.getItem(NOTES_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private setRawNotes(notes: Note[]): void {
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    } catch (e) {
      console.error('Failed to write to localStorage', e);
    }
  }

  public initUserSession(): User {
    try {
      const storedUsers = this.getUsers();
      let activeUserId = localStorage.getItem(SESSION_KEY);

      if (storedUsers.length === 0) {
        // Initialize default user
        this.saveUser(DEFAULT_USER);
        const starterNotes = createStarterNotes(DEFAULT_USER.id);
        this.setRawNotes(starterNotes);
        localStorage.setItem(SESSION_KEY, DEFAULT_USER.id);
        return DEFAULT_USER;
      }

      const activeUser = storedUsers.find((u) => u.id === activeUserId);
      if (activeUser) {
        return activeUser;
      }

      // Fallback to first existing user
      localStorage.setItem(SESSION_KEY, storedUsers[0].id);
      return storedUsers[0];
    } catch {
      return DEFAULT_USER;
    }
  }

  public getUsers(): User[] {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public saveUser(user: User): void {
    const users = this.getUsers();
    const existingIndex = users.findIndex((u) => u.id === user.id);
    if (existingIndex >= 0) {
      users[existingIndex] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  public setSessionUser(userId: string | null): void {
    if (userId) {
      localStorage.setItem(SESSION_KEY, userId);
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }

  public getSessionUserId(): string | null {
    return localStorage.getItem(SESSION_KEY);
  }

  // Strictly user-partitioned queries
  public getNotes(userId: string): Note[] {
    const all = this.getRawNotes();
    return all.filter((note) => note.user_id === userId);
  }

  public saveNote(note: Note): void {
    const all = this.getRawNotes();
    const index = all.findIndex((n) => n.id === note.id);
    if (index >= 0) {
      all[index] = note;
    } else {
      all.unshift(note);
    }
    this.setRawNotes(all);
  }

  public createNote(
    userId: string,
    data: {
      title?: string;
      content?: string;
      color?: NoteColor;
      is_pinned?: boolean;
      is_private?: boolean;
      private_password_hash?: string;
    }
  ): Note {
    const all = this.getRawNotes();
    const newNote: Note = {
      id: 'note_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
      user_id: userId,
      title: data.title?.trim() || '',
      content: data.content?.trim() || '',
      color: data.color || 'default',
      is_pinned: !!data.is_pinned,
      is_archived: false,
      is_deleted: false,
      is_private: !!data.is_private,
      private_password_hash: data.private_password_hash,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    all.unshift(newNote);
    this.setRawNotes(all);
    return newNote;
  }

  public updateNote(
    noteId: string,
    userId: string,
    updates: Partial<Omit<Note, 'id' | 'user_id' | 'created_at'>>
  ): Note | null {
    const all = this.getRawNotes();
    const index = all.findIndex((n) => n.id === noteId && n.user_id === userId);
    if (index === -1) return null;

    const updatedNote: Note = {
      ...all[index],
      ...updates,
      updated_at: Date.now(),
    };

    all[index] = updatedNote;
    this.setRawNotes(all);
    return updatedNote;
  }

  public togglePin(noteId: string, userId: string): Note | null {
    const all = this.getRawNotes();
    const index = all.findIndex((n) => n.id === noteId && n.user_id === userId);
    if (index === -1) return null;

    const current = all[index];
    // If pinning an archived or trashed note, unarchive/untrash it
    const updated: Note = {
      ...current,
      is_pinned: !current.is_pinned,
      is_archived: false,
      is_deleted: false,
      updated_at: Date.now(),
    };
    all[index] = updated;
    this.setRawNotes(all);
    return updated;
  }

  public toggleArchive(noteId: string, userId: string): Note | null {
    const all = this.getRawNotes();
    const index = all.findIndex((n) => n.id === noteId && n.user_id === userId);
    if (index === -1) return null;

    const current = all[index];
    const willArchive = !current.is_archived;
    const updated: Note = {
      ...current,
      is_archived: willArchive,
      is_pinned: willArchive ? false : current.is_pinned, // unpin if archiving
      is_deleted: false,
      updated_at: Date.now(),
    };
    all[index] = updated;
    this.setRawNotes(all);
    return updated;
  }

  public moveToTrash(noteId: string, userId: string): Note | null {
    const all = this.getRawNotes();
    const index = all.findIndex((n) => n.id === noteId && n.user_id === userId);
    if (index === -1) return null;

    const current = all[index];
    const updated: Note = {
      ...current,
      is_deleted: true,
      is_pinned: false,
      is_archived: false,
      updated_at: Date.now(),
    };
    all[index] = updated;
    this.setRawNotes(all);
    return updated;
  }

  public restoreFromTrash(noteId: string, userId: string): Note | null {
    const all = this.getRawNotes();
    const index = all.findIndex((n) => n.id === noteId && n.user_id === userId);
    if (index === -1) return null;

    const current = all[index];
    const updated: Note = {
      ...current,
      is_deleted: false,
      updated_at: Date.now(),
    };
    all[index] = updated;
    this.setRawNotes(all);
    return updated;
  }

  public deletePermanently(noteId: string, userId: string): boolean {
    const all = this.getRawNotes();
    const filtered = all.filter((n) => !(n.id === noteId && n.user_id === userId));
    if (filtered.length !== all.length) {
      this.setRawNotes(filtered);
      return true;
    }
    return false;
  }

  public emptyTrash(userId: string): number {
    const all = this.getRawNotes();
    const remaining = all.filter((n) => !(n.user_id === userId && n.is_deleted));
    const removedCount = all.length - remaining.length;
    this.setRawNotes(remaining);
    return removedCount;
  }

  public getUserSettings(userId: string): UserSettings {
    try {
      const raw = localStorage.getItem(`${SETTINGS_KEY}_${userId}`);
      if (!raw) {
        return { defaultColor: 'default', theme: 'light', floating_add_button_enabled: true };
      }
      const parsed = JSON.parse(raw);
      return {
        defaultColor: parsed.defaultColor || 'default',
        theme: parsed.theme || 'light',
        floating_add_button_enabled: parsed.floating_add_button_enabled !== false,
      };
    } catch {
      return { defaultColor: 'default', theme: 'light', floating_add_button_enabled: true };
    }
  }

  public saveUserSettings(userId: string, settings: UserSettings): void {
    try {
      localStorage.setItem(`${SETTINGS_KEY}_${userId}`, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }
}

export const storage = new StorageService();
