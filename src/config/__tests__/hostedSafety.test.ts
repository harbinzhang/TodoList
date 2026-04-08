import {
  assertHostedSafety,
  getStartupError,
  validateStartupForMode,
} from '../hostedSafety';

describe('hostedSafety', () => {
  it('throws when hosted envs still point at emulators', () => {
    expect(() =>
      assertHostedSafety({
        appEnv: 'production',
        useEmulators: true,
      })
    ).toThrow(/Refusing to boot production/);
  });

  it('returns env validation errors without throwing at import time', () => {
    expect(
      getStartupError({
        VITE_APP_ENV: 'local',
      })?.message
    ).toMatch(/Missing Firebase configuration/);
  });

  it('throws when build mode and VITE_APP_ENV disagree', () => {
    expect(() =>
      validateStartupForMode('production', {
        VITE_APP_ENV: 'staging',
        VITE_FIREBASE_API_KEY: 'api-key',
        VITE_FIREBASE_AUTH_DOMAIN: 'example.firebaseapp.com',
        VITE_FIREBASE_PROJECT_ID: 'demo-project',
        VITE_FIREBASE_STORAGE_BUCKET: 'example.appspot.com',
        VITE_FIREBASE_MESSAGING_SENDER_ID: '1234567890',
        VITE_FIREBASE_APP_ID: 'app-id',
        VITE_USE_EMULATOR: 'false',
      })
    ).toThrow(/expects VITE_APP_ENV=production/);
  });
});
