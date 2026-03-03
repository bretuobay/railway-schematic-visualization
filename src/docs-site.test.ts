import { accessSync, constants, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

function assertFileExists(relativePath: string): void {
  accessSync(resolve(process.cwd(), relativePath), constants.F_OK);
}

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('docs site', () => {
  it('ships a VitePress config with local search and version navigation', async () => {
    const configModule = await import(pathToFileURL(resolve(process.cwd(), 'docs/.vitepress/config.mjs')).href);
    const config = configModule.default as {
      title?: string;
      themeConfig?: {
        nav?: Array<{ text?: string; link?: string; items?: Array<{ text?: string }> }>;
        search?: { provider?: string };
      };
      sitemap?: { hostname?: string };
    };
    const nav = config.themeConfig?.nav ?? [];
    const versionEntry = nav.find((item) => item.text === 'Versions');

    expect(config.title).toBe('Rail Schematic Viz');
    expect(config.themeConfig?.search?.provider).toBe('local');
    expect(config.sitemap?.hostname).toBe('https://rail-schematic-viz.dev');
    expect(nav.some((item) => item.text === 'Storybook' && item.link === '/storybook')).toBe(true);
    expect(nav.some((item) => item.text === 'Guides' && item.link === '/guides/')).toBe(true);
    expect(versionEntry?.items?.map((item) => item.text)).toEqual([
      'v0.1 (Current)',
      'v0.0 (Archive)',
    ]);
  });

  it('includes docs entry pages for home, getting started, and api reference', () => {
    const home = readWorkspaceFile('docs/index.md');
    const gettingStarted = readWorkspaceFile('docs/getting-started.md');
    const apiReference = readWorkspaceFile('docs/api-reference.md');
    const storybook = readWorkspaceFile('docs/storybook.md');
    const guidesIndex = readWorkspaceFile('docs/guides/index.md');

    expect(home).toContain('layout: home');
    expect(home).toContain('[Getting Started](/getting-started)');
    expect(home).toContain('[Guides](/guides/)');
    expect(home).toContain('/images/storybook/docs-home-hero.png');
    expect(home).toContain('[Storybook](/storybook)');
    expect(home).not.toContain('/Users/festusyeboah/Documents/2025/railway-schematic-visualization');
    expect(gettingStarted).toContain('Hello World In Under 10 Lines');
    expect(gettingStarted).toContain('yarn add @rail-schematic-viz/core d3');
    expect(gettingStarted).toContain('pnpm add @rail-schematic-viz/core d3');
    expect(gettingStarted).toContain('## Vanilla JavaScript');
    expect(gettingStarted).toContain('## React');
    expect(gettingStarted).toContain('## Vue');
    expect(gettingStarted).toContain('## Troubleshooting');
    expect(gettingStarted).toContain('[Browser Compatibility](/browser-compatibility)');
    expect(gettingStarted).toContain('[API Reference](/api-reference)');
    expect(gettingStarted).toContain('[Package Structure](/package-structure)');
    expect(gettingStarted).toContain('[Testing Guidelines](/testing-guidelines)');
    expect(gettingStarted).toContain('[Versioning Policy](/versioning-policy)');
    expect(gettingStarted).not.toContain('/Users/festusyeboah/Documents/2025/railway-schematic-visualization');
    expect(apiReference).toContain('RailSchematicCLI');
    expect(apiReference).toContain('[Core API](/api/core)');
    expect(apiReference).toContain('[Security API](/api/security)');
    expect(apiReference).not.toContain('/Users/festusyeboah/Documents/2025/railway-schematic-visualization');
    expect(storybook).toContain('npm run storybook');
    expect(storybook).toContain('npm run storybook:screenshots');
    expect(storybook).toContain('/images/storybook/storybook-control-room.png');
    expect(storybook).toContain('/images/storybook/storybook-operations-dashboard.png');
    expect(storybook).toContain('Ecosystem/Production Features');
    expect(storybook).toContain('Workflows/End-to-End');
    expect(storybook).not.toContain('/Users/festusyeboah/Documents/2025/railway-schematic-visualization');
    expect(guidesIndex).toContain('[Setup Guide](/guides/setup)');
    expect(guidesIndex).toContain('[Production Rollout](/guides/production-rollout)');
  });

  it('ships package-level api reference pages for the public workspace packages', () => {
    const config = readWorkspaceFile('docs/.vitepress/config.mjs');

    expect(config).toContain("text: 'API By Package'");
    expect(config).toContain("link: '/api/core'");
    expect(config).toContain("link: '/api/security'");

    assertFileExists('docs/api/core.md');
    assertFileExists('docs/api/layout.md');
    assertFileExists('docs/api/overlays.md');
    assertFileExists('docs/api/adapters-shared.md');
    assertFileExists('docs/api/react.md');
    assertFileExists('docs/api/vue.md');
    assertFileExists('docs/api/web-component.md');
    assertFileExists('docs/api/themes.md');
    assertFileExists('docs/api/i18n.md');
    assertFileExists('docs/api/plugins.md');
    assertFileExists('docs/api/context-menu.md');
    assertFileExists('docs/api/adapters-regional.md');
    assertFileExists('docs/api/brushing-linking.md');
    assertFileExists('docs/api/ssr.md');
    assertFileExists('docs/api/canvas.md');
    assertFileExists('docs/api/security.md');
  });

  it('ships long-form setup, integration, production, and migration guides', () => {
    const config = readWorkspaceFile('docs/.vitepress/config.mjs');
    const setupGuide = readWorkspaceFile('docs/guides/setup.md');
    const frameworkGuide = readWorkspaceFile('docs/guides/framework-integration.md');
    const productionGuide = readWorkspaceFile('docs/guides/production-rollout.md');
    const migrationGuide = readWorkspaceFile('docs/guides/migration-playbook.md');

    expect(config).toContain("text: 'Guide Index'");
    expect(config).toContain("link: '/guides/setup'");
    expect(config).toContain("link: '/guides/migration-playbook'");

    assertFileExists('docs/guides/index.md');
    assertFileExists('docs/guides/setup.md');
    assertFileExists('docs/guides/framework-integration.md');
    assertFileExists('docs/guides/production-rollout.md');
    assertFileExists('docs/guides/migration-playbook.md');

    expect(setupGuide).toContain('npm run check:typecheck');
    expect(frameworkGuide).toContain('@rail-schematic-viz/react');
    expect(productionGuide).toContain('npm run check:bundles');
    expect(migrationGuide).toContain('[Migration Template](/migrations/v1-migration-template)');
  });

  it('ships offline-friendly public assets', () => {
    assertFileExists('docs/public/manifest.webmanifest');
    assertFileExists('docs/public/sw.js');
    assertFileExists('docs/public/logo.svg');
    assertFileExists('docs/public/images/storybook/docs-home-hero.png');
    assertFileExists('docs/public/images/storybook/storybook-control-room.png');
    assertFileExists('docs/public/images/storybook/storybook-operations-dashboard.png');
  });

  it('documents package structure and versioning in the docs site', () => {
    const packageStructure = readWorkspaceFile('docs/package-structure.md');
    const versioning = readWorkspaceFile('docs/versioning-policy.md');

    expect(packageStructure).toContain('```mermaid');
    expect(versioning).toContain('MAJOR.MINOR.PATCH');
  });
});
