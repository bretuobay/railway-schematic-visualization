import { describe, expect, it, vi } from 'vitest';

import { KeyboardShortcuts } from './KeyboardShortcuts';
import { SelectionEngine } from './SelectionEngine';
import { MockInteractionRoot } from './EventManager.test-helpers';

describe('KeyboardShortcuts', () => {
  it('supports zoom shortcuts (+, -, 0)', async () => {
    const zoomBy = vi.fn();
    const zoomTo = vi.fn();
    const shortcuts = new KeyboardShortcuts({
      viewportController: {
        zoomBy,
        zoomTo,
        getTransform: () => ({ scale: 1 }),
      },
    });

    await shortcuts.handleKeyDown({ key: '+', preventDefault: vi.fn() });
    await shortcuts.handleKeyDown({ key: '-', preventDefault: vi.fn() });
    await shortcuts.handleKeyDown({ key: '0', preventDefault: vi.fn() });

    expect(zoomBy).toHaveBeenNthCalledWith(1, 1.2);
    expect(zoomBy).toHaveBeenNthCalledWith(2, 1 / 1.2);
    expect(zoomTo).toHaveBeenCalledWith(1);
  });

  it('supports fit-to-view and fit-selection shortcuts', async () => {
    const fitToView = vi.fn();
    const fitSelection = vi.fn();
    const shortcuts = new KeyboardShortcuts({
      fitToView: {
        fitToView,
        fitSelection,
      },
      getFitBounds: {
        minX: 0,
        minY: 0,
        maxX: 100,
        maxY: 100,
      },
      getSelectionBounds: [
        { minX: 10, minY: 10, maxX: 20, maxY: 20 },
      ],
    });

    await shortcuts.handleKeyDown({ key: 'f', preventDefault: vi.fn() });
    await shortcuts.handleKeyDown({
      key: 'F',
      shiftKey: true,
      preventDefault: vi.fn(),
    });

    expect(fitToView).toHaveBeenCalledTimes(1);
    expect(fitSelection).toHaveBeenCalledTimes(1);
  });

  it('supports select-all and deselect-all shortcuts', async () => {
    const selection = new SelectionEngine({ selectionMode: 'multi' });
    const shortcuts = new KeyboardShortcuts({
      selectionEngine: selection,
      selectAllIds: ['a', 'b', 'c'],
    });

    await shortcuts.handleKeyDown({
      key: 'a',
      ctrlKey: true,
      preventDefault: vi.fn(),
    });
    expect(selection.getSelection()).toEqual(['a', 'b', 'c']);

    await shortcuts.handleKeyDown({
      key: 'Escape',
      preventDefault: vi.fn(),
    });
    expect(selection.getSelection()).toEqual([]);
  });

  it('supports custom shortcut registration', async () => {
    const handler = vi.fn();
    const shortcuts = new KeyboardShortcuts();

    shortcuts.registerShortcut('shift+k', handler, 'Custom');
    await shortcuts.handleKeyDown({
      key: 'k',
      shiftKey: true,
      preventDefault: vi.fn(),
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(
      shortcuts.getRegisteredShortcuts().some((shortcut) => shortcut.combo === 'shift+k'),
    ).toBe(true);
  });

  it('prevents default behavior for matched shortcuts only', async () => {
    const preventDefaultMatched = vi.fn();
    const preventDefaultUnmatched = vi.fn();
    const shortcuts = new KeyboardShortcuts();

    const matched = await shortcuts.handleKeyDown({
      key: '?',
      shiftKey: true,
      preventDefault: preventDefaultMatched,
    });
    const unmatched = await shortcuts.handleKeyDown({
      key: 'x',
      preventDefault: preventDefaultUnmatched,
    });

    expect(matched).toBe(true);
    expect(unmatched).toBe(false);
    expect(preventDefaultMatched).toHaveBeenCalledTimes(1);
    expect(preventDefaultUnmatched).not.toHaveBeenCalled();
  });

  it('toggles help display when ? is pressed', async () => {
    const shortcuts = new KeyboardShortcuts();

    expect(shortcuts.isHelpVisible()).toBe(false);

    await shortcuts.handleKeyDown({
      key: '?',
      shiftKey: true,
      preventDefault: vi.fn(),
    });
    expect(shortcuts.isHelpVisible()).toBe(true);

    await shortcuts.handleKeyDown({
      key: '?',
      shiftKey: true,
      preventDefault: vi.fn(),
    });
    expect(shortcuts.isHelpVisible()).toBe(false);
  });

  it('binds keydown listeners when a root is provided', async () => {
    const root = new MockInteractionRoot();
    const shortcuts = new KeyboardShortcuts({ root });

    expect(root.listenerCount('keydown')).toBe(1);

    root.dispatch('keydown', {
      key: '?',
      shiftKey: true,
      preventDefault: vi.fn(),
    });
    await Promise.resolve();

    expect(shortcuts.isHelpVisible()).toBe(true);

    shortcuts.destroy();
    expect(root.listenerCount('keydown')).toBe(0);
  });
});
