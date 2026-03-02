import { CoordinateSystemType } from '@rail-schematic-viz/core';
import { describe, expect, it } from 'vitest';

import { AnnotationOverlay } from './AnnotationOverlay';
import { HeatMapOverlay } from './HeatMapOverlay';
import { RangeBandOverlay } from './RangeBandOverlay';

describe('overlay viewport culling', () => {
  it('tracks culled heat-map points with buffer margins', () => {
    const overlay = new HeatMapOverlay({
      configuration: { cullingBuffer: 10 },
      data: [
        { id: 'inside', position: { type: CoordinateSystemType.Screen, x: 5, y: 5 }, value: 1 },
        { id: 'buffered', position: { type: CoordinateSystemType.Screen, x: 105, y: 5 }, value: 2 },
        { id: 'outside', position: { type: CoordinateSystemType.Screen, x: 130, y: 5 }, value: 3 },
      ],
    });

    overlay.initialize({});
    overlay.render({
      dimensions: { width: 100, height: 100 },
      viewportBounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
    });

    expect(overlay.getRenderedElements().map((element) => element.id)).toEqual(['inside', 'buffered']);
    expect(overlay.getPerformanceMetrics().culledElementCount).toBe(1);
  });

  it('culls annotations outside the viewport', () => {
    const overlay = new AnnotationOverlay({
      data: [
        { id: 'inside', position: { type: CoordinateSystemType.Screen, x: 5, y: 5 }, label: 'A' },
        { id: 'outside', position: { type: CoordinateSystemType.Screen, x: 200, y: 200 }, label: 'B' },
      ],
    });

    overlay.initialize({});
    overlay.render({
      dimensions: { width: 100, height: 100 },
      viewportBounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
      transform: { x: 0, y: 0, scale: 3 },
    });

    expect(overlay.getRenderedNodes().some((node) => node.id.startsWith('outside'))).toBe(false);
    expect(overlay.getPerformanceMetrics().culledElementCount).toBe(1);
  });

  it('culls range bands outside the viewport', () => {
    const overlay = new RangeBandOverlay({
      data: [
        {
          id: 'inside',
          start: { type: CoordinateSystemType.Screen, x: 10, y: 10 },
          end: { type: CoordinateSystemType.Screen, x: 80, y: 10 },
        },
        {
          id: 'outside',
          start: { type: CoordinateSystemType.Screen, x: 200, y: 200 },
          end: { type: CoordinateSystemType.Screen, x: 280, y: 200 },
        },
      ],
    });

    overlay.initialize({});
    overlay.render({
      dimensions: { width: 100, height: 100 },
      viewportBounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
    });

    expect(overlay.getRenderedNodes().some((node) => node.id.startsWith('outside'))).toBe(false);
    expect(overlay.getPerformanceMetrics().culledElementCount).toBe(1);
  });
});
