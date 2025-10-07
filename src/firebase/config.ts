import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

// Connect to emulators in development. Avoid reaching into private SDK internals
// because doing so can throw when running in certain build modes.
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR !== 'false') {
  try {
    // We only attempt to connect once per session. Firebase SDK will throw if we
    // call these twice; swallow the error silently in that case.
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    console.log('✅ Using Firebase emulators (Auth:9099 Firestore:8080)');
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg.includes('already')) {
      // Safe to ignore duplicate connection attempts
      console.debug('Emulators already connected.');
    } else {
      console.warn('Failed to connect to emulators, falling back to prod:', e);
    }
  }
}

export default app;