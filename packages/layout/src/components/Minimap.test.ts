import { performance } from 'node:perf_hooks';

import { describe, expect, it, vi } from 'vitest';

import { Minimap } from './Minimap';
import {
  buildMinimapGraph,
  MockMinimapContainer,
  MockMinimapViewport,
} from './Minimap.test-helpers';

describe('Minimap', () => {
  it('renders an inset overview with a viewport indicator', () => {
    const container = new MockMinimapContainer();
    const viewport = new MockMinimapViewport();
    const minimap = new Minimap(container, buildMinimapGraph(), viewport, {
      width: 140,
      height: 90,
      corner: 'bottom-left',
    });
    const state = minimap.getState();

    expect(state.visible).toBe(true);
    expect(state.renderMode).toBe('low-detail');
    expect(state.width).toBe(140);
    expect(state.height).toBe(90);
    expect(state.corner).toBe('bottom-left');
    expect(state.nodePreviews).toHaveLength(4);
    expect(state.edgeCount).toBe(3);
    expect(state.viewportIndicator.maxX).toBeGreaterThan(state.viewportIndicator.minX);
    expect(container.style.display).toBe('block');
    expect(container.style.position).toBe('absolute');

    minimap.destroy();
  });

  it('updates the viewport indicator when the main viewport changes', async () => {
    const container = new MockMinimapContainer();
    const viewport = new MockMinimapViewport();
    const minimap = new Minimap(container, buildMinimapGraph(), viewport);
    const before = minimap.getState().viewportIndicator;

    await viewport.panTo(-40, -20);

    const after = minimap.getState().viewportIndicator;

    expect(after.minX).not.toBe(before.minX);
    expect(after.minY).not.toBe(before.minY);

    minimap.destroy();
  });

  it('pans the main viewport when the minimap is clicked', async () => {
    const container = new MockMinimapContainer();
    container.setRect({ width: 100, height: 100 });
    const viewport = new MockMinimapViewport();
    const minimap = new Minimap(container, buildMinimapGraph(), viewport, {
      width: 100,
      height: 100,
    });

    await minimap.handleClick({
      clientX: 75,
      clientY: 25,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    });

    const center = {
      x: (viewport.getVisibleBounds().minX + viewport.getVisibleBounds().maxX) / 2,
      y: (viewport.getVisibleBounds().minY + viewport.getVisibleBounds().maxY) / 2,
    };

    expect(center.x).toBeCloseTo(75, 5);
    expect(center.y).toBeCloseTo(25, 5);
    expect(viewport.panToCalls).toHaveLength(1);

    minimap.destroy();
  });

  it('supports dragging the viewport rectangle for navigation', async () => {
    const container = new MockMinimapContainer();
    container.setRect({ width: 100, height: 100 });
    const viewport = new MockMinimapViewport();
    const minimap = new Minimap(container, buildMinimapGraph(), viewport, {
      width: 100,
      height: 100,
    });
    const indicator = minimap.getState().viewportIndicator;
    const before = viewport.getTransform();

    await minimap.handlePointerDown({
      clientX: indicator.minX + 2,
      clientY: indicator.minY + 2,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    });
    await minimap.handlePointerMove({
      clientX: indicator.minX + 12,
      clientY: indicator.minY + 7,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    });
    await minimap.handlePointerUp({
      clientX: indicator.minX + 12,
      clientY: indicator.minY + 7,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    });

    expect(viewport.getTransform().x).not.toBe(before.x);
    expect(viewport.getTransform().y).not.toBe(before.y);
    expect(minimap.getState().dragging).toBe(false);

    minimap.destroy();
  });

  it('highlights the viewport indicator on hover and clears it on exit', () => {
    const container = new MockMinimapContainer();
    const viewport = new MockMinimapViewport();
    const minimap = new Minimap(container, buildMinimapGraph(), viewport);
    const indicator = minimap.getState().viewportIndicator;

    minimap.handlePointerOver({
      clientX: indicator.minX + 1,
      clientY: indicator.minY + 1,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    });
    expect(minimap.getState().viewportIndicatorHighlighted).toBe(true);
    expect(container.style.cursor).toBe('grab');

    minimap.handlePointerOut({
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    });
    expect(minimap.getState().viewportIndicatorHighlighted).toBe(false);
    expect(container.style.cursor).toBe('default');

    minimap.destroy();
  });

  it('supports wheel zoom and keyboard navigation while isolating events', async () => {
    const container = new MockMinimapContainer();
    const viewport = new MockMinimapViewport();
    const minimap = new Minimap(container, buildMinimapGraph(), viewport);
    const stopPropagation = vi.fn();
    const preventDefault = vi.fn();
    const before = viewport.getTransform();

    await minimap.handleWheel({
      deltaY: -1,
      preventDefault,
      stopPropagation,
    });
    await minimap.handleKeyDown({
      key: 'ArrowRight',
      preventDefault,
      stopPropagation,
    });

    expect(viewport.zoomByCalls).toHaveLength(1);
    expect(viewport.getTransform().scale).toBeGreaterThan(before.scale);
    expect(viewport.getTransform().x).not.toBe(before.x);
    expect(stopPropagation).toHaveBeenCalledTimes(2);
    expect(preventDefault).toHaveBeenCalledTimes(2);

    minimap.destroy();
  });

  it('supports root event binding and visibility toggling', async () => {
    const container = new MockMinimapContainer();
    const viewport = new MockMinimapViewport();
    const minimap = new Minimap(container, buildMinimapGraph(), viewport);

    expect(container.listenerCount('click')).toBe(1);
    expect(container.listenerCount('pointerdown')).toBe(1);
    expect(container.listenerCount('wheel')).toBe(1);

    container.dispatch('click', {
      clientX: 10,
      clientY: 10,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    });
    await Promise.resolve();
    expect(viewport.panToCalls.length).toBeGreaterThan(0);

    minimap.setVisible(false);
    expect(minimap.getState().visible).toBe(false);
    expect(container.style.display).toBe('none');

    minimap.destroy();
    expect(container.listenerCount('click')).toBe(0);
  });

  it('refreshes within the expected viewport-update budget', async () => {
    const container = new MockMinimapContainer();
    const viewport = new MockMinimapViewport();
    const minimap = new Minimap(container, buildMinimapGraph(), viewport);

    const startedAt = performance.now();
    await viewport.panBy(-20, -10);

    expect(performance.now() - startedAt).toBeLessThan(100);
    expect(minimap.getState().updatedAt).toBeGreaterThan(0);

    minimap.destroy();
  });
});
