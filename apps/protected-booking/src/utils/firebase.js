import { IS_PREPROD } from './preview';
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

let app;
let auth;
let db;
const enabled = import.meta.env.VITE_BOOKING_REVIEW_ENABLED === 'true';
const emulator = import.meta.env.VITE_FIREBASE_EMULATORS === 'true';
const firebaseConfig = emulator ? {
  projectId: 'demo-chilik-repair', apiKey: 'demo-key', authDomain: 'localhost',
} : {
  projectId: import.meta.env.VITE_BOOKING_FIREBASE_PROJECT_ID,
  apiKey: import.meta.env.VITE_BOOKING_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_BOOKING_FIREBASE_AUTH_DOMAIN,
  appId: import.meta.env.VITE_BOOKING_FIREBASE_APP_ID,
};

// Default builds and preprod never initialize Auth or Firestore. A later live
// build needs an explicit project/configuration; it cannot inherit legacy env.
if (enabled && !IS_PREPROD && (emulator || (
  firebaseConfig.projectId === 'hilik-site'
  && firebaseConfig.authDomain === 'hilik-site.firebaseapp.com'
  && firebaseConfig.apiKey && firebaseConfig.appId
))) {
  app = initializeApp(firebaseConfig, 'chilik-protected-booking');
  auth = getAuth(app);
  db = getFirestore(app);
  if (emulator) {
    connectAuthEmulator(auth, 'http://127.0.0.1:18784', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 18783);
  }
}

export { app, auth, db };
export const APP_ID = 'hilik-rosenberg-v1';
