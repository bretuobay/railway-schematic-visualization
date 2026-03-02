import { CoordinateSystemType } from '@rail-schematic-viz/core';
import { describe, expect, it } from 'vitest';

import { HeatMapOverlay } from './HeatMapOverlay';

describe('HeatMapOverlay', () => {
  it('accepts valid data and caches color gradients', () => {
    const overlay = new HeatMapOverlay();

    overlay.initialize({});
    overlay.update([
      {
        id: 'a',
        position: { type: CoordinateSystemType.Screen, x: 10, y: 10 },
        value: 1,
      },
      {
        id: 'b',
        position: { type: CoordinateSystemType.Screen, x: 20, y: 20 },
        value: 1,
      },
    ]);
    overlay.render({
      dimensions: {
        width: 100,
        height: 100,
      },
    });

    expect(overlay.getCacheSize()).toBeGreaterThan(0);
    expect(overlay.getCanvasSummary()?.usedOffscreenCanvas).toBe(true);
  });

  it('throws on invalid values', () => {
    const overlay = new HeatMapOverlay();

    expect(() =>
      overlay.update([
        {
          id: 'a',
          position: { type: CoordinateSystemType.Screen, x: 10, y: 10 },
          value: Number.NaN,
        },
      ]),
    ).toThrowError(/Invalid heat-map value/);
  });

  it('renders distinct element counts for interpolation modes', () => {
    const baseData = [
      {
        id: 'a',
        position: { type: CoordinateSystemType.Screen as const, x: 10, y: 10 },
        value: 1,
      },
    ];
    const linear = new HeatMapOverlay({ data: baseData, configuration: { interpolationMode: 'linear' } });
    const step = new HeatMapOverlay({ data: baseData, configuration: { interpolationMode: 'step' } });
    const smooth = new HeatMapOverlay({ data: baseData, configuration: { interpolationMode: 'smooth' } });

    linear.initialize({});
    step.initialize({});
    smooth.initialize({});

    linear.render({ dimensions: { width: 100, height: 100 } });
    step.render({ dimensions: { width: 100, height: 100 } });
    smooth.render({ dimensions: { width: 100, height: 100 } });

    expect(linear.getRenderedElements()).toHaveLength(1);
    expect(step.getRenderedElements()).toHaveLength(1);
    expect(smooth.getRenderedElements()).toHaveLength(2);
  });

  it('culls points outside the viewport', () => {
    const overlay = new HeatMapOverlay({
      data: [
        {
          id: 'inside',
          position: { type: CoordinateSystemType.Screen, x: 10, y: 10 },
          value: 1,
        },
        {
          id: 'outside',
          position: { type: CoordinateSystemType.Screen, x: 200, y: 200 },
          value: 2,
        },
      ],
    });

    overlay.initialize({});
    overlay.render({
      dimensions: { width: 100, height: 100 },
      viewportBounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
    });

    expect(overlay.getRenderedElements().map((element) => element.id)).toEqual(['inside']);
  });
});
