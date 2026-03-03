import { CoordinateSystemType, type CoordinateBridge } from '@rail-schematic-viz/core';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { HeatMapOverlay } from './HeatMapOverlay';

describe('HeatMapOverlay properties', () => {
  it('projects every linear coordinate into a rendered element', () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 0, max: 50 }), { minLength: 1, maxLength: 8 }), (distances) => {
        const overlay = new HeatMapOverlay();
        const bridge = {
          projectToScreen: (coordinate: { readonly distance: number }) => ({
            type: CoordinateSystemType.Screen,
            x: coordinate.distance,
            y: coordinate.distance * 2,
          }),
        } as unknown as CoordinateBridge;

        overlay.initialize({ coordinateBridge: bridge });
        overlay.update(
          distances.map((distance, index) => ({
            id: `p-${index}`,
            position: {
              type: CoordinateSystemType.Linear,
              trackId: 'track-1',
              distance,
            },
            value: index + 1,
          })),
        );

        overlay.render({
          dimensions: {
            width: 200,
            height: 200,
          },
        });

        expect(overlay.getRenderedElements()).toHaveLength(distances.length);
      }),
    );
  });

  it('returns a valid continuous legend descriptor', () => {
    const overlay = new HeatMapOverlay({
      data: [
        {
          id: 'a',
          position: { type: CoordinateSystemType.Screen, x: 10, y: 10 },
          value: 2,
        },
        {
          id: 'b',
          position: { type: CoordinateSystemType.Screen, x: 20, y: 20 },
          value: 6,
        },
      ],
    });
    const legend = overlay.getLegend();

    expect(legend.type).toBe('continuous');
    expect(legend.min).toBeLessThanOrEqual(legend.max ?? 0);
    expect(legend.items.every((item) => item.label.length > 0 && item.color.startsWith('#'))).toBe(true);
  });
});
