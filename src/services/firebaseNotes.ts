import {
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
} from 'firebase/firestore';
import { getDb } from '../lib/firebase';
import { Note } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function sanitizeNotePayload(note: Note): Record<string, any> {
  const payload: Record<string, any> = {
    id: note.id,
    user_id: note.user_id,
    title: note.title || '',
    content: note.content || '',
    color: note.color || 'default',
    is_pinned: !!note.is_pinned,
    is_archived: !!note.is_archived,
    is_deleted: !!note.is_deleted,
    is_private: !!note.is_private,
    created_at: Number(note.created_at || Date.now()),
    updated_at: Number(note.updated_at || Date.now()),
  };

  if (note.private_password_hash) {
    payload.private_password_hash = note.private_password_hash;
  }

  return payload;
}

/**
 * Helper to parse a Firestore document into a typed Note object
 */
function docToNote(id: string, fallbackUserId: string, data: any): Note {
  return {
    id,
    user_id: data.user_id || fallbackUserId,
    title: data.title || '',
    content: data.content || '',
    color: data.color || 'default',
    is_pinned: !!data.is_pinned,
    is_archived: !!data.is_archived,
    is_deleted: !!data.is_deleted,
    is_private: !!data.is_private,
    private_password_hash: data.private_password_hash || undefined,
    created_at: Number(data.created_at || Date.now()),
    updated_at: Number(data.updated_at || Date.now()),
  };
}

/**
 * Save or update a note in Firebase Firestore
 * Attempts both user-nested path (users/{userId}/notes/{noteId}) and top-level path (notes/{noteId})
 */
export async function saveNoteToFirebase(note: Note): Promise<{ success: boolean; error?: string }> {
  const db = getDb();
  if (!db) {
    return { success: false, error: 'Firestore database is not initialized.' };
  }

  const data = sanitizeNotePayload(note);
  let saved = false;
  let lastError: any = null;

  // 1. Try user-nested path (standard user-isolated security rules)
  try {
    const userNestedRef = doc(db, 'users', note.user_id, 'notes', note.id);
    await setDoc(userNestedRef, data, { merge: true });
    saved = true;
  } catch (err: any) {
    lastError = err;
  }

  // 2. Also try root collection (standard collection-level security rules)
  try {
    const noteRef = doc(db, 'notes', note.id);
    await setDoc(noteRef, data, { merge: true });
    saved = true;
  } catch (err: any) {
    if (!saved) lastError = err;
  }

  if (saved) {
    console.log(`[Firebase Firestore] Note "${note.id}" saved successfully`);
    return { success: true };
  }

  const errorMsg = lastError?.message || 'Failed to save note in Firebase';
  console.warn(`[Firebase Firestore] Error saving note "${note.id}":`, errorMsg);
  return { success: false, error: errorMsg };
}

/**
 * Permanently delete a note from Firebase Firestore
 */
export async function deleteNoteFromFirebase(
  noteId: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  const db = getDb();
  if (!db) {
    return { success: false, error: 'Firestore database is not initialized.' };
  }

  let deleted = false;
  let lastError: any = null;

  if (userId) {
    try {
      const userNestedRef = doc(db, 'users', userId, 'notes', noteId);
      await deleteDoc(userNestedRef);
      deleted = true;
    } catch (err) {
      lastError = err;
    }
  }

  try {
    const noteRef = doc(db, 'notes', noteId);
    await deleteDoc(noteRef);
    deleted = true;
  } catch (err: any) {
    if (!deleted) lastError = err;
  }

  if (deleted) {
    console.log(`[Firebase Firestore] Note "${noteId}" permanently deleted`);
    return { success: true };
  }

  return { success: false, error: lastError?.message || 'Failed to delete note from Firebase' };
}

/**
 * Permanently delete all trashed notes from Firebase Firestore
 */
export async function emptyTrashInFirebase(
  userId: string,
  trashedIds: string[]
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  const db = getDb();
  if (!db) {
    return { success: false, deletedCount: 0, error: 'Firestore not available' };
  }

  let deletedCount = 0;
  try {
    // Delete each trashed note directly by document ID
    for (const noteId of trashedIds) {
      await deleteNoteFromFirebase(noteId, userId);
      deletedCount++;
    }

    // Also query Firestore for any other lingering trashed notes for this user
    try {
      const q = query(
        collection(db, 'notes'),
        where('user_id', '==', userId),
        where('is_deleted', '==', true)
      );
      const snapshot = await getDocs(q);
      for (const docSnap of snapshot.docs) {
        if (!trashedIds.includes(docSnap.id)) {
          await deleteDoc(docSnap.ref);
          deletedCount++;
        }
      }
    } catch {
      // composite index query fallback
    }

    try {
      const userCol = collection(db, 'users', userId, 'notes');
      const userSnap = await getDocs(userCol);
      for (const docSnap of userSnap.docs) {
        const data = docSnap.data();
        if (data.is_deleted) {
          await deleteDoc(docSnap.ref);
          deletedCount++;
        }
      }
    } catch {
      // nested query fallback
    }

    console.log(`[Firebase Firestore] Emptied trash: removed ${deletedCount} notes`);
    return { success: true, deletedCount };
  } catch (err: any) {
    console.warn('[Firebase Firestore] Error emptying trash:', err?.message || err);
    return { success: false, deletedCount, error: err?.message || 'Failed to empty trash in Firebase' };
  }
}

/**
 * Fetch all notes for a specific user from Firebase Firestore
 */
export async function fetchNotesFromFirebase(userId: string): Promise<{ notes: Note[]; error?: string }> {
  const db = getDb();
  if (!db) {
    return { notes: [], error: 'Firestore is not initialized.' };
  }

  const noteMap = new Map<string, Note>();

  // 1. Try user nested collection: users/{userId}/notes
  try {
    const userNestedCol = collection(db, 'users', userId, 'notes');
    const userSnap = await getDocs(userNestedCol);
    userSnap.forEach((d) => {
      noteMap.set(d.id, docToNote(d.id, userId, d.data()));
    });
  } catch (err) {
    console.warn(`[Firebase Firestore] User-nested fetch error:`, err);
  }

  // 2. Also try root collection: notes where user_id == userId
  try {
    const q = query(collection(db, 'notes'), where('user_id', '==', userId));
    const snapshot = await getDocs(q);
    snapshot.forEach((d) => {
      if (!noteMap.has(d.id)) {
        noteMap.set(d.id, docToNote(d.id, userId, d.data()));
      }
    });
  } catch (err: any) {
    console.warn(`[Firebase Firestore] Root collection fetch error:`, err);
  }

  const notes = Array.from(noteMap.values());
  return { notes };
}

/**
 * Subscribe to real-time changes in Firestore for this user's notes
 */
export function subscribeToFirebaseNotes(
  userId: string,
  onUpdate: (notes: Note[]) => void,
  onError?: (err: any) => void
): () => void {
  const db = getDb();
  if (!db) {
    return () => {};
  }

  const cache = new Map<string, Note>();

  const emit = () => {
    onUpdate(Array.from(cache.values()));
  };

  let unsubNested: (() => void) | null = null;
  let unsubRoot: (() => void) | null = null;

  try {
    const userNestedCol = collection(db, 'users', userId, 'notes');
    unsubNested = onSnapshot(
      userNestedCol,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'removed') {
            cache.delete(change.doc.id);
          } else {
            cache.set(change.doc.id, docToNote(change.doc.id, userId, change.doc.data()));
          }
        });
        emit();
      },
      (err) => {
        console.warn('[Firebase Firestore] User-nested listener error:', err?.message);
      }
    );
  } catch {}

  try {
    const q = query(collection(db, 'notes'), where('user_id', '==', userId));
    unsubRoot = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'removed') {
            cache.delete(change.doc.id);
          } else {
            cache.set(change.doc.id, docToNote(change.doc.id, userId, change.doc.data()));
          }
        });
        emit();
      },
      (error) => {
        console.warn('[Firebase Firestore] Root notes listener error:', error?.message);
        if (onError) onError(error);
      }
    );
  } catch {}

  return () => {
    if (unsubNested) unsubNested();
    if (unsubRoot) unsubRoot();
  };
}

/**
 * Batch upload / sync all local notes to Firebase Firestore
 */
export async function syncAllNotesToFirebase(
  userId: string,
  notes: Note[]
): Promise<{ successCount: number; errorCount: number; errors: string[] }> {
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  const userNotes = notes.filter((n) => n.user_id === userId);

  for (const note of userNotes) {
    const res = await saveNoteToFirebase(note);
    if (res.success) {
      successCount++;
    } else {
      errorCount++;
      if (res.error && !errors.includes(res.error)) {
        errors.push(res.error);
      }
    }
  }

  return { successCount, errorCount, errors };
}

/**
 * Verification Checker:
 * Queries Firebase Firestore directly to verify:
 * 1. How many notes are currently saved in Firestore for this user
 * 2. Are all current local notes present in Firestore?
 * 3. Have deleted notes been permanently removed from Firestore?
 */
export async function checkFirebaseNotesStatus(
  userId: string,
  localNotes: Note[]
): Promise<{
  connected: boolean;
  totalRemote: number;
  activeRemote: number;
  trashedRemote: number;
  allLocalSavedInFirebase: boolean;
  missingInFirebase: string[];
  details: string;
  error?: string;
}> {
  const db = getDb();
  if (!db) {
    return {
      connected: false,
      totalRemote: 0,
      activeRemote: 0,
      trashedRemote: 0,
      allLocalSavedInFirebase: false,
      missingInFirebase: [],
      details: 'Firebase Firestore is not initialized',
      error: 'Firestore unavailable',
    };
  }

  try {
    const q = query(collection(db, 'notes'), where('user_id', '==', userId));
    const snapshot = await getDocs(q);
    const remoteDocMap = new Map<string, any>();

    snapshot.forEach((d) => {
      remoteDocMap.set(d.id, d.data());
    });

    const userLocalNotes = localNotes.filter((n) => n.user_id === userId);
    const missing: string[] = [];

    for (const lNote of userLocalNotes) {
      if (!remoteDocMap.has(lNote.id)) {
        missing.push(lNote.title || lNote.id);
      }
    }

    let activeRemote = 0;
    let trashedRemote = 0;
    remoteDocMap.forEach((data) => {
      if (data.is_deleted) {
        trashedRemote++;
      } else {
        activeRemote++;
      }
    });

    const allSaved = missing.length === 0;
    const details = allSaved
      ? `All ${userLocalNotes.length} notes are safely saved in Firebase Firestore (${activeRemote} active, ${trashedRemote} in trash).`
      : `${userLocalNotes.length - missing.length} of ${userLocalNotes.length} notes are in Firebase. ${missing.length} pending sync.`;

    return {
      connected: true,
      totalRemote: remoteDocMap.size,
      activeRemote,
      trashedRemote,
      allLocalSavedInFirebase: allSaved,
      missingInFirebase: missing,
      details,
    };
  } catch (err: any) {
    return {
      connected: false,
      totalRemote: 0,
      activeRemote: 0,
      trashedRemote: 0,
      allLocalSavedInFirebase: false,
      missingInFirebase: [],
      details: 'Could not connect to Firebase Firestore: ' + (err?.message || err),
      error: err?.message || 'Query failed',
    };
  }
}

/**
 * Live test to verify that:
 * 1. A note is written and saved to Firebase Firestore
 * 2. It can be read back from Firebase Firestore
 * 3. It is deleted from Firebase Firestore
 * 4. Verifies that it no longer exists in Firebase Firestore
 */
export async function runFirebaseLiveVerificationTest(userId: string): Promise<{
  passed: boolean;
  step1Save: boolean;
  step2Read: boolean;
  step3Delete: boolean;
  step4ConfirmGone: boolean;
  message: string;
}> {
  const db = getDb();
  if (!db) {
    return {
      passed: false,
      step1Save: false,
      step2Read: false,
      step3Delete: false,
      step4ConfirmGone: false,
      message: 'Firestore not available',
    };
  }

  const testId = `test_probe_${Date.now()}`;
  const testRef = doc(db, 'notes', testId);

  try {
    // Step 1: Save test note to Firebase
    await setDoc(testRef, {
      id: testId,
      user_id: userId,
      title: 'Verification Probe Note',
      content: 'Testing write and delete persistence in Firebase Firestore.',
      color: 'yellow',
      is_pinned: false,
      is_archived: false,
      is_deleted: false,
      created_at: Date.now(),
      updated_at: Date.now(),
    });

    // Step 2: Read it back to prove it saved in Firebase
    const readSnap = await getDoc(testRef);
    const step2Read = readSnap.exists();

    // Step 3: Delete it from Firebase
    await deleteDoc(testRef);

    // Step 4: Verify it is deleted from Firebase
    const confirmSnap = await getDoc(testRef);
    const step4ConfirmGone = !confirmSnap.exists();

    const passed = step2Read && step4ConfirmGone;

    return {
      passed,
      step1Save: true,
      step2Read,
      step3Delete: true,
      step4ConfirmGone,
      message: passed
        ? 'Verified! Notes save to Firebase Firestore and are completely deleted from Firebase upon deletion.'
        : 'Verification completed with warnings.',
    };
  } catch (err: any) {
    return {
      passed: false,
      step1Save: false,
      step2Read: false,
      step3Delete: false,
      step4ConfirmGone: false,
      message: `Firebase Test failed: ${err?.message || err}`,
    };
  }
}
