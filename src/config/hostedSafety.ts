import { cfg, isLocal, shouldUseEmulators } from './env';

export function assertHostedSafety() {
  const config = cfg();

  if (!isLocal() && shouldUseEmulators()) {
    throw new Error(
      `[startup] Refusing to boot ${config.appEnv} with Firebase emulators enabled.`
    );
  }
}

assertHostedSafety();
