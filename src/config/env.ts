type AppEnv = 'local' | 'staging' | 'production';

interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

interface AppConfig {
  appEnv: AppEnv;
  firebase: FirebaseWebConfig;
  useEmulators: boolean;
}

type EnvInput = Partial<Record<keyof ImportMetaEnv, string | undefined>>;

const REQUIRED_FIREBASE_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

function getRequiredEnv<K extends keyof ImportMetaEnv>(env: EnvInput, key: K) {
  const value = env[key];

  if (!value || String(value).trim().length === 0) {
    throw new Error(`[env] Missing required environment variable: ${key}`);
  }

  return value as ImportMetaEnv[K];
}

function parseAppEnv(value: string | undefined): AppEnv {
  if (value === 'local' || value === 'staging' || value === 'production') {
    return value;
  }

  throw new Error(`[env] Invalid VITE_APP_ENV: ${String(value)}`);
}

export function validateRequiredFirebaseConfig(env: EnvInput) {
  const missingKeys = REQUIRED_FIREBASE_KEYS.filter((key) => {
    const value = env[key];
    return !value || String(value).trim().length === 0;
  });

  if (missingKeys.length > 0) {
    throw new Error(
      `[env] Missing Firebase configuration: ${missingKeys.join(', ')}`
    );
  }
}

export function buildConfigFromEnv(env: EnvInput): AppConfig {
  validateRequiredFirebaseConfig(env);

  return {
    appEnv: parseAppEnv(env.VITE_APP_ENV),
    useEmulators: env.VITE_USE_EMULATOR === 'true',
    firebase: {
      apiKey: getRequiredEnv(env, 'VITE_FIREBASE_API_KEY'),
      authDomain: getRequiredEnv(env, 'VITE_FIREBASE_AUTH_DOMAIN'),
      projectId: getRequiredEnv(env, 'VITE_FIREBASE_PROJECT_ID'),
      storageBucket: getRequiredEnv(env, 'VITE_FIREBASE_STORAGE_BUCKET'),
      messagingSenderId: getRequiredEnv(env, 'VITE_FIREBASE_MESSAGING_SENDER_ID'),
      appId: getRequiredEnv(env, 'VITE_FIREBASE_APP_ID'),
      measurementId: env.VITE_FIREBASE_MEASUREMENT_ID?.trim() || undefined,
    },
  };
}

let cachedConfig: AppConfig | null = null;

export function cfg(): AppConfig {
  if (!cachedConfig) {
    cachedConfig = buildConfigFromEnv(import.meta.env);
  }

  return cachedConfig;
}

export function isLocal() {
  return cfg().appEnv === 'local';
}

export function isStaging() {
  return cfg().appEnv === 'staging';
}

export function isProd() {
  return cfg().appEnv === 'production';
}

export function shouldUseEmulators() {
  return cfg().useEmulators;
}
