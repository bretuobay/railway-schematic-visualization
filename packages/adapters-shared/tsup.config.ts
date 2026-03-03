import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  dts: true,
  entry: [
    'src/index.ts',
    'src/events/index.ts',
    'src/export/index.ts',
    'src/lifecycle/index.ts',
    'src/errors/index.ts',
    'src/types/index.ts',
  ],
  external: [
    '@rail-schematic-viz/core',
    '@rail-schematic-viz/layout',
    '@rail-schematic-viz/overlays',
  ],
  format: ['esm', 'cjs'],
  outDir: 'dist',
  sourcemap: true,
  target: 'es2022',
  treeshake: true,
});
