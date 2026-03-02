import { performance } from 'node:perf_hooks';

import { describe, expect, it } from 'vitest';

import { FitToView, fitBoundsWithPadding } from './FitToView';
import { ViewportController } from './ViewportController';
import { MockViewportHost } from './ViewportController.test-helpers';

describe('FitToView', () => {
  it('fits a simple bounding box into view', async () => {
    const controller = new ViewportController(new MockViewportHost(800, 600), {
      minScale: 0.01,
      maxScale: 100,
    });
    const fitToView = new FitToView(controller, { padding: 24 });
    const bounds = {
      minX: 50,
      minY: 25,
      maxX: 250,
      maxY: 125,
    };

    await fitToView.fitToView(bounds);

    const visible = controller.getVisibleBounds();

    expect(visible.minX).toBeLessThanOrEqual(bounds.minX);
    expect(visible.minY).toBeLessThanOrEqual(bounds.minY);
    expect(visible.maxX).toBeGreaterThanOrEqual(bounds.maxX);
    expect(visible.maxY).toBeGreaterThanOrEqual(bounds.maxY);
  });

  it('fits selections by merging multiple bounds', async () => {
    const controller = new ViewportController(new MockViewportHost(800, 600), {
      minScale: 0.01,
      maxScale: 100,
    });
    const fitToView = new FitToView(controller, { padding: 16 });

    await fitToView.fitSelection([
      { minX: 0, minY: 0, maxX: 100, maxY: 100 },
      { minX: 200, minY: 100, maxX: 260, maxY: 160 },
    ]);

    const visible = controller.getVisibleBounds();

    expect(visible.minX).toBeLessThanOrEqual(0);
    expect(visible.minY).toBeLessThanOrEqual(0);
    expect(visible.maxX).toBeGreaterThanOrEqual(260);
    expect(visible.maxY).toBeGreaterThanOrEqual(160);
  });

  it('applies configured screen padding', async () => {
    const controller = new ViewportController(new MockViewportHost(800, 600), {
      minScale: 0.01,
      maxScale: 100,
    });
    const fitToView = new FitToView(controller, { padding: 40 });
    const bounds = {
      minX: 100,
      minY: 80,
      maxX: 300,
      maxY: 180,
    };

    await fitToView.fitToView(bounds);

    const { x, y, scale } = controller.getTransform();
    const left = bounds.minX * scale + x;
    const top = bounds.minY * scale + y;
    const right = 800 - (bounds.maxX * scale + x);
    const bottom = 600 - (bounds.maxY * scale + y);

    expect(left).toBeGreaterThanOrEqual(40 - 0.000001);
    expect(top).toBeGreaterThanOrEqual(40 - 0.000001);
    expect(right).toBeGreaterThanOrEqual(40 - 0.000001);
    expect(bottom).toBeGreaterThanOrEqual(40 - 0.000001);
  });

  it('preserves aspect ratio using the limiting viewport dimension', async () => {
    const controller = new ViewportController(new MockViewportHost(800, 600), {
      minScale: 0.01,
      maxScale: 100,
    });
    const fitToView = new FitToView(controller, { padding: 20 });
    const bounds = {
      minX: 0,
      minY: 0,
      maxX: 400,
      maxY: 100,
    };

    await fitToView.fitToView(bounds);

    const expectedScale = (800 - 40) / 400;

    expect(controller.getTransform().scale).toBeCloseTo(expectedScale, 6);
  });

  it('respects controller zoom limits', async () => {
    const controller = new ViewportController(new MockViewportHost(800, 600), {
      minScale: 0.5,
      maxScale: 1.25,
    });
    const fitToView = new FitToView(controller, { padding: 24 });

    await fitToView.fitToView({
      minX: 0,
      minY: 0,
      maxX: 50,
      maxY: 50,
    });

    expect(controller.getTransform().scale).toBe(1.25);
  });

  it('supports animated fit transitions', async () => {
    const controller = new ViewportController(new MockViewportHost(800, 600), {
      minScale: 0.01,
      maxScale: 100,
      animationFrameMs: 16,
    });
    const fitToView = new FitToView(controller, { padding: 24 });

    const transform = await fitToView.fitToView(
      {
        minX: 0,
        minY: 0,
        maxX: 300,
        maxY: 200,
      },
      {
        animated: true,
        duration: 80,
      },
    );

    expect(transform.scale).toBeGreaterThan(0);
    expect(transform.x).not.toBe(0);
    expect(transform.y).not.toBe(0);
  });

  it('runs within the expected performance budget', async () => {
    const controller = new ViewportController(new MockViewportHost(800, 600), {
      minScale: 0.01,
      maxScale: 100,
    });
    const fitToView = new FitToView(controller, { padding: 24 });
    const startedAt = performance.now();

    await fitToView.fitSelection([
      { minX: 0, minY: 0, maxX: 1000, maxY: 500 },
      { minX: 1200, minY: 200, maxX: 1800, maxY: 900 },
      { minX: -400, minY: -200, maxX: 50, maxY: 100 },
    ]);

    expect(performance.now() - startedAt).toBeLessThan(500);
  });

  it('expands bounds with padding when requested explicitly', () => {
    expect(
      fitBoundsWithPadding(
        { minX: 10, minY: 20, maxX: 30, maxY: 50 },
        5,
      ),
    ).toEqual({
      minX: 5,
      minY: 15,
      maxX: 35,
      maxY: 55,
    });
  });
});
