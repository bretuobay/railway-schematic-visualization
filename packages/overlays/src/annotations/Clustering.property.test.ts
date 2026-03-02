import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { Clustering } from './Clustering';

describe('Clustering', () => {
  it('clusters annotations that stay within the configured radius', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10 }), fc.integer({ min: 0, max: 10 }), (dx, dy) => {
        const clustering = new Clustering();
        const result = clustering.cluster(
          [
            { id: 'a', x: 0, y: 0 },
            { id: 'b', x: dx, y: dy },
          ],
          1,
          { radius: 24, zoomThreshold: 2 },
        );

        expect(result.clusters).toHaveLength(1);
        expect(result.clusters[0]?.count).toBe(2);
      }),
    );
  });
});
