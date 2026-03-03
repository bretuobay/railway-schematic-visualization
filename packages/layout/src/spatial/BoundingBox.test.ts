import { describe, expect, it } from 'vitest';

import {
  containsBoundingBox,
  containsPoint,
  expandBoundingBox,
  intersectsBoundingBox,
  mergeBoundingBoxes,
} from './BoundingBox';

describe('BoundingBox utilities', () => {
  it('detects intersections and separations', () => {
    const left = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
    const overlapping = { minX: 5, minY: 5, maxX: 15, maxY: 15 };
    const disjoint = { minX: 20, minY: 20, maxX: 30, maxY: 30 };

    expect(intersectsBoundingBox(left, overlapping)).toBe(true);
    expect(intersectsBoundingBox(left, disjoint)).toBe(false);
  });

  it('checks point containment and box containment', () => {
    const outer = { minX: 0, minY: 0, maxX: 20, maxY: 20 };
    const inner = { minX: 4, minY: 4, maxX: 10, maxY: 10 };

    expect(containsPoint(outer, { x: 10, y: 10 })).toBe(true);
    expect(containsPoint(outer, { x: 25, y: 10 })).toBe(false);
    expect(containsBoundingBox(outer, inner)).toBe(true);
    expect(containsBoundingBox(inner, outer)).toBe(false);
  });

  it('merges and expands bounds', () => {
    const merged = mergeBoundingBoxes([
      { minX: 0, minY: 2, maxX: 10, maxY: 8 },
      { minX: -5, minY: -1, maxX: 4, maxY: 6 },
    ]);
    const expanded = expandBoundingBox(merged, 3);

    expect(merged).toEqual({
      minX: -5,
      minY: -1,
      maxX: 10,
      maxY: 8,
    });
    expect(expanded).toEqual({
      minX: -8,
      minY: -4,
      maxX: 13,
      maxY: 11,
    });
  });
});
