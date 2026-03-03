import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { ViewportController } from './ViewportController';
import { MockViewportHost } from './ViewportController.test-helpers';

function worldPointUnderCursor(
  transform: { x: number; y: number; scale: number },
  point: { x: number; y: number },
): { x: number; y: number } {
  return {
    x: (point.x - transform.x) / transform.scale,
    y: (point.y - transform.y) / transform.scale,
  };
}

describe('ViewportController properties', () => {
  it('keeps pan operations within the configured extent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: -500, max: 0 }),
        fc.integer({ min: 0, max: 500 }),
        fc.integer({ min: -500, max: 0 }),
        fc.integer({ min: 0, max: 500 }),
        fc.integer({ min: -1000, max: 1000 }),
        fc.integer({ min: -1000, max: 1000 }),
        async (minX, maxX, minY, maxY, targetX, targetY) => {
          const boundedMaxX = Math.max(minX, maxX);
          const boundedMaxY = Math.max(minY, maxY);
          const controller = new ViewportController(new MockViewportHost(), {
            panExtent: {
              minX,
              minY,
              maxX: boundedMaxX,
              maxY: boundedMaxY,
            },
          });

          await controller.panTo(targetX, targetY);

          const transform = controller.getTransform();

          expect(transform.x).toBeGreaterThanOrEqual(minX);
          expect(transform.x).toBeLessThanOrEqual(boundedMaxX);
          expect(transform.y).toBeGreaterThanOrEqual(minY);
          expect(transform.y).toBeLessThanOrEqual(boundedMaxY);
        },
      ),
    );
  });

  it('keeps zoom operations within min and max scale bounds', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 40 }),
        fc.integer({ min: 1, max: 80 }),
        fc.integer({ min: 1, max: 200 }),
        async (scaleARaw, scaleBRaw, requestedScaleRaw) => {
          const scaleA = scaleARaw / 10;
          const scaleB = scaleBRaw / 10;
          const requestedScale = requestedScaleRaw / 10;
          const minScale = Math.min(scaleA, scaleB);
          const maxScale = Math.max(scaleA, scaleB);
          const controller = new ViewportController(new MockViewportHost(), {
            minScale,
            maxScale,
          });

          await controller.zoomTo(requestedScale);

          const transform = controller.getTransform();

          expect(transform.scale).toBeGreaterThanOrEqual(minScale);
          expect(transform.scale).toBeLessThanOrEqual(maxScale);
        },
      ),
    );
  });

  it('preserves the world coordinate under the zoom point', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: -400, max: 400 }),
        fc.integer({ min: -300, max: 300 }),
        fc.float({ min: 0.5, max: 3, noNaN: true }),
        fc.integer({ min: 0, max: 800 }),
        fc.integer({ min: 0, max: 600 }),
        fc.float({ min: 0.5, max: 6, noNaN: true }),
        async (x, y, initialScale, pointX, pointY, targetScale) => {
          const controller = new ViewportController(new MockViewportHost(800, 600), {
            initialTransform: {
              x,
              y,
              scale: initialScale,
            },
          });
          const point = { x: pointX, y: pointY };
          const before = worldPointUnderCursor(controller.getTransform(), point);

          await controller.zoomToPoint(point, targetScale);

          const after = worldPointUnderCursor(controller.getTransform(), point);

          expect(after.x).toBeCloseTo(before.x, 6);
          expect(after.y).toBeCloseTo(before.y, 6);
        },
      ),
    );
  });
});
