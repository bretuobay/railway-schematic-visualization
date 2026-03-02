import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const currentDirectory = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@rail-schematic-viz/core': resolve(currentDirectory, '../../src/index.ts'),
    },
  },
  test: {
    coverage: {
      exclude: [
        'examples/**',
        'src/**/*.test.ts',
        'src/**/*.property.test.ts',
        'src/**/*.test-helpers.ts',
        'src/**/index.ts',
        'src/accessibility/FocusManager.ts',
        'src/animation/AnimationSystem.ts',
        'src/components/Minimap.ts',
        'src/interactions/KeyboardNavigation.ts',
        'src/interactions/TouchGestures.ts',
        'src/layout/LayoutStrategy.ts',
        'src/layout/FixedSegmentLayout.ts',
        'src/spatial/RTree.ts',
        'src/types/**',
        'src/viewport/ViewportController.ts',
        'src/viewport/ViewportCulling.ts',
      ],
      include: ['src/**/*.ts'],
      reporter: ['text'],
    },
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
