import { describe, expect, it } from 'vitest';

import { CollisionDetection } from './CollisionDetection';

function overlaps(
  left: { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number },
  right: { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number },
): boolean {
  return !(
    left.maxX <= right.minX ||
    left.minX >= right.maxX ||
    left.maxY <= right.minY ||
    left.minY >= right.maxY
  );
}

describe('CollisionDetection', () => {
  it('separates overlapping labels when using adjust mode', () => {
    const detector = new CollisionDetection();
    const results = detector.detect(
      [
        { id: 'a', text: 'Alpha', x: 10, y: 10, priority: 2 },
        { id: 'b', text: 'Beta', x: 10, y: 10, priority: 1 },
      ],
      { strategy: 'adjust', padding: 10 },
    );

    const first = results[0]!;
    const second = results[1]!;

    expect(first.position.hidden).toBe(false);
    expect(second.position.hidden).toBe(false);
    expect(second.position.leaderLine).toBeDefined();
    expect(overlaps(first.bounds, second.bounds)).toBe(false);
  });

  it('creates leader lines for adjusted labels', () => {
    const detector = new CollisionDetection();
    const [, second] = detector.detect(
      [
        { id: 'a', text: 'Alpha', x: 20, y: 20, priority: 2 },
        { id: 'b', text: 'Beta', x: 20, y: 20, priority: 1 },
      ],
      { strategy: 'adjust', padding: 12 },
    );

    expect(second?.position.leaderLine).toBeDefined();
  });
});
