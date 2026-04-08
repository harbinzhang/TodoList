import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions';
import { validateStartup } from '../config/hostedSafety';

let firebaseInitError: Error | null = null;
let initializedApp: FirebaseApp | null = null;
let initializedAuth: Auth | null = null;
let initializedDb: Firestore | null = null;
let initializedFunctions: Functions | null = null;
let useEmulators = false;

try {
  const config = validateStartup();
  initializedApp = initializeApp(config.firebase);
  initializedAuth = getAuth(initializedApp);
  initializedDb = getFirestore(initializedApp);
  initializedFunctions = getFunctions(initializedApp);
  useEmulators = config.useEmulators;
} catch (error) {
  firebaseInitError = error instanceof Error ? error : new Error(String(error));
}

export const app = initializedApp as FirebaseApp;
export const auth = initializedAuth as Auth;
export const db = initializedDb as Firestore;
export const functions = initializedFunctions as Functions;
export { firebaseInitError };

let emulatorsConnected = false;

function connectFirebaseEmulators() {
  if (
    emulatorsConnected ||
    !useEmulators ||
    !initializedAuth ||
    !initializedDb ||
    !initializedFunctions
  ) {
    return;
  }

  connectAuthEmulator(initializedAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(initializedDb, '127.0.0.1', 8080);
  connectFunctionsEmulator(initializedFunctions, '127.0.0.1', 5001);
  emulatorsConnected = true;
}

connectFirebaseEmulators();

export default app;
