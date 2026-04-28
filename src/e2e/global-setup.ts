import { execSync } from 'node:child_process';

// Runs once after all webServers are ready, before any test.
// Seeds the auth + Firestore emulator so both "npx playwright test" and
// "npm run test:e2e" entry points share the same setup contract.
export default async function globalSetup() {
  const projectId = process.env.FIREBASE_PROJECT_ID ?? 'todo-rea';

  // Wipe emulator state so leftover data from previous runs never bleeds into tests.
  // Errors are silenced — if the emulator isn't up yet the seed below will fail loudly.
  try {
    execSync(
      `curl -s -X DELETE "http://127.0.0.1:8080/emulator/v1/projects/${projectId}/databases/(default)/documents"`,
      { stdio: 'pipe' },
    );
    execSync(
      `curl -s -X DELETE "http://127.0.0.1:9099/emulator/v1/projects/${projectId}/accounts"`,
      { stdio: 'pipe' },
    );
  } catch {
    // ignore — emulator not yet ready; seed will catch any real failure
  }

  execSync('npm run seed:local:apply', { stdio: 'inherit' });
}
