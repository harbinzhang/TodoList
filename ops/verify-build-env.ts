import { resolve } from 'node:path';
import { loadEnv } from 'vite';
import { validateStartupForMode } from '../src/config/hostedSafety';

function readOption(flag: string) {
  const index = process.argv.indexOf(flag);

  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

const mode = process.argv[2] || 'production';
const envDir = resolve(readOption('--env-dir') || process.cwd());

async function main() {
  console.info(`[verify-build-env] mode=${mode}`);
  console.info(`[verify-build-env] envDir=${envDir}`);

  const env = loadEnv(mode, envDir, '');
  const config = validateStartupForMode(mode, env);

  console.info(`[verify-build-env] appEnv=${config.appEnv}`);
  console.info(`[verify-build-env] useEmulators=${config.useEmulators}`);
  console.info(`[verify-build-env] firebaseProject=${config.firebase.projectId}`);
  console.info('[verify-build-env] OK');
}

main().catch((error) => {
  console.error('[verify-build-env] Failed.');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
