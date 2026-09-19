import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyCXrBqy3a2Ig7J3JE04av1rviedQfPrah0",
  authDomain: "hilik-rosenberg-ddb9b.firebaseapp.com",
  projectId: "hilik-rosenberg-ddb9b",
  storageBucket: "hilik-rosenberg-ddb9b.firebasestorage.app",
  messagingSenderId: "401698649096",
  appId: "1:401698649096:web:d17c5296a859e47b8c4dbd"
};

let app;
let auth;
let db;
let functions;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  // Initialize Cloud Functions with European region (for Israel)
  functions = getFunctions(app, 'europe-west1');

  // Connect to emulator if running locally (uncomment for local testing)
  // if (window.location.hostname === 'localhost') {
  //   connectFunctionsEmulator(functions, 'localhost', 5001);
  // }

  // Sign in anonymously
  signInAnonymously(auth).catch((error) => {
    console.error('Firebase auth error:', error);
  });
} catch (error) {
  console.error('Firebase initialization error:', error);
}

export { app, auth, db, functions };
export const APP_ID = "hilik-rosenberg-v1";
