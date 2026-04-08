import { buildConfigFromEnv, tryBuildConfigFromEnv, type AppConfig, type EnvInput } from './env';

const EXPECTED_APP_ENV_BY_MODE = {
  development: 'local',
  staging: 'staging',
  production: 'production',
} as const;

export function assertHostedSafety(config: Pick<AppConfig, 'appEnv' | 'useEmulators'>) {
  if (config.appEnv !== 'local' && config.useEmulators) {
    throw new Error(
      `[startup] Refusing to boot ${config.appEnv} with Firebase emulators enabled.`
    );
  }
}

export function assertModeMatchesAppEnv(mode: string, config: Pick<AppConfig, 'appEnv'>) {
  const expectedAppEnv = EXPECTED_APP_ENV_BY_MODE[mode as keyof typeof EXPECTED_APP_ENV_BY_MODE];

  if (expectedAppEnv && config.appEnv !== expectedAppEnv) {
    throw new Error(
      `[startup] Build mode "${mode}" expects VITE_APP_ENV=${expectedAppEnv}, received ${config.appEnv}.`
    );
  }
}

export function getStartupError(env: EnvInput = import.meta.env) {
  const result = tryBuildConfigFromEnv(env);

  if (result.error) {
    return result.error;
  }

  try {
    assertHostedSafety(result.config);
    return null;
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
}

export function validateStartup(env: EnvInput = import.meta.env) {
  const config = buildConfigFromEnv(env);
  assertHostedSafety(config);
  return config;
}

export function validateStartupForMode(mode: string, env: EnvInput = import.meta.env) {
  const config = validateStartup(env);
  assertModeMatchesAppEnv(mode, config);
  return config;
}
