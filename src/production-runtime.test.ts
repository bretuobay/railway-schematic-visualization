import { accessSync, constants, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

function assertFileExists(relativePath: string): void {
  accessSync(resolve(process.cwd(), relativePath), constants.F_OK);
}

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('production runtime validation', () => {
  it('ships a dedicated runtime validation script and benchmark scenarios', () => {
    assertFileExists('scripts/check-production-runtime.mjs');

    const packageJson = readWorkspaceFile('package.json');
    const benchmark = readWorkspaceFile('benchmarks/rendering.benchmark.mjs');

    expect(packageJson).toContain('"check:runtime": "node scripts/check-production-runtime.mjs"');
    expect(packageJson).toContain('"check:signoff": "npm run check && npm run check:conformance && npm run check:release-dry-run && npm run check:runtime"');
    expect(benchmark).toContain("scenarioName = argumentMap.get('scenario') ?? 'baseline'");
    expect(benchmark).toContain("name: 'baseline'");
    expect(benchmark).toContain("name: 'large'");
    expect(benchmark).toContain("name: 'stress'");
    expect(benchmark).toContain('withinBudget');
  });

  it('documents runtime validation in contributor and rollout docs', () => {
    const testingGuidelines = readWorkspaceFile('docs/testing-guidelines.md');
    const productionGuide = readWorkspaceFile('docs/guides/production-rollout.md');

    expect(testingGuidelines).toContain('npm run check:runtime');
    expect(testingGuidelines).toContain('npm run check:signoff');
    expect(testingGuidelines).toContain('npm run bench:render -- --scenario large');
    expect(productionGuide).toContain('npm run check:runtime');
    expect(productionGuide).toContain('npm run check:signoff');
    expect(productionGuide).toContain('.artifacts/runtime/summary.json');
  });
});
