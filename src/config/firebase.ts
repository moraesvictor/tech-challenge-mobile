import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Metro resolves `@firebase/auth` to the React Native build; public `.d.ts` omits this helper.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getReactNativePersistence } = require('@firebase/auth') as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};

/**
 * Web app configuration from Firebase Console (personal-finance-manager-1123c).
 * Firebase Analytics is intentionally not used in this Expo / React Native app.
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyDePGb0xugBXtQY8gd3P3heLT2x4PKWfp8',
  authDomain: 'personal-finance-manager-1123c.firebaseapp.com',
  projectId: 'personal-finance-manager-1123c',
  storageBucket: 'personal-finance-manager-1123c.firebasestorage.app',
  messagingSenderId: '753651847983',
  appId: '1:753651847983:web:06b776f0b04a26b19c87da',
} as const;

export const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]!;

let authInstance: Auth;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  authInstance = getAuth(app);
}

/** Firebase Authentication (email/password, AsyncStorage persistence). */
export const auth: Auth = authInstance;

/** Cloud Firestore. */
export const firestore: Firestore = getFirestore(app);

/** Firebase Storage (receipts). */
export const storage: FirebaseStorage = getStorage(app);
