import { performance } from 'node:perf_hooks';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { EventManager } from './EventManager';
import { MockInteractionRoot } from './EventManager.test-helpers';
import { TouchGestures } from './TouchGestures';

describe('TouchGestures', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('supports pinch-to-zoom gestures', async () => {
    const viewport = {
      zoomToPoint: vi.fn(),
      panBy: vi.fn(),
      getTransform: () => ({ scale: 2 }),
    };
    const gestures = new TouchGestures({ viewportController: viewport });

    await gestures.handleTouchStart({
      changedTouches: [
        { identifier: 1, clientX: 0, clientY: 0 },
        { identifier: 2, clientX: 10, clientY: 0 },
      ],
    });
    await gestures.handleTouchMove({
      changedTouches: [
        { identifier: 1, clientX: 0, clientY: 0 },
        { identifier: 2, clientX: 20, clientY: 0 },
      ],
    });

    expect(viewport.zoomToPoint).toHaveBeenCalledWith({ x: 10, y: 0 }, 4);
  });

  it('supports two-finger pan gestures', async () => {
    const viewport = {
      zoomToPoint: vi.fn(),
      panBy: vi.fn(),
      getTransform: () => ({ scale: 1 }),
    };
    const gestures = new TouchGestures({ viewportController: viewport });

    await gestures.handleTouchStart({
      changedTouches: [
        { identifier: 1, clientX: 0, clientY: 0 },
        { identifier: 2, clientX: 10, clientY: 0 },
      ],
    });
    await gestures.handleTouchMove({
      changedTouches: [
        { identifier: 1, clientX: 5, clientY: 5 },
        { identifier: 2, clientX: 15, clientY: 5 },
      ],
    });

    expect(viewport.panBy).toHaveBeenCalledWith(5, 5);
  });

  it('maps tap gestures to click events', async () => {
    const root = new MockInteractionRoot();
    const eventManager = new EventManager(root);
    const gestures = new TouchGestures({ eventManager });
    const onClick = vi.fn();

    eventManager.on('element-click', onClick);

    await gestures.handleTouchStart({
      changedTouches: [{ identifier: 1, clientX: 10, clientY: 20 }],
    });
    await gestures.handleTouchEnd({
      changedTouches: [{ identifier: 1, clientX: 10, clientY: 20 }],
    });

    expect(onClick).toHaveBeenCalledWith({
      event: 'element-click',
      coordinates: { x: 10, y: 20 },
      originalEvent: expect.any(Object),
    });

    gestures.destroy();
    eventManager.destroy();
  });

  it('maps long-press gestures to context-menu events', async () => {
    vi.useFakeTimers();
    const root = new MockInteractionRoot();
    const eventManager = new EventManager(root);
    const gestures = new TouchGestures({
      eventManager,
      longPressDurationMs: 200,
    });
    const onContextMenu = vi.fn();

    eventManager.on('element-contextmenu', onContextMenu);

    await gestures.handleTouchStart({
      changedTouches: [{ identifier: 1, clientX: 12, clientY: 24 }],
    });
    vi.advanceTimersByTime(200);

    expect(onContextMenu).toHaveBeenCalledWith({
      event: 'element-contextmenu',
      coordinates: { x: 12, y: 24 },
      originalEvent: expect.any(Object),
    });

    gestures.destroy();
    eventManager.destroy();
  });

  it('prevents default touch behavior and respects gesture sensitivity config', async () => {
    const preventDefault = vi.fn();
    const viewport = {
      zoomToPoint: vi.fn(),
      panBy: vi.fn(),
      getTransform: () => ({ scale: 1 }),
    };
    const gestures = new TouchGestures({
      viewportController: viewport,
      pinchSensitivity: 0.5,
      panSensitivity: 2,
    });

    await gestures.handleTouchStart({
      changedTouches: [
        { identifier: 1, clientX: 0, clientY: 0 },
        { identifier: 2, clientX: 10, clientY: 0 },
      ],
      preventDefault,
    });
    await gestures.handleTouchMove({
      changedTouches: [
        { identifier: 1, clientX: 2, clientY: 3 },
        { identifier: 2, clientX: 22, clientY: 3 },
      ],
      preventDefault,
    });

    expect(preventDefault).toHaveBeenCalledTimes(2);
    expect(viewport.zoomToPoint).toHaveBeenCalledWith({ x: 12, y: 3 }, 1.5);
    expect(viewport.panBy).toHaveBeenCalledWith(4, 6);
  });

  it('binds root listeners when a root is provided', async () => {
    const root = new MockInteractionRoot();
    const eventManager = new EventManager(root);
    const gestures = new TouchGestures({
      root,
      eventManager,
    });
    const onClick = vi.fn();

    eventManager.on('element-click', onClick);
    expect(root.listenerCount('touchstart')).toBe(1);
    expect(root.listenerCount('touchmove')).toBe(1);
    expect(root.listenerCount('touchend')).toBe(1);
    expect(root.listenerCount('touchcancel')).toBe(1);

    root.dispatch('touchstart', {
      changedTouches: [{ identifier: 1, clientX: 1, clientY: 2 }],
      preventDefault: vi.fn(),
    });
    root.dispatch('touchend', {
      changedTouches: [{ identifier: 1, clientX: 1, clientY: 2 }],
      preventDefault: vi.fn(),
    });
    await Promise.resolve();

    expect(onClick).toHaveBeenCalledTimes(1);

    gestures.destroy();
    expect(root.listenerCount('touchstart')).toBe(0);
    eventManager.destroy();
  });

  it('handles gesture updates within the expected performance budget', async () => {
    const viewport = {
      zoomToPoint: vi.fn(),
      panBy: vi.fn(),
      getTransform: () => ({ scale: 1 }),
    };
    const gestures = new TouchGestures({ viewportController: viewport });

    await gestures.handleTouchStart({
      changedTouches: [
        { identifier: 1, clientX: 0, clientY: 0 },
        { identifier: 2, clientX: 10, clientY: 0 },
      ],
    });

    const startedAt = performance.now();

    for (let index = 0; index < 120; index += 1) {
      await gestures.handleTouchMove({
        changedTouches: [
          { identifier: 1, clientX: index, clientY: index },
          { identifier: 2, clientX: index + 10, clientY: index },
        ],
      });
    }

    expect(performance.now() - startedAt).toBeLessThan(16);
  });
});
