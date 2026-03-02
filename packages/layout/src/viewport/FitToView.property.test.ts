import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { mergeBoundingBoxes } from '../spatial';

import { FitToView } from './FitToView';
import { ViewportController } from './ViewportController';
import { MockViewportHost } from './ViewportController.test-helpers';

function makeBounds(
  minX: number,
  minY: number,
  width: number,
  height: number,
) {
  return {
    minX,
    minY,
    maxX: minX + width,
    maxY: minY + height,
  };
}

function getScreenMargins(
  bounds: ReturnType<typeof makeBounds>,
  transform: { x: number; y: number; scale: number },
  viewport: { width: number; height: number },
) {
  const left = bounds.minX * transform.scale + transform.x;
  const top = bounds.minY * transform.scale + transform.y;
  const right = viewport.width - (bounds.maxX * transform.scale + transform.x);
  const bottom = viewport.height - (bounds.maxY * transform.scale + transform.y);

  return { left, top, right, bottom };
}

describe('FitToView properties', () => {
  it('fits all provided bounds into the visible viewport', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: -500, max: 500 }),
        fc.integer({ min: -500, max: 500 }),
        fc.integer({ min: 10, max: 2400 }),
        fc.integer({ min: 10, max: 1800 }),
        async (minX, minY, width, height) => {
          const controller = new ViewportController(new MockViewportHost(800, 600), {
            minScale: 0.01,
            maxScale: 100,
          });
          const fitToView = new FitToView(controller, { padding: 24 });
          const bounds = makeBounds(minX, minY, width, height);

          await fitToView.fitToView(bounds);

          const visible = controller.getVisibleBounds();

          expect(visible.minX).toBeLessThanOrEqual(bounds.minX);
          expect(visible.minY).toBeLessThanOrEqual(bounds.minY);
          expect(visible.maxX).toBeGreaterThanOrEqual(bounds.maxX);
          expect(visible.maxY).toBeGreaterThanOrEqual(bounds.maxY);
        },
      ),
    );
  });

  it('fits merged selection bounds into the visible viewport', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: -400, max: 100 }),
        fc.integer({ min: -400, max: 100 }),
        fc.integer({ min: 20, max: 400 }),
        fc.integer({ min: 20, max: 400 }),
        fc.integer({ min: 100, max: 500 }),
        fc.integer({ min: 100, max: 500 }),
        async (x1, y1, width1, height1, deltaX, deltaY) => {
          const controller = new ViewportController(new MockViewportHost(800, 600), {
            minScale: 0.01,
            maxScale: 100,
          });
          const fitToView = new FitToView(controller, { padding: 16 });
          const first = makeBounds(x1, y1, width1, height1);
          const second = makeBounds(
            x1 + deltaX,
            y1 + deltaY,
            Math.max(20, Math.floor(width1 / 2)),
            Math.max(20, Math.floor(height1 / 2)),
          );
          const merged = mergeBoundingBoxes([first, second]);

          await fitToView.fitSelection([first, second]);

          const visible = controller.getVisibleBounds();

          expect(visible.minX).toBeLessThanOrEqual(merged.minX);
          expect(visible.minY).toBeLessThanOrEqual(merged.minY);
          expect(visible.maxX).toBeGreaterThanOrEqual(merged.maxX);
          expect(visible.maxY).toBeGreaterThanOrEqual(merged.maxY);
        },
      ),
    );
  });

  it('applies the configured screen padding when fitting', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 300 }),
        fc.integer({ min: 0, max: 200 }),
        fc.integer({ min: 20, max: 500 }),
        fc.integer({ min: 20, max: 300 }),
        fc.integer({ min: 0, max: 80 }),
        async (minX, minY, width, height, padding) => {
          const controller = new ViewportController(new MockViewportHost(800, 600), {
            minScale: 0.01,
            maxScale: 100,
          });
          const fitToView = new FitToView(controller, { padding });
          const bounds = makeBounds(minX, minY, width, height);

          await fitToView.fitToView(bounds);

          const margins = getScreenMargins(bounds, controller.getTransform(), {
            width: 800,
            height: 600,
          });

          expect(margins.left).toBeGreaterThanOrEqual(padding - 0.000001);
          expect(margins.top).toBeGreaterThanOrEqual(padding - 0.000001);
          expect(margins.right).toBeGreaterThanOrEqual(padding - 0.000001);
          expect(margins.bottom).toBeGreaterThanOrEqual(padding - 0.000001);
        },
      ),
    );
  });

  it('preserves aspect ratio by using a uniform scale', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 10, max: 700 }),
        fc.integer({ min: 10, max: 500 }),
        fc.integer({ min: 0, max: 80 }),
        async (width, height, padding) => {
          const controller = new ViewportController(new MockViewportHost(800, 600), {
            minScale: 0.01,
            maxScale: 100,
          });
          const fitToView = new FitToView(controller, { padding });
          const bounds = makeBounds(0, 0, width, height);
          const expectedScale = Math.min(
            Math.max(1, 800 - padding * 2) / width,
            Math.max(1, 600 - padding * 2) / height,
          );

          await fitToView.fitToView(bounds);

          expect(controller.getTransform().scale).toBeCloseTo(expectedScale, 6);
        },
      ),
    );
  });

  it('respects viewport zoom bounds while fitting', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 6000 }),
        fc.integer({ min: 1, max: 4000 }),
        async (width, height) => {
          const controller = new ViewportController(new MockViewportHost(800, 600), {
            minScale: 0.5,
            maxScale: 2,
          });
          const fitToView = new FitToView(controller, { padding: 24 });

          await fitToView.fitToView(makeBounds(0, 0, width, height));

          const { scale } = controller.getTransform();

          expect(scale).toBeGreaterThanOrEqual(0.5);
          expect(scale).toBeLessThanOrEqual(2);
        },
      ),
    );
  });
});
