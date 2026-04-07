import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { cfg, shouldUseEmulators } from '../config/env';

const app = initializeApp(cfg().firebase);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

let emulatorsConnected = false;

function connectFirebaseEmulators() {
  if (emulatorsConnected || !shouldUseEmulators()) {
    return;
  }

  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  emulatorsConnected = true;
}

connectFirebaseEmulators();

export { app };
export default app;
