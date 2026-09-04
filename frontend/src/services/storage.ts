import { Note, NoteColor, User, UserSettings } from '../types';

const NOTES_KEY = 'note_app_notes_v1';
const USERS_KEY = 'note_app_users_v1';
const SESSION_KEY = 'note_app_session_v1';
const SETTINGS_KEY = 'note_app_settings_v1';
const GUEST_PASSWORD_KEY = 'note_guest_private_password_v1';

export const DEFAULT_USER: User = {
  id: 'guest_local_workspace',
  name: 'Guest',
  email: '',
  created_at: Date.now(),
};

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

  public initUserSession(): User | null {
    try {
      const storedUsers = this.getUsers();
      let activeUserId = localStorage.getItem(SESSION_KEY);

      if (storedUsers.length === 0) return null;

      const activeUser = storedUsers.find((u) => u.id === activeUserId);
      if (activeUser) {
        return activeUser;
      }

      return null;
    } catch {
      return null;
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

  // Guest private-note password is stored locally (hashed) so unauthenticated
  // users can protect private notes. When the user signs in, it is migrated to
  // Firebase and removed from localStorage.
  public getGuestPrivatePasswordHash(): string | null {
    try {
      return localStorage.getItem(GUEST_PASSWORD_KEY);
    } catch {
      return null;
    }
  }

  public setGuestPrivatePasswordHash(hash: string): void {
    try {
      localStorage.setItem(GUEST_PASSWORD_KEY, hash);
    } catch (e) {
      console.error('Failed to store guest password', e);
    }
  }

  public clearGuestPrivatePasswordHash(): void {
    try {
      localStorage.removeItem(GUEST_PASSWORD_KEY);
    } catch {}
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
        return { defaultColor: 'default', theme: 'light', floating_add_button_enabled: true, view_mode: 'grid' };
      }
      const parsed = JSON.parse(raw);
      return {
        defaultColor: parsed.defaultColor || 'default',
        theme: parsed.theme || 'light',
        floating_add_button_enabled: parsed.floating_add_button_enabled !== false,
        view_mode: parsed.view_mode === 'list' ? 'list' : 'grid',
      };
    } catch {
      return { defaultColor: 'default', theme: 'light', floating_add_button_enabled: true, view_mode: 'grid' };
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
