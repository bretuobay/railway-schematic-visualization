import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { SemanticZoom } from './SemanticZoom';

describe('SemanticZoom properties', () => {
  it('enforces low-detail visibility below the mid threshold', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 40 }),
        fc.integer({ min: 1, max: 40 }),
        fc.integer({ min: 0, max: 999 }),
        (midRaw, gapRaw, scaleRaw) => {
          const mid = midRaw / 10;
          const high = mid + gapRaw / 10 + 0.1;
          const scale = Math.min((scaleRaw / 1000) * Math.max(mid - 0.01, 0), mid - 0.01);
          const semanticZoom = new SemanticZoom({
            midDetailThreshold: mid,
            highDetailThreshold: high,
          });

          const visibility = semanticZoom.getVisibilityMap(scale);

          expect(semanticZoom.isVisible('tracks', scale)).toBe(true);
          expect(semanticZoom.isVisible('stations', scale)).toBe(true);
          expect(visibility['station-labels']).toBe(false);
          expect(visibility.signals).toBe(false);
          expect(visibility.mileposts).toBe(false);
        },
      ),
    );
  });

  it('enforces mid-detail visibility between the configured thresholds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 30 }),
        fc.integer({ min: 1, max: 30 }),
        fc.integer({ min: 0, max: 100 }),
        (midRaw, gapRaw, offsetRaw) => {
          const mid = midRaw / 10;
          const high = mid + gapRaw / 10 + 0.2;
          const offset = (offsetRaw / 100) * Math.max(high - mid - 0.01, 0);
          const scale = Math.min(high - 0.01, mid + offset);
          const semanticZoom = new SemanticZoom({
            midDetailThreshold: mid,
            highDetailThreshold: high,
          });

          const visibility = semanticZoom.getVisibilityMap(scale);

          expect(semanticZoom.isVisible('tracks', scale)).toBe(true);
          expect(visibility['station-labels']).toBe(true);
          expect(visibility.signals).toBe(true);
          expect(visibility.mileposts).toBe(false);
          expect(visibility.annotations).toBe(false);
        },
      ),
    );
  });

  it('enforces high-detail visibility at or above the high threshold', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 30 }),
        fc.integer({ min: 1, max: 30 }),
        fc.integer({ min: 0, max: 50 }),
        (midRaw, gapRaw, extraRaw) => {
          const mid = midRaw / 10;
          const high = mid + gapRaw / 10 + 0.2;
          const scale = high + extraRaw / 10;
          const semanticZoom = new SemanticZoom({
            midDetailThreshold: mid,
            highDetailThreshold: high,
          });

          const visibility = semanticZoom.getVisibilityMap(scale);

          expect(visibility.tracks).toBe(true);
          expect(visibility['station-labels']).toBe(true);
          expect(visibility.signals).toBe(true);
          expect(visibility.mileposts).toBe(true);
          expect(visibility.annotations).toBe(true);
        },
      ),
    );
  });
});
