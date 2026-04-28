import { spawn } from 'node:child_process';

const projectId = process.env.FIREBASE_PROJECT_ID || 'todo-rea';
const playwrightArgs = process.argv.slice(2);

const localViteEnv = {
  VITE_APP_ENV: 'local',
  VITE_USE_EMULATOR: 'true',
  VITE_FIREBASE_API_KEY: 'demo-api-key',
  VITE_FIREBASE_AUTH_DOMAIN: `${projectId}.firebaseapp.com`,
  VITE_FIREBASE_PROJECT_ID: projectId,
  VITE_FIREBASE_STORAGE_BUCKET: `${projectId}.appspot.com`,
  VITE_FIREBASE_MESSAGING_SENDER_ID: '1234567890',
  VITE_FIREBASE_APP_ID: 'demo-app-id',
};

function shellQuote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

const playwrightCommand = [
  'PLAYWRIGHT_SKIP_EMULATOR_WEBSERVER=true',
  'npx',
  'playwright',
  'test',
  ...playwrightArgs.map(shellQuote),
].join(' ');

const testCommand = `npm run seed:local:apply && ${playwrightCommand}`;

const child = spawn(
  'firebase',
  [
    'emulators:exec',
    '--only',
    'auth,firestore,functions',
    '--project',
    projectId,
    testCommand,
  ],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      ...localViteEnv,
      FIREBASE_PROJECT_ID: projectId,
    },
  }
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});
