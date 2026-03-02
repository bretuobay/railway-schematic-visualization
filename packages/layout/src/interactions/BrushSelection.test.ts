import { describe, expect, it, vi } from 'vitest';

import { EventManager } from './EventManager';
import { MockInteractionRoot } from './EventManager.test-helpers';
import { BrushSelection } from './BrushSelection';
import { SelectionEngine } from './SelectionEngine';

describe('BrushSelection', () => {
  it('shows a selection rectangle during brush drag', () => {
    const brush = new BrushSelection(new SelectionEngine());

    brush.start({ x: 10, y: 20 });
    expect(brush.getState()).toEqual({
      active: true,
      rect: { minX: 10, minY: 20, maxX: 10, maxY: 20 },
      visible: true,
      styles: expect.any(Object),
    });

    brush.update({ x: 30, y: 40 });
    expect(brush.getState().rect).toEqual({
      minX: 10,
      minY: 20,
      maxX: 30,
      maxY: 40,
    });
  });

  it('selects all registered elements within the brush bounds', () => {
    const selection = new SelectionEngine();
    const brush = new BrushSelection(selection);

    brush.registerElement({
      id: 'a',
      bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
    });
    brush.registerElement({
      id: 'b',
      bounds: { minX: 15, minY: 0, maxX: 25, maxY: 10 },
    });
    brush.registerElement({
      id: 'c',
      bounds: { minX: 40, minY: 0, maxX: 50, maxY: 10 },
    });

    brush.start({ x: 0, y: 0 });
    brush.update({ x: 26, y: 10 });
    const payload = brush.end();

    expect(payload.selection).toEqual(['a', 'b']);
    expect(selection.getSelection()).toEqual(['a', 'b']);
    expect(brush.getState().visible).toBe(false);
  });

  it('uses the configured modifier key and visual feedback styles', () => {
    const brush = new BrushSelection(new SelectionEngine(), {
      modifierKey: 'Shift',
      rectangleStyles: {
        fill: 'rgba(0,0,0,0.1)',
        stroke: '#111111',
      },
    });

    expect(brush.getModifierKey()).toBe('Shift');
    expect(brush.getState().styles).toEqual({
      fill: 'rgba(0,0,0,0.1)',
      stroke: '#111111',
      strokeWidth: '1',
    });
  });

  it('supports additive mode', () => {
    const selection = new SelectionEngine({ selectionMode: 'multi' });
    const brush = new BrushSelection(selection);

    selection.select('preselected');
    brush.registerElement({
      id: 'a',
      bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
    });
    brush.start({ x: 0, y: 0 });
    brush.update({ x: 10, y: 10 });
    brush.end('add');

    expect(selection.getSelection()).toEqual(['preselected', 'a']);
  });

  it('supports subtractive mode', () => {
    const selection = new SelectionEngine({ selectionMode: 'multi' });
    const brush = new BrushSelection(selection);

    brush.registerElement({
      id: 'a',
      bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
    });
    brush.registerElement({
      id: 'b',
      bounds: { minX: 20, minY: 0, maxX: 30, maxY: 10 },
    });
    selection.select('a');
    selection.select('b', { additive: true });

    brush.start({ x: 0, y: 0 });
    brush.update({ x: 10, y: 10 });
    brush.end('subtract');

    expect(selection.getSelection()).toEqual(['b']);
  });

  it('emits brush lifecycle events through the event manager and brush-selection to listeners', () => {
    const root = new MockInteractionRoot();
    const eventManager = new EventManager(root);
    const selection = new SelectionEngine();
    const brush = new BrushSelection(selection, { eventManager });
    const onBrushSelection = vi.fn();
    const onBrushStart = vi.fn();
    const onBrushMove = vi.fn();
    const onBrushEnd = vi.fn();

    brush.registerElement({
      id: 'a',
      bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
    });

    brush.on('brush-selection', onBrushSelection);
    eventManager.on('brush-start', onBrushStart);
    eventManager.on('brush-move', onBrushMove);
    eventManager.on('brush-end', onBrushEnd);

    brush.start({ x: 0, y: 0 });
    brush.update({ x: 10, y: 10 });
    brush.end();

    expect(onBrushSelection).toHaveBeenCalledWith({
      selection: ['a'],
      mode: 'replace',
      rect: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
    });
    expect(onBrushStart).toHaveBeenCalledTimes(1);
    expect(onBrushMove).toHaveBeenCalledTimes(1);
    expect(onBrushEnd).toHaveBeenCalledTimes(1);

    eventManager.destroy();
  });
});
