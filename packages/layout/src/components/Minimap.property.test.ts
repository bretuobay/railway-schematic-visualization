import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';

import { Minimap } from './Minimap';
import {
  buildMinimapGraph,
  MockMinimapContainer,
  MockMinimapViewport,
} from './Minimap.test-helpers';

describe('Minimap properties', () => {
  it('keeps the viewport indicator inside the minimap bounds', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: -100, max: 100 }),
        fc.integer({ min: -100, max: 100 }),
        fc.integer({ min: 1, max: 4 }),
        async (x, y, scale) => {
          const container = new MockMinimapContainer();
          const viewport = new MockMinimapViewport({
            initialTransform: { x, y, scale },
          });
          const minimap = new Minimap(container, buildMinimapGraph(), viewport, {
            width: 120,
            height: 80,
          });
          const state = minimap.getState();

          expect(state.viewportIndicator.minX).toBeGreaterThanOrEqual(0);
          expect(state.viewportIndicator.minY).toBeGreaterThanOrEqual(0);
          expect(state.viewportIndicator.maxX).toBeLessThanOrEqual(state.width);
          expect(state.viewportIndicator.maxY).toBeLessThanOrEqual(state.height);

          minimap.destroy();
        },
      ),
    );
  });

  it('centers the viewport on the clicked minimap location', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 120 }),
        fc.integer({ min: 0, max: 80 }),
        async (clientX, clientY) => {
          const container = new MockMinimapContainer();
          container.setRect({ width: 120, height: 80 });
          const viewport = new MockMinimapViewport();
          const minimap = new Minimap(container, buildMinimapGraph(), viewport, {
            width: 120,
            height: 80,
          });

          await minimap.handleClick({
            clientX,
            clientY,
            preventDefault: vi.fn(),
            stopPropagation: vi.fn(),
          });

          const visibleBounds = viewport.getVisibleBounds();
          const center = {
            x: (visibleBounds.minX + visibleBounds.maxX) / 2,
            y: (visibleBounds.minY + visibleBounds.maxY) / 2,
          };

          expect(center.x).toBeCloseTo((clientX / 120) * 100, 5);
          expect(center.y).toBeCloseTo((clientY / 80) * 100, 5);

          minimap.destroy();
        },
      ),
    );
  });

  it('moves the viewport when the viewport rectangle is dragged', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        async (deltaX, deltaY) => {
          const container = new MockMinimapContainer();
          container.setRect({ width: 120, height: 80 });
          const viewport = new MockMinimapViewport();
          const minimap = new Minimap(container, buildMinimapGraph(), viewport, {
            width: 120,
            height: 80,
          });
          const before = viewport.getTransform();
          const indicator = minimap.getState().viewportIndicator;

          await minimap.handlePointerDown({
            clientX: indicator.minX + 1,
            clientY: indicator.minY + 1,
            preventDefault: vi.fn(),
            stopPropagation: vi.fn(),
          });
          await minimap.handlePointerMove({
            clientX: indicator.minX + 1 + deltaX,
            clientY: indicator.minY + 1 + deltaY,
            preventDefault: vi.fn(),
            stopPropagation: vi.fn(),
          });

          const after = viewport.getTransform();

          expect(after.x).not.toBe(before.x);
          expect(after.y).not.toBe(before.y);

          minimap.destroy();
        },
      ),
    );
  });

  it('stops propagation for handled minimap interactions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('click', 'pointerdown', 'pointermove', 'pointerup', 'wheel'),
        async (eventType) => {
          const container = new MockMinimapContainer();
          const viewport = new MockMinimapViewport();
          const minimap = new Minimap(container, buildMinimapGraph(), viewport);
          const preventDefault = vi.fn();
          const stopPropagation = vi.fn();
          const indicator = minimap.getState().viewportIndicator;
          const pointerEvent = {
            clientX: indicator.minX + 1,
            clientY: indicator.minY + 1,
            preventDefault,
            stopPropagation,
          };

          if (eventType === 'click') {
            await minimap.handleClick(pointerEvent);
          } else if (eventType === 'pointerdown') {
            await minimap.handlePointerDown(pointerEvent);
          } else if (eventType === 'pointermove') {
            await minimap.handlePointerMove(pointerEvent);
          } else if (eventType === 'pointerup') {
            await minimap.handlePointerUp(pointerEvent);
          } else {
            await minimap.handleWheel({
              ...pointerEvent,
              deltaY: -1,
            });
          }

          expect(stopPropagation).toHaveBeenCalledTimes(1);
          expect(preventDefault).toHaveBeenCalledTimes(1);

          minimap.destroy();
        },
      ),
    );
  });
});
