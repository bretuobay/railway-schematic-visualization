import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { CoordinateSystemType } from '../coordinates';
import { RailMLParser } from './RailMLParser';

function loadFixture(name: string): string {
  return readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), 'utf8');
}

describe('RailMLParser', () => {
  it('parses a valid railML document', () => {
    const result = new RailMLParser().parse(loadFixture('valid-screen-railml.xml'));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.nodes.size).toBe(3);
      expect(result.value.edges.size).toBe(1);
      expect(result.value.getEdge(result.value.edges.keys().next().value!)?.geometry.type).toBe('switch');
    }
  });

  it('returns line and column details for invalid XML syntax', () => {
    const result = new RailMLParser().parse(loadFixture('invalid-syntax-railml.xml'));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.context?.line).toBeDefined();
      expect(result.error.context?.column).toBeDefined();
    }
  });

  it('returns a missing-elements error when required sections are absent', () => {
    const result = new RailMLParser().parse(loadFixture('missing-elements-railml.xml'));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('Missing required elements');
    }
  });

  it('extracts geographic and linear coordinate systems', () => {
    const geographic = new RailMLParser().parse(loadFixture('valid-geographic-railml.xml'));
    const linear = new RailMLParser().parse(loadFixture('valid-linear-railml.xml'));

    expect(geographic.ok).toBe(true);
    expect(linear.ok).toBe(true);

    if (geographic.ok) {
      expect(geographic.value.coordinateSystem).toBe(CoordinateSystemType.Geographic);
    }

    if (linear.ok) {
      expect(linear.value.coordinateSystem).toBe(CoordinateSystemType.Linear);
    }
  });

  it('extracts switch and signal entities', () => {
    const result = new RailMLParser().parse(loadFixture('valid-screen-railml.xml'));

    expect(result.ok).toBe(true);
    if (result.ok) {
      const signal = Array.from(result.value.nodes.values()).find((node) => node.type === 'signal');
      const edge = Array.from(result.value.edges.values())[0];

      expect(signal).toBeDefined();
      expect(edge?.geometry.type).toBe('switch');
    }
  });
});
