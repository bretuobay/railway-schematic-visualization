import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  dts: true,
  entry: ['src/index.ts'],
  external: [
    '@rail-schematic-viz/adapters-shared',
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
