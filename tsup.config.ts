import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  dts: true,
  entry: [
    'src/index.ts',
    'src/types.ts',
    'src/builder/index.ts',
    'src/coordinates/index.ts',
    'src/errors/index.ts',
    'src/parsers/index.ts',
    'src/renderer/index.ts',
  ],
  format: ['esm', 'cjs'],
  outDir: 'dist',
  sourcemap: true,
  target: 'es2022',
  treeshake: true,
});
