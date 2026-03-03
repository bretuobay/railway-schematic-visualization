import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  dts: true,
  entry: [
    'src/index.ts',
    'src/types/index.ts',
    'src/errors/index.ts',
    'src/registry/index.ts',
    'src/manager/index.ts',
    'src/overlays/index.ts',
    'src/rendering/index.ts',
    'src/colors/index.ts',
    'src/spatial/index.ts',
    'src/annotations/index.ts',
    'src/builtins/index.ts',
    'src/legend/index.ts',
    'src/performance/index.ts',
    'src/accessibility/index.ts',
  ],
  external: ['@rail-schematic-viz/core', '@rail-schematic-viz/layout'],
  format: ['esm', 'cjs'],
  outDir: 'dist',
  sourcemap: true,
  target: 'es2022',
  treeshake: true,
});
