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
      '../stories/**/*.mdx',
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
    assertFileExists('stories/introduction.stories.mdx');
    assertFileExists('stories/core-renderer.stories.js');
    assertFileExists('stories/framework-adapters.stories.js');
    assertFileExists('stories/ecosystem-features.stories.js');
    assertFileExists('docs/storybook.md');

    const storybookDoc = readWorkspaceFile('docs/storybook.md');
    const coreStory = readWorkspaceFile('stories/core-renderer.stories.js');

    expect(storybookDoc).toContain('npm run check:storybook');
    expect(storybookDoc).toContain('Core/Renderer');
    expect(coreStory).toContain("title: 'Core/Renderer'");
    expect(coreStory).toContain('Minimal SVG Render');
  });
});
