import { performance } from 'node:perf_hooks';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { EventManager } from './EventManager';
import { HoverInteraction } from './HoverInteraction';
import {
  MockInteractionElement,
  MockInteractionRoot,
} from './EventManager.test-helpers';

describe('HoverInteraction', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits hover events when elements are hovered', () => {
    const manager = new EventManager(new MockInteractionRoot());
    const hover = new HoverInteraction(manager);
    const handler = vi.fn();

    hover.on('hover', handler);
    manager.emit('element-hover', {
      element: {
        id: 'station-a',
        type: 'station',
        properties: { name: 'Station A' },
        isOverlay: false,
      },
      coordinates: { x: 10, y: 20 },
      originalEvent: { target: new MockInteractionElement() },
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        element: expect.objectContaining({ id: 'station-a' }),
        tooltip: expect.objectContaining({
          visible: true,
          content: 'Station A',
        }),
      }),
    );

    hover.destroy();
    manager.destroy();
  });

  it('emits hover-end events when the cursor leaves an element', () => {
    const manager = new EventManager(new MockInteractionRoot());
    const hover = new HoverInteraction(manager);
    const handler = vi.fn();

    hover.on('hover-end', handler);
    manager.emit('element-hover', {
      element: {
        id: 'station-a',
        type: 'station',
        properties: {},
        isOverlay: false,
      },
      coordinates: { x: 10, y: 20 },
    });
    manager.emit('element-hover-end', {
      coordinates: { x: 12, y: 24 },
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(hover.getHoveredElement()).toBeUndefined();
    expect(hover.getTooltipState().visible).toBe(false);

    hover.destroy();
    manager.destroy();
  });

  it('applies and clears configured hover styles on the hovered target', () => {
    const manager = new EventManager(new MockInteractionRoot());
    const hover = new HoverInteraction(manager, {
      hoverStyles: {
        outline: '2px solid red',
        opacity: '0.85',
      },
    });
    const target = new MockInteractionElement();

    manager.emit('element-hover', {
      element: {
        id: 'station-a',
        type: 'station',
        properties: {},
        isOverlay: false,
      },
      coordinates: { x: 10, y: 20 },
      originalEvent: { target },
    });

    expect(target.style).toEqual({
      outline: '2px solid red',
      opacity: '0.85',
    });

    manager.emit('element-hover-end', {
      coordinates: { x: 12, y: 24 },
      originalEvent: { target },
    });

    expect(target.style).toEqual({});

    hover.destroy();
    manager.destroy();
  });

  it('supports delayed hover activation', () => {
    vi.useFakeTimers();
    const manager = new EventManager(new MockInteractionRoot());
    const hover = new HoverInteraction(manager, {
      hoverDelayMs: 50,
    });
    const handler = vi.fn();

    hover.on('hover', handler);
    manager.emit('element-hover', {
      element: {
        id: 'station-a',
        type: 'station',
        properties: {},
        isOverlay: false,
      },
      coordinates: { x: 10, y: 20 },
    });

    expect(handler).not.toHaveBeenCalled();

    vi.advanceTimersByTime(49);
    expect(handler).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(handler).toHaveBeenCalledTimes(1);

    hover.destroy();
    manager.destroy();
  });

  it('renders tooltips with default and custom templates', () => {
    const manager = new EventManager(new MockInteractionRoot());
    const hover = new HoverInteraction(manager, {
      tooltipTemplate: (element) => `Tooltip:${element.id}`,
    });

    manager.emit('element-hover', {
      element: {
        id: 'signal-1',
        type: 'signal',
        properties: { label: 'Signal 1' },
        isOverlay: false,
      },
      coordinates: { x: 20, y: 30 },
    });

    expect(hover.getTooltipState().content).toBe('Tooltip:signal-1');

    hover.destroy();
    manager.destroy();

    const defaultManager = new EventManager(new MockInteractionRoot());
    const defaultHover = new HoverInteraction(defaultManager);

    defaultManager.emit('element-hover', {
      element: {
        id: 'signal-2',
        type: 'signal',
        properties: { label: 'Signal 2' },
        isOverlay: false,
      },
      coordinates: { x: 20, y: 30 },
    });

    expect(defaultHover.getTooltipState().content).toBe('Signal 2');

    defaultHover.destroy();
    defaultManager.destroy();
  });

  it('positions tooltips to avoid viewport edges', () => {
    const manager = new EventManager(new MockInteractionRoot());
    const hover = new HoverInteraction(manager, {
      viewportWidth: 200,
      viewportHeight: 120,
      tooltipWidth: 80,
      tooltipHeight: 40,
      tooltipMargin: 10,
    });

    manager.emit('element-hover', {
      element: {
        id: 'station-a',
        type: 'station',
        properties: {},
        isOverlay: false,
      },
      coordinates: { x: 195, y: 118 },
    });

    expect(hover.getTooltipState().position).toEqual({
      x: 110,
      y: 70,
    });

    hover.destroy();
    manager.destroy();
  });

  it('updates hover state within the expected performance budget', () => {
    const manager = new EventManager(new MockInteractionRoot());
    const hover = new HoverInteraction(manager);
    const startedAt = performance.now();

    for (let index = 0; index < 1000; index += 1) {
      manager.emit('element-hover', {
        element: {
          id: `station-${index}`,
          type: 'station',
          properties: { label: `Station ${index}` },
          isOverlay: false,
        },
        coordinates: { x: index % 800, y: index % 600 },
      });
    }

    expect(performance.now() - startedAt).toBeLessThan(16);

    hover.destroy();
    manager.destroy();
  });
});
