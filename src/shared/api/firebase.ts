// src/shared/api/firebase.ts
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAuth, Auth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFunctions, Functions } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { useAuthStore } from '../store/authStore';
import { logger } from '../../lib/logger';
const modules = import.meta.glob('../../../firebase-applet-confi*.json', { eager: true });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const configModule = modules['../../../firebase-applet-config.json'] as any;
const firebaseConfigJSONRaw = configModule?.default || {};

interface FirebaseConfigJSON {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  firestoreDatabaseId?: string;
}

const firebaseConfigJSON: FirebaseConfigJSON = firebaseConfigJSONRaw as FirebaseConfigJSON;

/**
 * PSA Business Suite: Firebase Configuration Management
 * Priority: 1. Platform Config File -> 2. Environment Variables -> 3. Error
 */
const getFirebaseConfig = () => {
  const config = {
    apiKey: firebaseConfigJSON.apiKey || import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: firebaseConfigJSON.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: firebaseConfigJSON.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: firebaseConfigJSON.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: firebaseConfigJSON.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: firebaseConfigJSON.appId || import.meta.env.VITE_FIREBASE_APP_ID,
    firestoreDatabaseId: firebaseConfigJSON.firestoreDatabaseId || import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)'
  };
  return config;
};

const firebaseConfig = getFirebaseConfig();
// Simple validation
export const isConfigValid = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== 'YOUR_API_KEY';

// Notify store about configuration status
if (isConfigValid && typeof window !== 'undefined') {
  setTimeout(() => {
    useAuthStore.getState().setFirebaseReady(true);
  }, 0);
} else if (typeof window !== 'undefined') {
  logger.warn('[Firebase] Warning: Firebase configuration is missing or invalid. Cloud features will be disabled. App will continue in Offline-First mode.');
  setTimeout(() => {
    useAuthStore.getState().setFirebaseReady(false);
    useAuthStore.getState().setFirebaseUser(null);
  }, 0);
}

// Initialize Firebase App (Singleton)
let firebaseApp: FirebaseApp | null = null;
if (isConfigValid) {
  try {
    firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  } catch (error) {
    logger.error('[Firebase] Failed to initialize App', error);
  }
}

export const app = firebaseApp as FirebaseApp;

/**
 * @ai_context: F4 - Firebase Unconfigured Proxy
 * Creates a proxy that throws descriptive errors when accessed if Firebase is not configured.
 */
function createUnconfiguredProxy<T>(serviceName: string): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Proxy({} as any, {
    get(_, prop: string) {
      throw new Error(
        `[PSA] ${serviceName} belum terkonfigurasi — method "${prop}" dipanggil.\n` +
        'Pastikan semua variabel VITE_FIREBASE_* di .env sudah diisi dengan benar.\n' +
        'Lihat .env.example untuk panduan.'
      );
    }
  });
}

// Safe Service Getters
const getSafeAuth = (): Auth => {
  if (!firebaseApp) {
    // Return a proxy or dummy-like object that throws on use, but allows initialization
    // Special handling for auth because many listeners start on boot
    return { 
      currentUser: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onAuthStateChanged: (callback: any) => {
        // Immediately invoke callback with null to indicate no user and initialization complete
        setTimeout(() => callback(null), 0);
        return () => {};
      },
      signOut: async () => {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any as Auth;
  }
  return getAuth(firebaseApp);
};

const getSafeFirestore = (): Firestore => {
  if (!firebaseApp) return createUnconfiguredProxy<Firestore>('Firestore');
  return getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
};

const getSafeStorage = (): FirebaseStorage => {
  if (!firebaseApp) return createUnconfiguredProxy<FirebaseStorage>('Firebase Storage');
  return getStorage(firebaseApp);
};

const getSafeFunctions = (): Functions => {
  if (!firebaseApp) return createUnconfiguredProxy<Functions>('Firebase Functions');
  return getFunctions(firebaseApp, 'asia-southeast2'); // Or default
};

// Initialize Services Safely
export const auth = getSafeAuth();
export const firestoreDb = getSafeFirestore();
export const storage = getSafeStorage();
export const functions = getSafeFunctions();

// App Check (Anti-Bot)
if (typeof window !== 'undefined' && firebaseApp && isConfigValid) {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }

  const recaptchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  if (recaptchaKey && recaptchaKey !== 'dummy-site-key' && recaptchaKey !== '') {
    try {
      initializeAppCheck(firebaseApp, {
        provider: new ReCaptchaEnterpriseProvider(recaptchaKey),
        isTokenAutoRefreshEnabled: true
      });
    } catch (_e) {
      logger.warn('[Firebase] App Check initialization failed');
    }
  }
}

// FASE 3.2: Set persistence to LOCAL for Offline-First resilience
if (firebaseApp) {
  setPersistence(auth, browserLocalPersistence)
    .catch((err) => logger.error('[Firebase] Persistence Error', err));
}

export const safeFirestoreCall = async <T>(operation: () => Promise<T>): Promise<T> => {
  if (!isConfigValid) {
    throw new Error('Firestore operation failed: Firebase API Key is not configured correctly.');
  }
  try {
    return await operation();
  } catch (error) {
    logger.error('Firestore operation failed', error);
    throw error;
  }
};

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
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  logger.error('Firestore Error', { details: errInfo });
  throw new Error(JSON.stringify(errInfo));
}
