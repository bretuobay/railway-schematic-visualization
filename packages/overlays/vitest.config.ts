import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const currentDirectory = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: currentDirectory,
  resolve: {
    alias: {
      '@rail-schematic-viz/core': resolve(currentDirectory, '../../src/index.ts'),
      '@rail-schematic-viz/layout': resolve(currentDirectory, '../layout/src/index.ts'),
    },
  },
  test: {
    coverage: {
      provider: 'v8',
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.property.test.ts',
        'src/**/index.ts',
        'src/**/types.ts',
      ],
      include: ['src/**/*.ts'],
      reporter: ['text'],
      thresholds: {
        lines: 80,
        statements: 80,
      },
    },
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.property.test.ts'],
  },
});
