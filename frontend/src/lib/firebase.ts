import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  reauthenticateWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { FirebaseConfig } from '../types';

// Build the Firebase web configuration from build-time environment variables
// (VITE_FIREBASE_*) so end users can point the app at their own Firebase
// project without an admin panel. Falls back to the bundled default project.
function configFromEnv(): FirebaseConfig {
  return {
    apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) || 'AIzaSyBw1vhpCHelRkv8BMnCcemQ-50xZyMCdc0',
    authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || 'note-site-je.firebaseapp.com',
    projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || 'note-site-je',
    storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || 'note-site-je.firebasestorage.app',
    messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || '1011717430011',
    appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) || '1:1011717430011:web:ec41c01ffc09014d422e5e',
  };
}

export const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = configFromEnv();

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

export function initFirebase(config: FirebaseConfig = DEFAULT_FIREBASE_CONFIG) {
  try {
    if (getApps().length > 0) {
      app = getApp();
    } else {
      app = initializeApp(config);
    }
    db = getFirestore(app);
    auth = getAuth(app);
    return { app, db, auth, error: null };
  } catch (err: any) {
    console.warn('Firebase initialization note/warning:', err?.message || err);
    return { app: null, db: null, auth: null, error: err?.message || 'Initialization failed' };
  }
}

// Initial setup
const { app: initialApp, db: initialDb, auth: initialAuth } = initFirebase();
export { initialApp as app, initialDb as db, initialAuth as auth };

export function getDb(): Firestore | null {
  if (!db) {
    initFirebase();
  }
  return db;
}

export function getFirebaseAuth(): Auth | null {
  if (!auth) {
    initFirebase();
  }
  return auth;
}

export async function signInWithGooglePopup() {
  const currentAuth = getFirebaseAuth();
  if (!currentAuth) {
    throw new Error('Firebase Auth is not available. Please verify your Firebase configuration.');
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return await signInWithPopup(currentAuth, provider);
}

export async function reauthenticateWithGooglePopup() {
  const currentAuth = getFirebaseAuth();
  if (!currentAuth?.currentUser) {
    throw new Error('Sign in with Google before resetting your private-note password.');
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return reauthenticateWithPopup(currentAuth.currentUser, provider);
}

export async function signOutFirebase() {
  const currentAuth = getFirebaseAuth();
  if (currentAuth) {
    await signOut(currentAuth);
  }
}

export { onAuthStateChanged, GoogleAuthProvider, type FirebaseUser };

