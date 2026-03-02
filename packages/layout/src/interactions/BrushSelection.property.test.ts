import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { SelectionEngine } from './SelectionEngine';
import { BrushSelection } from './BrushSelection';

describe('BrushSelection properties', () => {
  it('selects all registered elements within the brush bounds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 20 }),
        fc.integer({ min: 1, max: 5 }),
        (count, width) => {
          const selection = new SelectionEngine();
          const brush = new BrushSelection(selection);
          const effectiveWidth = Math.min(count, width);

          for (let index = 0; index < count; index += 1) {
            brush.registerElement({
              id: `node-${index}`,
              bounds: {
                minX: index * 10,
                minY: 0,
                maxX: index * 10 + 4,
                maxY: 4,
              },
            });
          }

          brush.start({ x: 0, y: 0 });
          brush.update({ x: (effectiveWidth - 1) * 10 + 4, y: 4 });
          brush.end('replace');

          expect(selection.getSelection()).toEqual(
            Array.from({ length: effectiveWidth }, (_, index) => `node-${index}`),
          );
        },
      ),
    );
  });

  it('adds brush hits to existing selection in additive mode', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 10 }), (count) => {
        const selection = new SelectionEngine({ selectionMode: 'multi' });
        const brush = new BrushSelection(selection);

        for (let index = 0; index < count; index += 1) {
          brush.registerElement({
            id: `node-${index}`,
            bounds: {
              minX: index * 10,
              minY: 0,
              maxX: index * 10 + 4,
              maxY: 4,
            },
          });
        }

        selection.select('preselected');
        brush.start({ x: 0, y: 0 });
        brush.update({ x: 14, y: 4 });
        brush.end('add');

        expect(selection.getSelection()).toEqual([
          'preselected',
          'node-0',
          'node-1',
        ]);
      }),
    );
  });

  it('removes brush hits from existing selection in subtractive mode', () => {
    fc.assert(
      fc.property(fc.integer({ min: 3, max: 12 }), (count) => {
        const selection = new SelectionEngine({ selectionMode: 'multi' });
        const brush = new BrushSelection(selection);

        for (let index = 0; index < count; index += 1) {
          const id = `node-${index}`;

          brush.registerElement({
            id,
            bounds: {
              minX: index * 10,
              minY: 0,
              maxX: index * 10 + 4,
              maxY: 4,
            },
          });
          selection.select(id, { additive: true });
        }

        brush.start({ x: 0, y: 0 });
        brush.update({ x: 14, y: 4 });
        brush.end('subtract');

        expect(selection.getSelection()).toEqual(
          Array.from({ length: count - 2 }, (_, index) => `node-${index + 2}`),
        );
      }),
    );
  });
});
