import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  dts: true,
  entry: ['src/index.ts', 'src/layout/index.ts'],
  external: ['@rail-schematic-viz/core'],
  format: ['esm', 'cjs'],
  outDir: 'dist',
  sourcemap: true,
  target: 'es2022',
  treeshake: true,
});
