import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { Env } from '../env';

const app = initializeApp(Env.firebaseConfig());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let auth: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any;

try {
  auth = getAuth(app);
  db = getFirestore(app);

  if (Env.shouldUseEmulators()) {
    const emu = Env.emulatorConfig();
    connectAuthEmulator(auth, emu.authUrl, { disableWarnings: true });
    connectFirestoreEmulator(db, emu.firestoreHost, emu.firestorePort);
    console.log('\u{1F527} Using Firebase Emulators');
  }
} catch {
  // Firebase init may fail in demo/dev mode without valid config
  auth = {} as ReturnType<typeof getAuth>;
  db = {} as ReturnType<typeof getFirestore>;
}

export { auth, db };
export default app;
