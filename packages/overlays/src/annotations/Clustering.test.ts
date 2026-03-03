import { describe, expect, it } from 'vitest';

import { Clustering } from './Clustering';

describe('Clustering behavior', () => {
  it('disables clustering once the zoom threshold is exceeded', () => {
    const clustering = new Clustering();
    const result = clustering.cluster(
      [
        { id: 'a', x: 0, y: 0 },
        { id: 'b', x: 4, y: 4 },
      ],
      3,
      { zoomThreshold: 2 },
    );

    expect(result.clusters).toHaveLength(0);
    expect(result.unclustered).toHaveLength(2);
  });

  it('groups nearby annotations and preserves distant ones', () => {
    const clustering = new Clustering();
    const result = clustering.cluster(
      [
        { id: 'a', x: 0, y: 0 },
        { id: 'b', x: 5, y: 5 },
        { id: 'c', x: 100, y: 100 },
      ],
      1,
      { radius: 20 },
    );

    expect(result.clusters).toHaveLength(1);
    expect(result.clusters[0]?.count).toBe(2);
    expect(result.unclustered).toEqual([{ id: 'c', x: 100, y: 100 }]);
  });
});
