import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  dts: true,
  entry: [
    'src/index.ts',
    'src/layout/index.ts',
    'src/viewport/index.ts',
    'src/interactions/index.ts',
    'src/minimap/index.ts',
    'src/performance/index.ts',
    'src/animation/index.ts',
    'src/accessibility/index.ts',
    'src/validation/index.ts',
    'src/errors/index.ts',
    'src/types/index.ts',
  ],
  external: ['@rail-schematic-viz/core'],
  format: ['esm', 'cjs'],
  outDir: 'dist',
  sourcemap: true,
  target: 'es2022',
  treeshake: true,
});
