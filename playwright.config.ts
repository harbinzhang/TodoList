import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './src/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
  },
  webServer: [
    {
      command: 'firebase emulators:start --only auth,firestore,functions --project todo-rea',
      port: 4000,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'vite --mode development --host 127.0.0.1 --port 4173',
      port: 4173,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
