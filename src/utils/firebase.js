import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  
  // Sign in anonymously
  signInAnonymously(auth).catch((error) => {
    console.error('Firebase auth error:', error);
  });
} catch (error) {
  console.error('Firebase initialization error:', error);
}

export { app, auth, db };
export const APP_ID = "hilik-rosenberg-v1";
