import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  initializeAuth,
  type Auth,
  type Persistence,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Metro resolves `@firebase/auth` to the React Native build; public `.d.ts` omits this helper.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getReactNativePersistence } = require('@firebase/auth') as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};

/**
 * Reads Firebase Web SDK config from Expo public env vars.
 * Firebase Storage is not used (no file uploads); `storageBucket` is optional for Auth/Firestore.
 */
export function getFirebaseConfigFromEnv() {
  return {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
  };
}

export function isFirebaseConfigured(): boolean {
  const c = getFirebaseConfigFromEnv();
  return Boolean(c.apiKey && c.projectId && c.appId);
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase is not configured. Copy .env.example to .env and set EXPO_PUBLIC_FIREBASE_* (never commit .env).'
    );
  }
  if (!appInstance) {
    const cfg = getFirebaseConfigFromEnv();
    appInstance = getApps().length === 0 ? initializeApp(cfg) : getApps()[0]!;
  }
  return appInstance;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    const a = getFirebaseApp();
    if (Platform.OS === 'web') {
      try {
        authInstance = initializeAuth(a, { persistence: browserLocalPersistence });
      } catch {
        authInstance = getAuth(a);
      }
    } else {
      try {
        authInstance = initializeAuth(a, {
          persistence: getReactNativePersistence(AsyncStorage),
        });
      } catch {
        authInstance = getAuth(a);
      }
    }
  }
  return authInstance;
}

export function getFirestoreDb(): Firestore {
  if (!firestoreInstance) {
    firestoreInstance = getFirestore(getFirebaseApp());
  }
  return firestoreInstance;
}
