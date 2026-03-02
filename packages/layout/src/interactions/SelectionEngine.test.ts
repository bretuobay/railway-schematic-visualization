import { describe, expect, it, vi } from 'vitest';

import { EventManager } from './EventManager';
import {
  MockInteractionElement,
  MockInteractionRoot,
} from './EventManager.test-helpers';
import { SelectionEngine } from './SelectionEngine';

describe('SelectionEngine', () => {
  it('selects elements on click in single mode', () => {
    const selection = new SelectionEngine();

    selection.handleElementClick('station-a');

    expect(selection.getSelection()).toEqual(['station-a']);

    selection.handleElementClick('station-b');

    expect(selection.getSelection()).toEqual(['station-b']);
  });

  it('clears selection on background click', () => {
    const selection = new SelectionEngine({ selectionMode: 'multi' });

    selection.select('station-a');
    selection.select('station-b', { additive: true });
    selection.handleBackgroundClick();

    expect(selection.getSelection()).toEqual([]);
  });

  it('toggles selection on shift-click', () => {
    const selection = new SelectionEngine();

    selection.handleElementClick('station-a');
    expect(selection.isSelected('station-a')).toBe(true);

    selection.handleElementClick('station-a', { shiftKey: true });

    expect(selection.isSelected('station-a')).toBe(false);
  });

  it('applies and removes configured selection styles', () => {
    const target = new MockInteractionElement();
    const selection = new SelectionEngine({
      selectedStyles: {
        outline: '2px solid blue',
        opacity: '1',
      },
    });

    selection.registerElement('station-a', 'station', target);
    selection.select('station-a');

    expect(target.style).toEqual({
      outline: '2px solid blue',
      opacity: '1',
    });

    selection.clearSelection();

    expect(target.style).toEqual({});
  });

  it('emits selection-change events through internal listeners and the event manager bridge', () => {
    const root = new MockInteractionRoot();
    const eventManager = new EventManager(root);
    const selection = new SelectionEngine({ eventManager });
    const onSelectionChange = vi.fn();
    const forwardedSelection = vi.fn();

    selection.on('selection-change', onSelectionChange);
    eventManager.on('selection-change', forwardedSelection);
    selection.select('station-a');

    expect(onSelectionChange).toHaveBeenCalledWith({
      selection: ['station-a'],
      added: ['station-a'],
      removed: [],
      mode: 'single',
    });
    expect(forwardedSelection).toHaveBeenCalledWith({
      event: 'selection-change',
      selection: ['station-a'],
    });

    selection.destroy();
    eventManager.destroy();
  });

  it('supports programmatic selection methods', () => {
    const selection = new SelectionEngine({ selectionMode: 'multi' });

    selection.select('station-a');
    selection.select('station-b', { additive: true });
    selection.toggle('station-c');
    selection.toggle('station-b');

    expect(selection.getSelection()).toEqual(['station-a', 'station-c']);

    selection.deselect('station-a');
    expect(selection.getSelection()).toEqual(['station-c']);

    selection.clearSelection();
    expect(selection.getSelection()).toEqual([]);
  });

  it('supports selectByType and selectByPredicate', () => {
    const selection = new SelectionEngine({ selectionMode: 'multi' });

    selection.registerElement('station-a', 'station');
    selection.registerElement('station-b', 'station');
    selection.registerElement('signal-a', 'signal');

    selection.selectByType('station');
    expect(selection.getSelection()).toEqual(['station-a', 'station-b']);

    selection.selectByPredicate(
      (registration) => registration.id.endsWith('-a'),
      { additive: false },
    );

    expect(selection.getSelection()).toEqual(['station-a', 'signal-a']);
  });

  it('can bind delegated element clicks from the event manager', () => {
    const root = new MockInteractionRoot();
    const eventManager = new EventManager(root);
    const selection = new SelectionEngine({
      selectionMode: 'multi',
      eventManager,
    });
    const targetA = new MockInteractionElement();
    const targetB = new MockInteractionElement();

    eventManager.emit('element-click', {
      element: {
        id: 'station-a',
        type: 'station',
        properties: {},
        isOverlay: false,
      },
      originalEvent: {
        shiftKey: false,
        target: targetA,
      },
    });
    eventManager.emit('element-click', {
      element: {
        id: 'station-b',
        type: 'station',
        properties: {},
        isOverlay: false,
      },
      originalEvent: {
        shiftKey: false,
        target: targetB,
      },
    });

    expect(selection.getSelection()).toEqual(['station-a', 'station-b']);

    selection.destroy();
    eventManager.destroy();
  });
});
