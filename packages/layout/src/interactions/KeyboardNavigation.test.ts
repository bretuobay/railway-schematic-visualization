import { describe, expect, it, vi } from 'vitest';

import { EventManager } from './EventManager';
import {
  MockInteractionElement,
  MockInteractionRoot,
} from './EventManager.test-helpers';
import { KeyboardNavigation } from './KeyboardNavigation';
import { SelectionEngine } from './SelectionEngine';

describe('KeyboardNavigation', () => {
  it('supports Tab and Shift+Tab traversal', () => {
    const navigation = new KeyboardNavigation();

    navigation.registerElement({ id: 'a', type: 'station' });
    navigation.registerElement({ id: 'b', type: 'station' });
    navigation.registerElement({ id: 'c', type: 'station' });

    navigation.handleKeyDown({ key: 'Tab' });
    expect(navigation.getFocusedId()).toBe('a');

    navigation.handleKeyDown({ key: 'Tab' });
    expect(navigation.getFocusedId()).toBe('b');

    navigation.handleKeyDown({ key: 'Tab', shiftKey: true });
    expect(navigation.getFocusedId()).toBe('a');
  });

  it('supports arrow-key topological navigation', () => {
    const navigation = new KeyboardNavigation();

    navigation.registerElement({
      id: 'center',
      type: 'junction',
      position: { x: 50, y: 50 },
    });
    navigation.registerElement({
      id: 'left',
      type: 'station',
      position: { x: 0, y: 50 },
    });
    navigation.registerElement({
      id: 'right',
      type: 'station',
      position: { x: 100, y: 50 },
    });
    navigation.connectElements('center', 'left');
    navigation.connectElements('center', 'right');
    navigation.focus('center');

    navigation.handleKeyDown({ key: 'ArrowRight' });
    expect(navigation.getFocusedId()).toBe('right');

    navigation.focus('center');
    navigation.handleKeyDown({ key: 'ArrowLeft' });
    expect(navigation.getFocusedId()).toBe('left');
  });

  it('activates focused elements with Enter and Space', () => {
    const navigation = new KeyboardNavigation();
    const onActivate = vi.fn();

    navigation.registerElement({ id: 'a', type: 'station' });
    navigation.on('activate', onActivate);
    navigation.focus('a');
    navigation.handleKeyDown({ key: 'Enter' });
    navigation.handleKeyDown({ key: ' ' });

    expect(onActivate).toHaveBeenCalledTimes(2);
    expect(onActivate).toHaveBeenNthCalledWith(1, { focusedId: 'a' });
  });

  it('clears selection and focus on Escape', () => {
    const selection = new SelectionEngine();
    const navigation = new KeyboardNavigation({ selectionEngine: selection });

    selection.select('a');
    navigation.registerElement({ id: 'a', type: 'station' });
    navigation.focus('a');
    navigation.handleKeyDown({ key: 'Escape' });

    expect(selection.getSelection()).toEqual([]);
    expect(navigation.getFocusedId()).toBeNull();
  });

  it('renders and clears focus indicator styles', () => {
    const target = new MockInteractionElement();
    const navigation = new KeyboardNavigation({
      focusStyles: {
        outline: '3px solid #0b57d0',
        boxShadow: '0 0 0 2px rgba(11,87,208,0.3)',
      },
    });

    navigation.registerElement({
      id: 'a',
      type: 'station',
      target,
    });
    navigation.focus('a');

    expect(target.style).toEqual({
      outline: '3px solid #0b57d0',
      boxShadow: '0 0 0 2px rgba(11,87,208,0.3)',
    });

    navigation.clearFocus();
    expect(target.style).toEqual({});
  });

  it('uses a focus indicator contrast ratio above the minimum requirement', () => {
    const navigation = new KeyboardNavigation({
      focusColor: '#0b57d0',
      backgroundColor: '#ffffff',
    });

    expect(navigation.getContrastRatio()).toBeGreaterThanOrEqual(3);
  });

  it('emits focus-change and forwards focus changes through the event manager bridge', () => {
    const root = new MockInteractionRoot();
    const eventManager = new EventManager(root);
    const navigation = new KeyboardNavigation({ eventManager });
    const onFocusChange = vi.fn();
    const forwarded = vi.fn();

    navigation.registerElement({ id: 'a', type: 'station' });
    navigation.on('focus-change', onFocusChange);
    eventManager.on('focus-change', forwarded);
    navigation.focus('a');

    expect(onFocusChange).toHaveBeenCalledWith({
      focusedId: 'a',
      previousFocusedId: null,
    });
    expect(forwarded).toHaveBeenCalledWith({
      event: 'focus-change',
      element: {
        id: 'a',
        type: 'station',
        properties: {},
        isOverlay: false,
      },
    });

    eventManager.destroy();
  });

  it('binds keydown listeners when a root is provided', () => {
    const root = new MockInteractionRoot();
    const navigation = new KeyboardNavigation({ root });

    navigation.registerElement({ id: 'a', type: 'station' });
    root.dispatch('keydown', { key: 'Tab', preventDefault: vi.fn() });

    expect(navigation.getFocusedId()).toBe('a');

    navigation.destroy();
    expect(root.listenerCount('keydown')).toBe(0);
  });
});
