import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  dts: true,
  entry: ['src/index.ts'],
  external: [
    '@rail-schematic-viz/core',
    '@rail-schematic-viz/layout',
    '@rail-schematic-viz/overlays',
    '@rail-schematic-viz/adapters-shared',
  ],
  format: ['esm', 'cjs'],
  outDir: 'dist',
  sourcemap: true,
  target: 'es2022',
  treeshake: true,
});
