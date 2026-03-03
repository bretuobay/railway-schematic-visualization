import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@rail-schematic-viz/adapters-shared': '/packages/adapters-shared/src/index.ts',
      '@rail-schematic-viz/adapters-regional': '/packages/adapters-regional/src/index.ts',
      '@rail-schematic-viz/brushing-linking': '/packages/brushing-linking/src/index.ts',
      '@rail-schematic-viz/canvas': '/packages/canvas/src/index.ts',
      '@rail-schematic-viz/context-menu': '/packages/context-menu/src/index.ts',
      '@rail-schematic-viz/core': '/src/index.ts',
      '@rail-schematic-viz/i18n': '/packages/i18n/src/index.ts',
      '@rail-schematic-viz/layout': '/packages/layout/src/index.ts',
      '@rail-schematic-viz/overlays': '/packages/overlays/src/index.ts',
      '@rail-schematic-viz/plugins': '/packages/plugins/src/index.ts',
      '@rail-schematic-viz/react': '/packages/react/src/index.ts',
      '@rail-schematic-viz/security': '/packages/security/src/index.ts',
      '@rail-schematic-viz/ssr': '/packages/ssr/src/index.ts',
      '@rail-schematic-viz/themes': '/packages/themes/src/index.ts',
      '@rail-schematic-viz/vue': '/packages/vue/src/index.ts',
      '@rail-schematic-viz/web-component': '/packages/web-component/src/index.ts',
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/__fixtures__/**',
        'src/parsers/Parser.ts',
        'src/parsers/schema.ts',
        'src/model/RailEdge.ts',
        'src/model/RailLine.ts',
        'src/model/RailNode.ts',
        'src/coordinates/types.ts',
        'src/types.ts',
      ],
      reporter: ['text'],
      thresholds: {
        lines: 80,
        statements: 80,
      },
    },
  },
});
