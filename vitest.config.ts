import { defineConfig } from 'vitest/config';

export default defineConfig({
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
