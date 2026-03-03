import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('storybook screenshot automation', () => {
  it('captures the expected screenshot files from the curated story ids', () => {
    const script = readWorkspaceFile('scripts/capture-storybook-screenshots.mjs');

    expect(script).toContain('docs-home-hero.png');
    expect(script).toContain('storybook-control-room.png');
    expect(script).toContain('storybook-operations-dashboard.png');
    expect(script).toContain('introduction-overview--docs-hero-showcase');
    expect(script).toContain('ecosystem-production-features--theme-and-i-18-n-control-room');
    expect(script).toContain('workflows-end-to-end--operations-dashboard');
    expect(script).toContain('width: 1440');
    expect(script).toContain('height: 900');
  });
});
