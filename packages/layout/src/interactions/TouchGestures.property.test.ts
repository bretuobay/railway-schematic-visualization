import { afterEach, describe, expect, it, vi } from 'vitest';
import fc from 'fast-check';

import { EventManager } from './EventManager';
import { MockInteractionRoot } from './EventManager.test-helpers';
import { TouchGestures } from './TouchGestures';

describe('TouchGestures properties', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('maps touch gestures to the expected interaction outcomes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('tap', 'long-press', 'pinch', 'pan'),
        async (gesture) => {
          vi.useFakeTimers();
          const root = new MockInteractionRoot();
          const eventManager = new EventManager(root);
          const viewport = {
            zoomToPoint: vi.fn(),
            panBy: vi.fn(),
            getTransform: () => ({ scale: 1 }),
          };
          const onClick = vi.fn();
          const onContextMenu = vi.fn();
          const gestures = new TouchGestures({
            eventManager,
            viewportController: viewport,
          });

          eventManager.on('element-click', onClick);
          eventManager.on('element-contextmenu', onContextMenu);

          if (gesture === 'tap') {
            await gestures.handleTouchStart({
              changedTouches: [{ identifier: 1, clientX: 10, clientY: 20 }],
            });
            await gestures.handleTouchEnd({
              changedTouches: [{ identifier: 1, clientX: 10, clientY: 20 }],
            });
            expect(onClick).toHaveBeenCalledTimes(1);
          } else if (gesture === 'long-press') {
            await gestures.handleTouchStart({
              changedTouches: [{ identifier: 1, clientX: 10, clientY: 20 }],
            });
            vi.advanceTimersByTime(500);
            expect(onContextMenu).toHaveBeenCalledTimes(1);
          } else if (gesture === 'pinch') {
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
            expect(viewport.zoomToPoint).toHaveBeenCalledTimes(1);
          } else {
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
            expect(viewport.panBy).toHaveBeenCalledTimes(1);
          }

          gestures.destroy();
          eventManager.destroy();
        },
      ),
    );
  });

  it('prevents default browser touch behavior for handled touch events', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('start', 'move', 'end', 'cancel'),
        async (phase) => {
          const gestures = new TouchGestures();
          const preventDefault = vi.fn();

          if (phase === 'start') {
            await gestures.handleTouchStart({
              changedTouches: [{ identifier: 1, clientX: 0, clientY: 0 }],
              preventDefault,
            });
          } else if (phase === 'move') {
            await gestures.handleTouchStart({
              changedTouches: [{ identifier: 1, clientX: 0, clientY: 0 }],
            });
            await gestures.handleTouchMove({
              changedTouches: [{ identifier: 1, clientX: 1, clientY: 1 }],
              preventDefault,
            });
          } else if (phase === 'end') {
            await gestures.handleTouchEnd({
              changedTouches: [{ identifier: 1, clientX: 0, clientY: 0 }],
              preventDefault,
            });
          } else {
            await gestures.handleTouchCancel({ preventDefault });
          }

          expect(preventDefault).toHaveBeenCalledTimes(1);
          gestures.destroy();
        },
      ),
    );
  });
});
