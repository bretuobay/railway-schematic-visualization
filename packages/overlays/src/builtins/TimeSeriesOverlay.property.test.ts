import { CoordinateSystemType } from '@rail-schematic-viz/core';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { TimeSeriesOverlay } from './TimeSeriesOverlay';

describe('TimeSeriesOverlay properties', () => {
  it('filters frames by timestamp', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 5 }), (count) => {
        const points = Array.from({ length: count }, (_, index) => ({
          id: `p-${index}`,
          timestamp: index * 1000,
          metric: 'speed',
          position: { type: CoordinateSystemType.Screen as const, x: 10 + index, y: 10 + index },
          value: index,
        }));
        const overlay = new TimeSeriesOverlay({ data: points });

        overlay.initialize({});
        overlay.seekTo(points[0]!.timestamp);
        overlay.render({ dimensions: { width: 100, height: 100 } });

        expect(
          overlay.getRenderedNodes().every((node) => node.id.includes(`-${points[0]!.timestamp}`)),
        ).toBe(true);
      }),
    );
  });

  it('toggles metric visibility consistently', () => {
    const overlay = new TimeSeriesOverlay({
      data: [
        {
          id: 'a',
          timestamp: 0,
          metric: 'speed',
          position: { type: CoordinateSystemType.Screen, x: 10, y: 10 },
          value: 1,
        },
        {
          id: 'b',
          timestamp: 0,
          metric: 'delay',
          position: { type: CoordinateSystemType.Screen, x: 20, y: 20 },
          value: 2,
        },
      ],
    });

    expect(overlay.toggleMetric('delay')).toBe(false);
    expect(overlay.toggleMetric('delay')).toBe(true);
  });
});
