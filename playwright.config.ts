import { defineConfig } from '@playwright/test';

const skipEmulatorWebServer = process.env.PLAYWRIGHT_SKIP_EMULATOR_WEBSERVER === 'true';
const projectId = process.env.FIREBASE_PROJECT_ID ?? 'todo-rea';

// Demo values for emulator mode — real Firebase validation is bypassed by the emulator
const emulatorViteEnv: Record<string, string> = {
  VITE_APP_ENV: 'local',
  VITE_USE_EMULATOR: 'true',
  VITE_FIREBASE_API_KEY: 'demo-api-key',
  VITE_FIREBASE_AUTH_DOMAIN: `${projectId}.firebaseapp.com`,
  VITE_FIREBASE_PROJECT_ID: projectId,
  VITE_FIREBASE_STORAGE_BUCKET: `${projectId}.appspot.com`,
  VITE_FIREBASE_MESSAGING_SENDER_ID: '1234567890',
  VITE_FIREBASE_APP_ID: 'demo-app-id',
};

export default defineConfig({
  globalSetup: './src/e2e/global-setup.ts',
  testDir: './src/e2e',
  workers: 1,
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
  },
  webServer: [
    ...(!skipEmulatorWebServer
      ? [
          {
            command: 'firebase emulators:start --only auth,firestore,functions --project todo-rea',
            port: 4000,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
          },
        ]
      : []),
    {
      command: 'vite --mode development --host 127.0.0.1 --port 4173',
      port: 4173,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: emulatorViteEnv,
    },
  ],
});
