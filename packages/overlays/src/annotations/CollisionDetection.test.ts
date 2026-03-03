import { describe, expect, it } from 'vitest';

import { CollisionDetection } from './CollisionDetection';

describe('CollisionDetection strategies', () => {
  it('hides lower-priority labels when configured to hide', () => {
    const detector = new CollisionDetection();
    const [, second] = detector.detect(
      [
        { id: 'a', text: 'Alpha', x: 10, y: 10, priority: 2 },
        { id: 'b', text: 'Beta', x: 10, y: 10, priority: 1 },
      ],
      { strategy: 'hide' },
    );

    expect(second?.position.hidden).toBe(true);
  });

  it('clusters lower-priority labels when configured to cluster', () => {
    const detector = new CollisionDetection();
    const [, second] = detector.detect(
      [
        { id: 'a', text: 'Alpha', x: 10, y: 10, priority: 2 },
        { id: 'b', text: 'Beta', x: 10, y: 10, priority: 1 },
      ],
      { strategy: 'cluster' },
    );

    expect(second?.position.clusterWith).toBe('a');
  });

  it('estimates text bounds from text length and font size', () => {
    const detector = new CollisionDetection();
    const bounds = detector.computeBoundingBox({
      text: 'Station',
      x: 10,
      y: 20,
      fontSize: 14,
    });

    expect(bounds.maxX).toBeGreaterThan(bounds.minX);
    expect(bounds.maxY).toBeGreaterThan(bounds.minY);
  });
});
