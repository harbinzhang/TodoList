import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        plugins: [react()],
        test: {
          name: 'unit',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./src/test/setup.ts'],
          include: [
            'src/config/**/*.test.ts',
            'src/firebase/**/*.test.ts',
            'src/services/**/*.test.ts',
            'src/utils/**/*.test.ts',
            'src/components/mindmap/__tests__/*.test.{ts,tsx}',
            'src/components/tasks/__tests__/TaskDetail*.test.{ts,tsx}',
            'src/components/tasks/__tests__/TaskItem.test.tsx',
          ],
        },
      },
      {
        test: {
          name: 'integration',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./src/test/setup.ts'],
          include: ['src/**/*.integration.test.tsx'],
        },
      },
      {
        test: {
          name: 'contract',
          environment: 'node',
          globals: true,
          include: ['src/contract/**/*.test.ts'],
        },
      },
    ],
  },
});
