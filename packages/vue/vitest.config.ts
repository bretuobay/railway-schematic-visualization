import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const currentDirectory = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: currentDirectory,
  resolve: {
    alias: {
      '@rail-schematic-viz/adapters-shared': resolve(
        currentDirectory,
        '../adapters-shared/src/index.ts',
      ),
      '@rail-schematic-viz/core': resolve(currentDirectory, '../../src/index.ts'),
      '@rail-schematic-viz/layout': resolve(currentDirectory, '../layout/src/index.ts'),
      '@rail-schematic-viz/overlays': resolve(currentDirectory, '../overlays/src/index.ts'),
    },
  },
  test: {
    coverage: {
      exclude: ['src/**/*.test.ts'],
      include: ['src/**/*.ts'],
      provider: 'v8',
      reporter: ['text'],
      thresholds: {
        lines: 80,
        statements: 80,
      },
    },
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
});
