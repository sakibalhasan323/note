import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { storage } from '../services/storage';
import {
  getFirebaseAuth,
  signInWithGooglePopup,
  reauthenticateWithGooglePopup,
  signOutFirebase,
  onAuthStateChanged,
  FirebaseUser,
} from '../lib/firebase';

interface AuthContextType {
  currentUser: User | null;
  allUsers: User[];
  login: (email: string) => boolean;
  signup: (name: string, email: string) => User;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  reauthenticateWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchUser: (userId: string) => void;
  isAuthOpen: boolean;
  openAuth: () => void;
  closeAuth: () => void;
  isGoogleUser: boolean;
  authLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_CLEANUP_KEY = 'note_app_demo_cleaned_v1';

function clearAllDemoData() {
  try {
    localStorage.removeItem('note_app_users_v1');
    localStorage.removeItem('note_app_session_v1');
    localStorage.removeItem('note_app_notes_v1');
    localStorage.removeItem('note_app_settings_v1');
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('note_app_settings_')) {
        localStorage.removeItem(key);
      }
    });
  } catch {}
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // 1. One-time cleanup: sign out Firebase and clear all local data
  useEffect(() => {
    const alreadyCleaned = localStorage.getItem(DEMO_CLEANUP_KEY);
    if (!alreadyCleaned) {
      clearAllDemoData();
      signOutFirebase().catch(() => {});
      localStorage.setItem(DEMO_CLEANUP_KEY, '1');
    }
    const user = storage.initUserSession();
    setCurrentUser(user);
    setAllUsers(storage.getUsers());
    setAuthLoading(false);
  }, []);

  // 2. Listen to Firebase Auth state for real Google Sign-In persistence
  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        const googleUser: User = {
          id: fbUser.uid,
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Google User',
          email: fbUser.email || '',
          photo_url: fbUser.photoURL || undefined,
          created_at: Date.now(),
          is_google: true,
        };

        storage.saveUser(googleUser);
        storage.setSessionUser(googleUser.id);
        setCurrentUser(googleUser);
        setAllUsers(storage.getUsers());
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await signInWithGooglePopup();
      const fbUser = result.user;
      const googleUser: User = {
        id: fbUser.uid,
        name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Google User',
        email: fbUser.email || '',
        photo_url: fbUser.photoURL || undefined,
        created_at: Date.now(),
        is_google: true,
      };

      storage.saveUser(googleUser);
      storage.setSessionUser(googleUser.id);
      setCurrentUser(googleUser);
      setAllUsers(storage.getUsers());
      setIsAuthOpen(false);
      return { success: true };
    } catch (err: any) {
      console.warn('Google Sign-In caught error:', err);
      let message = err?.message || 'Google Sign-In failed.';
      if (err?.code === 'auth/popup-blocked') {
        message = 'The sign-in popup was blocked by your browser. Please allow popups or open the app in a new tab.';
      } else if (err?.code === 'auth/popup-closed-by-user') {
        message = 'Sign-in was cancelled before completion.';
      } else if (err?.code === 'auth/cancelled-popup-request') {
        message = 'Only one popup request is allowed at a time.';
      }
      return { success: false, error: message };
    }
  };

  const reauthenticateWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      await reauthenticateWithGooglePopup();
      return { success: true };
    } catch (err: any) {
      let message = err?.message || 'Google re-authentication failed.';
      if (err?.code === 'auth/popup-blocked') message = 'The Google re-authentication popup was blocked.';
      if (err?.code === 'auth/popup-closed-by-user') message = 'Google re-authentication was cancelled.';
      return { success: false, error: message };
    }
  };

  const login = (email: string): boolean => {
    const users = storage.getUsers();
    const found = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (found) {
      storage.setSessionUser(found.id);
      setCurrentUser(found);
      setAllUsers(users);
      setIsAuthOpen(false);
      return true;
    }
    return false;
  };

  const signup = (name: string, email: string): User => {
    const users = storage.getUsers();
    const existing = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (existing) {
      storage.setSessionUser(existing.id);
      setCurrentUser(existing);
      setIsAuthOpen(false);
      return existing;
    }

    const newUser: User = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
      name: name.trim() || 'Note User',
      email: email.trim().toLowerCase(),
      created_at: Date.now(),
      is_google: false,
    };

    storage.saveUser(newUser);
    storage.setSessionUser(newUser.id);
    setCurrentUser(newUser);
    setAllUsers(storage.getUsers());
    setIsAuthOpen(false);
    return newUser;
  };

  const logout = async () => {
    try {
      await signOutFirebase();
    } catch (e) {
      console.warn('Firebase sign out error:', e);
    }
    storage.setSessionUser(null);
    setCurrentUser(null);
  };

  const switchUser = (userId: string) => {
    const users = storage.getUsers();
    const target = users.find((u) => u.id === userId);
    if (target) {
      storage.setSessionUser(target.id);
      setCurrentUser(target);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        allUsers,
        login,
        signup,
        loginWithGoogle,
        reauthenticateWithGoogle,
        logout,
        switchUser,
        isAuthOpen,
        openAuth: () => setIsAuthOpen(true),
        closeAuth: () => setIsAuthOpen(false),
        isGoogleUser: !!currentUser?.is_google,
        authLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
