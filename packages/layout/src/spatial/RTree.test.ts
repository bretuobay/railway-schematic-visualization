import { performance } from 'node:perf_hooks';

import { describe, expect, it } from 'vitest';

import type { BoundingBox } from './BoundingBox';
import { RTree } from './RTree';

function makeBox(x: number, y: number, size = 10): BoundingBox {
  return {
    minX: x,
    minY: y,
    maxX: x + size,
    maxY: y + size,
  };
}

describe('RTree', () => {
  it('indexes inserted entries and searches intersecting bounds', () => {
    const tree = new RTree<string>({ maxEntries: 2 });

    tree.insert(makeBox(0, 0), 'alpha');
    tree.insert(makeBox(25, 0), 'beta');
    tree.insert(makeBox(50, 0), 'gamma');

    expect(tree.search(makeBox(8, 2, 12))).toEqual(['alpha']);
    expect(tree.search(makeBox(20, -5, 25))).toEqual(['beta']);
    expect(tree.search(makeBox(200, 200))).toEqual([]);
  });

  it('removes entries and clears the tree', () => {
    const tree = new RTree<string>({ maxEntries: 2 });
    const alpha = makeBox(0, 0);
    const beta = makeBox(20, 0);

    tree.insert(alpha, 'alpha');
    tree.insert(beta, 'beta');

    expect(tree.remove(alpha, 'alpha')).toBe(true);
    expect(tree.search(makeBox(0, 0, 15))).toEqual([]);
    expect(tree.size).toBe(1);

    tree.clear();

    expect(tree.size).toBe(0);
    expect(tree.search(makeBox(0, 0, 50))).toEqual([]);
  });

  it('bulk loads large datasets and preserves searchability', () => {
    const entries = Array.from({ length: 1000 }, (_, index) => ({
      bounds: makeBox(index * 12, (index % 10) * 12),
      value: `node-${index}`,
    }));
    const tree = new RTree<string>({ maxEntries: 8 });
    const startedAt = performance.now();

    tree.bulkLoad(entries);

    const elapsed = performance.now() - startedAt;

    expect(elapsed).toBeLessThan(1000);
    expect(tree.size).toBe(entries.length);
    expect(tree.search(makeBox(12 * 400, 0, 10))).toContain('node-400');
    expect(tree.search(makeBox(12 * 999, (999 % 10) * 12, 10))).toContain('node-999');
  });
});
