import { vi } from 'vitest';

vi.mock('../env', () => ({
  cfg: vi.fn(() => ({ appEnv: 'production' })),
  isLocal: vi.fn(() => false),
  shouldUseEmulators: vi.fn(() => true),
}));

describe('assertHostedSafety', () => {
  it('throws when hosted envs still point at emulators', async () => {
    await expect(import('../hostedSafety')).rejects.toThrow(/Refusing to boot production/);
  });
});
