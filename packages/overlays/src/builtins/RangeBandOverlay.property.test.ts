import { CoordinateSystemType } from '@rail-schematic-viz/core';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { RangeBandOverlay } from './RangeBandOverlay';

describe('RangeBandOverlay properties', () => {
  it('renders overlapping ranges as distinct segments', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 3 }), (count) => {
        const overlay = new RangeBandOverlay({
          data: Array.from({ length: count }, (_, index) => ({
            id: `band-${index}`,
            start: { type: CoordinateSystemType.Screen, x: 10, y: 20 },
            end: { type: CoordinateSystemType.Screen, x: 90, y: 20 },
            label: `Band ${index}`,
          })),
        });

        overlay.initialize({});
        overlay.render({ dimensions: { width: 100, height: 100 } });

        expect(
          overlay.getRenderedNodes().filter((node) => node.id.includes('segment')).length,
        ).toBe(count);
      }),
    );
  });
});
