import { buildConfigFromEnv } from '../env';

const baseEnv = {
  VITE_APP_ENV: 'local',
  VITE_FIREBASE_API_KEY: 'api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'example.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'demo-project',
  VITE_FIREBASE_STORAGE_BUCKET: 'example.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '1234567890',
  VITE_FIREBASE_APP_ID: 'app-id',
  VITE_USE_EMULATOR: 'true',
};

describe('buildConfigFromEnv', () => {
  it('builds a typed config object', () => {
    const config = buildConfigFromEnv(baseEnv);

    expect(config.appEnv).toBe('local');
    expect(config.useEmulators).toBe(true);
    expect(config.firebase.projectId).toBe('demo-project');
  });

  it('throws when a required Firebase value is missing', () => {
    expect(() =>
      buildConfigFromEnv({
        ...baseEnv,
        VITE_FIREBASE_API_KEY: '',
      })
    ).toThrow(/Missing Firebase configuration/);
  });
});
