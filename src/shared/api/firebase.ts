// src/shared/api/firebase.ts
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAuth, Auth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, AppCheck } from 'firebase/app-check';
import { useAuthStore } from '../store/authStore';

/**
 * PSA Business Suite: Firebase Configuration Management
 * Priority: 1. Platform Config File -> 2. Environment Variables -> 3. Error
 */
const getFirebaseConfig = () => {
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)'
  };

  return config;
};

const firebaseConfig = getFirebaseConfig();
const isDummy = (val: string | undefined) => !val || val === '' || val.startsWith('dummy-');
export const isConfigValid = !isDummy(firebaseConfig.apiKey);

// Notify store about configuration status
if (isConfigValid && typeof window !== 'undefined') {
  setTimeout(() => {
    useAuthStore.getState().setFirebaseReady(true);
  }, 0);
} else if (typeof window !== 'undefined') {
  console.warn('[Firebase] Warning: VITE_FIREBASE_API_KEY is missing or invalid. Cloud features will be disabled. App will continue in Offline-First mode.');
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
    console.error('[Firebase] Failed to initialize App:', error);
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

// Initialize Services Safely
export const auth = getSafeAuth();
export const firestoreDb = getSafeFirestore();
export const storage = getSafeStorage();

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
    } catch (e) {
      console.warn('[Firebase] App Check initialization failed');
    }
  }
}

// FASE 3.2: Set persistence to LOCAL for Offline-First resilience
if (firebaseApp) {
  setPersistence(auth, browserLocalPersistence)
    .catch((err) => console.error('[Firebase] Persistence Error:', err));
}

export const safeFirestoreCall = async <T>(operation: () => Promise<T>): Promise<T> => {
  if (!isConfigValid) {
    throw new Error('Firestore operation failed: Firebase API Key is not configured correctly.');
  }
  try {
    return await operation();
  } catch (error) {
    console.error('Firestore operation failed:', error);
    throw error;
  }
};
