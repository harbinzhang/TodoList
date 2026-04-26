export const Env = {
  mode: () => import.meta.env.MODE as 'development' | 'production',
  isDev() { return this.mode() === 'development'; },
  isProd() { return this.mode() === 'production'; },
  shouldUseEmulators() { return import.meta.env.VITE_USE_EMULATORS === 'true'; },

  firebaseConfig() {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };
  },

  emulatorConfig() {
    return {
      authUrl: `http://${import.meta.env.VITE_EMULATOR_AUTH_HOST || 'localhost:9299'}`,
      firestoreHost: import.meta.env.VITE_EMULATOR_FIRESTORE_HOST || 'localhost',
      firestorePort: parseInt(import.meta.env.VITE_EMULATOR_FIRESTORE_PORT || '8280'),
    };
  },

  assertProdSafety() {
    if (!this.isProd()) return;
    if (this.shouldUseEmulators()) {
      throw new Error(
        '\u{1F6A8} PRODUCTION SAFETY VIOLATION: VITE_USE_EMULATORS must be false in production! ' +
        'Check your .env.production file.'
      );
    }
  },
};
