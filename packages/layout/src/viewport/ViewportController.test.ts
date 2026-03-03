import { describe, expect, it, vi } from 'vitest';

import { ViewportController } from './ViewportController';
import { MockViewportHost } from './ViewportController.test-helpers';

describe('ViewportController', () => {
  it('pans with and without animation', async () => {
    const host = new MockViewportHost();
    const controller = new ViewportController(host, {
      animationFrameMs: 16,
    });
    const onTransform = vi.fn();

    controller.on('transform', onTransform);

    await controller.panTo(120, 80);
    expect(controller.getTransform()).toEqual({ x: 120, y: 80, scale: 1 });

    await controller.panBy(40, -20, { animated: true, duration: 64 });

    expect(controller.getTransform()).toEqual({ x: 160, y: 60, scale: 1 });
    expect(onTransform).toHaveBeenCalledTimes(5);
  });

  it('zooms with and without animation and respects bounds', async () => {
    const controller = new ViewportController(new MockViewportHost(), {
      minScale: 0.5,
      maxScale: 2,
      animationFrameMs: 16,
    });

    await controller.zoomTo(1.5);
    expect(controller.getTransform().scale).toBe(1.5);

    await controller.zoomBy(10, { animated: true, duration: 48 });
    expect(controller.getTransform().scale).toBe(2);

    await controller.zoomTo(0.1);
    expect(controller.getTransform().scale).toBe(0.5);
  });

  it('clamps pan operations to the configured extent', async () => {
    const controller = new ViewportController(new MockViewportHost(), {
      panExtent: {
        minX: -50,
        minY: -20,
        maxX: 75,
        maxY: 40,
      },
    });

    await controller.panTo(400, -100);

    expect(controller.getTransform()).toEqual({
      x: 75,
      y: -20,
      scale: 1,
    });
  });

  it('keeps the world point under the cursor stable while zooming to a point', async () => {
    const controller = new ViewportController(new MockViewportHost(800, 600), {
      initialTransform: {
        x: 100,
        y: 50,
        scale: 2,
      },
    });
    const point = { x: 300, y: 200 };
    const before = {
      x: (point.x - controller.getTransform().x) / controller.getTransform().scale,
      y: (point.y - controller.getTransform().y) / controller.getTransform().scale,
    };

    await controller.zoomToPoint(point, 4);

    const transform = controller.getTransform();
    const after = {
      x: (point.x - transform.x) / transform.scale,
      y: (point.y - transform.y) / transform.scale,
    };

    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
  });

  it('emits pan, zoom, transform, and viewport-change events', async () => {
    const controller = new ViewportController(new MockViewportHost());
    const onPan = vi.fn();
    const onZoom = vi.fn();
    const onTransform = vi.fn();
    const onViewportChange = vi.fn();

    controller.on('pan', onPan);
    controller.on('zoom', onZoom);
    controller.on('transform', onTransform);
    controller.on('viewport-change', onViewportChange);

    await controller.panTo(10, 20);
    await controller.zoomTo(2);

    expect(onPan).toHaveBeenCalledTimes(1);
    expect(onZoom).toHaveBeenCalledTimes(1);
    expect(onTransform).toHaveBeenCalledTimes(2);
    expect(onViewportChange).toHaveBeenCalledTimes(2);
    expect(onViewportChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        transform: { x: -380, y: -260, scale: 2 },
      }),
    );
  });

  it('responds to wheel and drag interactions registered on the host', async () => {
    const host = new MockViewportHost();
    const controller = new ViewportController(host);

    expect(host.listenerCount('wheel')).toBe(1);
    expect(host.listenerCount('pointerdown')).toBe(1);
    expect(host.listenerCount('pointermove')).toBe(1);

    host.dispatch('wheel', {
      deltaY: -1,
      offsetX: 400,
      offsetY: 300,
      preventDefault: vi.fn(),
    });

    const zoomed = controller.getTransform();

    expect(zoomed.scale).toBeGreaterThan(1);

    host.dispatch('pointerdown', { offsetX: 100, offsetY: 100 });
    host.dispatch('pointermove', { offsetX: 160, offsetY: 130 });
    host.dispatch('pointerup', {});

    expect(controller.getTransform().x).toBeGreaterThan(zoomed.x);
    expect(controller.getTransform().y).toBeGreaterThan(zoomed.y);

    controller.destroy();

    expect(host.listenerCount('wheel')).toBe(0);
    expect(host.listenerCount('pointerdown')).toBe(0);
  });
});
