import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('spec conformance audit', () => {
  it('tracks every umbrella requirement and correctness property', () => {
    const audit = readWorkspaceFile('.kiro/specs/rail-schematic-viz/conformance-audit.md');

    expect(audit).toContain('Implemented: 35 / 50');
    expect(audit).toContain('Partial: 15 / 50');
    expect(audit).toContain('Implemented: 51 / 64');
    expect(audit).toContain('Partial: 13 / 64');

    for (let index = 1; index <= 50; index += 1) {
      expect(audit).toContain(`| Requirement ${index} |`);
    }

    for (let index = 1; index <= 64; index += 1) {
      expect(audit).toContain(`| Property ${index} |`);
    }
  });

  it('defines status semantics and a concrete gap summary', () => {
    const audit = readWorkspaceFile('.kiro/specs/rail-schematic-viz/conformance-audit.md');

    expect(audit).toContain('Status meanings:');
    expect(audit).toContain('- `Implemented`:');
    expect(audit).toContain('- `Partial`:');
    expect(audit).toContain('## Highest-Impact Gaps');
    expect(audit).toContain('Tighten switch-template and styling coverage');
    expect(audit).toContain('Convert accessibility from helper coverage to end-to-end conformance checks');
  });
});
