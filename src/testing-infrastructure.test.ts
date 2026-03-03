import { accessSync, constants, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

function assertFileExists(relativePath: string): void {
  accessSync(resolve(process.cwd(), relativePath), constants.F_OK);
}

describe('testing infrastructure', () => {
  it('keeps the root vitest coverage thresholds at 80%', () => {
    const vitestConfig = readWorkspaceFile('vitest.config.ts');

    expect(vitestConfig).toContain('lines: 80');
    expect(vitestConfig).toContain('statements: 80');
  });

  it('documents the supported browser matrix', () => {
    const browserCompatibility = readWorkspaceFile('docs/browser-compatibility.md');

    expect(browserCompatibility).toContain('| Chrome | 115+ |');
    expect(browserCompatibility).toContain('| Firefox | 119+ |');
    expect(browserCompatibility).toContain('| Safari | 17+ |');
    expect(browserCompatibility).toContain('| Edge | 115+ |');
  });

  it('documents contributor testing commands', () => {
    const testingGuidelines = readWorkspaceFile('docs/testing-guidelines.md');

    expect(testingGuidelines).toContain('npm run check:test');
    expect(testingGuidelines).toContain('npm run test:types');
    expect(testingGuidelines).toContain('npm run check:storybook');
    expect(testingGuidelines).toContain('npm run check:ci');
    expect(testingGuidelines).toContain('npm run check:runtime');
    expect(testingGuidelines).toContain('npm run test:browser');
    expect(testingGuidelines).toContain('npm run test:visual');
    expect(testingGuidelines).toContain('npm run bench:render');
    expect(testingGuidelines).toContain('npm run storybook');
    expect(testingGuidelines).toContain('npm run storybook:build');
  });

  it('ships browser and visual regression test assets', () => {
    assertFileExists('tests/browser/browser-compatibility.spec.mjs');
    assertFileExists('tests/visual/rail-schematic.visual.spec.mjs');
    assertFileExists('benchmarks/rendering.benchmark.mjs');
    assertFileExists('.github/workflows/release-and-deploy.yml');
  });

  it('keeps existing integration smoke suites wired in the repo', () => {
    assertFileExists('src/ecosystem.integration.test.ts');
    assertFileExists('packages/react/src/adapters-integration.test.ts');
    assertFileExists('packages/overlays/src/index.integration.test.ts');
  });

  it('defines a four-browser Playwright matrix', async () => {
    const configModule = await import(pathToFileURL(resolve(process.cwd(), 'playwright.config.mjs')).href);
    const config = configModule.default as {
      projects?: Array<{ name?: string; use?: { browserName?: string } }>;
      testDir?: string;
    };
    const allBrowserProjects = configModule.allBrowserProjects as Array<{
      name?: string;
      use?: { browserName?: string };
    }>;
    const shouldEnableWebkit = configModule.shouldEnableWebkit as boolean;

    expect(config.testDir).toBe('./tests');
    expect(allBrowserProjects.map((project) => project.name)).toEqual([
      'chrome',
      'firefox',
      'safari',
      'edge',
    ]);
    expect(allBrowserProjects.map((project) => project.use?.browserName)).toEqual([
      'chromium',
      'firefox',
      'webkit',
      'chromium',
    ]);
    expect(config.projects?.map((project) => project.name)).toEqual(
      shouldEnableWebkit
        ? ['chrome', 'firefox', 'safari', 'edge']
        : ['chrome', 'firefox', 'edge'],
    );
  });
});
