import { describe, expect, it, vi } from 'vitest';

import { EventManager } from './EventManager';
import {
  MockInteractionElement,
  MockInteractionRoot,
} from './EventManager.test-helpers';

describe('EventManager', () => {
  it('sets up delegated listeners on the root element', () => {
    const root = new MockInteractionRoot();
    const manager = new EventManager(root);

    expect(root.listenerCount('click')).toBe(1);
    expect(root.listenerCount('dblclick')).toBe(1);
    expect(root.listenerCount('contextmenu')).toBe(1);
    expect(root.listenerCount('pointerover')).toBe(1);
    expect(root.listenerCount('pointerout')).toBe(1);
    expect(root.listenerCount('focusin')).toBe(1);

    manager.destroy();

    expect(root.listenerCount('click')).toBe(0);
    expect(root.listenerCount('focusin')).toBe(0);
  });

  it('emits click events using delegated targets', () => {
    const root = new MockInteractionRoot();
    const manager = new EventManager(root);
    const handler = vi.fn();
    const element = new MockInteractionElement({
      elementId: 'station-a',
      elementType: 'station',
      elementProps: JSON.stringify({ name: 'Station A' }),
    });

    manager.on('element-click', handler);
    root.dispatch('click', {
      target: element,
      offsetX: 12,
      offsetY: 34,
    });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'element-click',
        coordinates: { x: 12, y: 34 },
        element: expect.objectContaining({
          id: 'station-a',
          type: 'station',
          properties: { name: 'Station A' },
        }),
      }),
    );
  });

  it('emits double-click and context-menu events', () => {
    const root = new MockInteractionRoot();
    const manager = new EventManager(root);
    const onDoubleClick = vi.fn();
    const onContextMenu = vi.fn();
    const preventDefault = vi.fn();
    const element = new MockInteractionElement({
      elementId: 'track-1',
      elementType: 'track',
    });

    manager.on('element-dblclick', onDoubleClick);
    manager.on('element-contextmenu', onContextMenu);

    root.dispatch('dblclick', {
      target: element,
      clientX: 5,
      clientY: 10,
    });
    root.dispatch('contextmenu', {
      target: element,
      clientX: 8,
      clientY: 13,
      preventDefault,
    });

    expect(onDoubleClick).toHaveBeenCalledTimes(1);
    expect(onContextMenu).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it('supports manual emission for non-native interaction events', () => {
    const root = new MockInteractionRoot();
    const manager = new EventManager(root);
    const onSelectionChange = vi.fn();

    manager.on('selection-change', onSelectionChange);
    manager.emit('selection-change', {
      selection: ['station-a', 'track-1'],
    });

    expect(onSelectionChange).toHaveBeenCalledWith({
      event: 'selection-change',
      selection: ['station-a', 'track-1'],
    });
  });

  it('uses parent traversal for delegated event lookup', () => {
    const root = new MockInteractionRoot();
    const manager = new EventManager(root);
    const handler = vi.fn();
    const parent = new MockInteractionElement({
      elementId: 'signal-1',
      elementType: 'signal',
      customProps: JSON.stringify({ aspect: 'green' }),
    });
    const child = new MockInteractionElement({
      parentElement: parent,
    });

    manager.on('element-click', handler);
    root.dispatch('click', {
      target: child,
      clientX: 20,
      clientY: 25,
    });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        element: expect.objectContaining({
          id: 'signal-1',
          type: 'signal',
          properties: { aspect: 'green' },
        }),
      }),
    );
  });

  it('propagates overlay clicks to the overlay and underlying track', () => {
    const root = new MockInteractionRoot();
    const manager = new EventManager(root);
    const handler = vi.fn();
    const overlay = new MockInteractionElement({
      elementId: 'overlay-1',
      elementType: 'overlay',
      overlayFor: 'track-42',
      underlyingType: 'track',
      elementProps: JSON.stringify({ source: 'adornment' }),
    });

    manager.on('element-click', handler);
    root.dispatch('click', {
      target: overlay,
      clientX: 0,
      clientY: 0,
    });

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        element: expect.objectContaining({
          id: 'overlay-1',
          type: 'overlay',
          isOverlay: true,
        }),
      }),
    );
    expect(handler).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        element: expect.objectContaining({
          id: 'track-42',
          type: 'track',
          isOverlay: false,
        }),
      }),
    );
  });

  it('emits hover and focus change events from delegated native events', () => {
    const root = new MockInteractionRoot();
    const manager = new EventManager(root);
    const onHover = vi.fn();
    const onHoverEnd = vi.fn();
    const onFocus = vi.fn();
    const element = new MockInteractionElement({
      elementId: 'station-b',
      elementType: 'station',
    });

    manager.on('element-hover', onHover);
    manager.on('element-hover-end', onHoverEnd);
    manager.on('focus-change', onFocus);

    root.dispatch('pointerover', { target: element, clientX: 1, clientY: 2 });
    root.dispatch('pointerout', { target: element, clientX: 3, clientY: 4 });
    root.dispatch('focusin', { target: element, clientX: 5, clientY: 6 });

    expect(onHover).toHaveBeenCalledTimes(1);
    expect(onHoverEnd).toHaveBeenCalledTimes(1);
    expect(onFocus).toHaveBeenCalledTimes(1);
  });
});
