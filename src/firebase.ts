import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  collection,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { AppConfig, DTREntry, UserProfile } from './types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Mandatory boot connection check
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export async function signInWithGmail() {
  return signInWithPopup(auth, googleProvider);
}

export async function signOutGmail() {
  return firebaseSignOut(auth);
}

function clampString(value: string | undefined, max: number): string {
  return (value || '').trim().slice(0, max);
}

function sanitizeId(id: string): string {
  const cleaned = id.replace(/[^a-zA-Z0-9_-]/g, '');
  return cleaned.slice(0, 128) || crypto.randomUUID();
}

export async function createOrUpdateUserSettings(
  uid: string,
  profile: UserProfile,
  config: AppConfig,
  isNewDoc: boolean
) {
  const path = `users/${uid}`;
  const ref = doc(db, 'users', uid);

  const safeTarget = Math.min(5000, Math.max(1, Number(config.targetHours) || 120));
  const payload = {
    name: clampString(profile.name, 120) || 'OJT Student',
    email: clampString(profile.email, 200),
    picture: clampString(profile.picture, 500),
    supervisorName: clampString(profile.supervisorName, 120),
    department: clampString(profile.department, 120),
    trainingCategory: clampString(profile.trainingCategory, 60),
    targetHours: safeTarget,
    timeFormat: config.timeFormat === '24h' ? '24h' : '12h',
    roundTo15Min: Boolean(config.roundTo15Min),
    onboardingCompleted: Boolean(config.onboardingCompleted),
    acceptedTermsAt: clampString(config.acceptedTermsAt, 64),
    updatedAt: serverTimestamp(),
  };

  try {
    if (isNewDoc) {
      await setDoc(ref, {
        uid,
        ...payload,
        createdAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, payload);
    }
  } catch (error) {
    handleFirestoreError(error, isNewDoc ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function saveDTREntry(uid: string, entry: DTREntry, isUpdate: boolean) {
  const entryId = sanitizeId(entry.id);
  const path = `users/${uid}/entries/${entryId}`;
  const ref = doc(db, 'users', uid, 'entries', entryId);

  const safeBreak = Math.min(360, Math.max(0, Number(entry.breakMinutes) || 0));
  const safeHours = Math.min(24, Math.max(0, Number(entry.totalHours) || 0));

  const basePayload = {
    date: entry.date.slice(0, 10),
    timeIn: clampString(entry.timeIn, 10) || '07:00',
    timeOut: clampString(entry.timeOut, 10) || '17:00',
    breakMinutes: safeBreak,
    isOvertime: Boolean(entry.isOvertime),
    overtimeReason: clampString(entry.overtimeReason, 300),
    remarks: clampString(entry.remarks, 500),
    type: entry.type === 'holiday' || entry.type === 'absent' ? entry.type : 'regular',
    totalHours: safeHours,
    updatedAt: serverTimestamp(),
  };

  try {
    if (isUpdate) {
      await updateDoc(ref, basePayload);
    } else {
      await setDoc(ref, {
        uid,
        ...basePayload,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, isUpdate ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function saveDTREntriesBatch(uid: string, entries: DTREntry[]) {
  const path = `users/${uid}/entries`;
  try {
    // Firestore batch limit is 500 writes per batch
    for (let i = 0; i < entries.length; i += 450) {
      const chunk = entries.slice(i, i + 450);
      const batch = writeBatch(db);
      for (const entry of chunk) {
        const entryId = sanitizeId(entry.id);
        const ref = doc(collection(db, 'users', uid, 'entries'), entryId);
        batch.set(ref, {
          uid,
          date: entry.date.slice(0, 10),
          timeIn: clampString(entry.timeIn, 10) || '07:00',
          timeOut: clampString(entry.timeOut, 10) || '17:00',
          breakMinutes: Math.min(360, Math.max(0, Number(entry.breakMinutes) || 0)),
          isOvertime: Boolean(entry.isOvertime),
          overtimeReason: clampString(entry.overtimeReason, 300),
          remarks: clampString(entry.remarks, 500),
          type: entry.type === 'holiday' || entry.type === 'absent' ? entry.type : 'regular',
          totalHours: Math.min(24, Math.max(0, Number(entry.totalHours) || 0)),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteDTREntryDoc(uid: string, entryId: string) {
  const safeId = sanitizeId(entryId);
  const path = `users/${uid}/entries/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'entries', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function deleteAllDTREntries(uid: string, entryIds: string[]) {
  const path = `users/${uid}/entries`;
  try {
    for (let i = 0; i < entryIds.length; i += 450) {
      const chunk = entryIds.slice(i, i + 450);
      const batch = writeBatch(db);
      for (const id of chunk) {
        batch.delete(doc(db, 'users', uid, 'entries', sanitizeId(id)));
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
