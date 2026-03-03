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

describe('storybook scaffold', () => {
  it('ships html-vite storybook config with example story globs', async () => {
    const configModule = await import(pathToFileURL(resolve(process.cwd(), '.storybook/main.mjs')).href);
    const config = configModule.default as {
      framework?: { name?: string };
      stories?: string[];
      addons?: string[];
    };

    expect(config.framework?.name).toBe('@storybook/html-vite');
    expect(config.stories).toEqual([
      '../stories/**/*.stories.@(js|mjs)',
    ]);
    expect(config.addons).toContain('@storybook/addon-a11y');
    expect(config.addons).toContain('@storybook/addon-interactions');
  });

  it('keeps the preview decorators and background presets', () => {
    const preview = readWorkspaceFile('.storybook/preview.mjs');

    expect(preview).toContain('backgrounds');
    expect(preview).toContain('decorators');
    expect(preview).toContain('IBM Plex Sans');
  });

  it('ships the interactive example stories and docs page', () => {
    assertFileExists('stories/introduction.stories.js');
    assertFileExists('stories/core-renderer.stories.js');
    assertFileExists('stories/framework-adapters.stories.js');
    assertFileExists('stories/ecosystem-features.stories.js');
    assertFileExists('stories/end-to-end-workflows.stories.js');
    assertFileExists('stories/_shared/story-shell.js');
    assertFileExists('stories/_shared/story-fixtures.js');
    assertFileExists('stories/_shared/story-renderers.js');
    assertFileExists('stories/_shared/story-code-snippets.js');
    assertFileExists('scripts/capture-storybook-screenshots.mjs');
    assertFileExists('docs/storybook.md');

    const storybookDoc = readWorkspaceFile('docs/storybook.md');
    const coreStory = readWorkspaceFile('stories/core-renderer.stories.js');
    const workflowsStory = readWorkspaceFile('stories/end-to-end-workflows.stories.js');
    const screenshotScript = readWorkspaceFile('scripts/capture-storybook-screenshots.mjs');
    const packageJson = readWorkspaceFile('package.json');

    expect(storybookDoc).toContain('npm run check:storybook');
    expect(storybookDoc).toContain('npm run storybook:screenshots');
    expect(storybookDoc).toContain('Core/Renderer');
    expect(storybookDoc).toContain('Workflows/End-to-End');
    expect(coreStory).toContain("title: 'Core/Renderer'");
    expect(coreStory).toContain('Minimal SVG Render');
    expect(coreStory).toContain('Export Preview Board');
    expect(workflowsStory).toContain("title: 'Workflows/End-to-End'");
    expect(workflowsStory).toContain('Operations Dashboard');
    expect(screenshotScript).toContain('const screenshotsDir = resolve(');
    expect(screenshotScript).toContain("'storybook'");
    expect(packageJson).toContain('"storybook:screenshots"');
  });

  it('declares the runtime storybook dependencies in package metadata', () => {
    const packageJson = readWorkspaceFile('package.json');

    expect(packageJson).toContain('"storybook"');
    expect(packageJson).toContain('"@storybook/html-vite"');
    expect(packageJson).toContain('"@storybook/addon-essentials"');
    expect(packageJson).toContain('"@storybook/addon-a11y"');
    expect(packageJson).toContain('"@storybook/addon-interactions"');
  });
});
