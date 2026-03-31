import { Env } from './env';

// Run production safety checks before any app initialization.
// This prevents deploying a build that connects to emulators.
Env.assertProdSafety();
