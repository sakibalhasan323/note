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

export const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyBw1vhpCHelRkv8BMnCcemQ-50xZyMCdc0",
  authDomain: "note-site-je.firebaseapp.com",
  projectId: "note-site-je",
  storageBucket: "note-site-je.firebasestorage.app",
  messagingSenderId: "1011717430011",
  appId: "1:1011717430011:web:ec41c01ffc09014d422e5e"
};

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

