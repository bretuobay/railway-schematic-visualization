import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { MockInteractionElement } from './EventManager.test-helpers';
import { SelectionEngine } from './SelectionEngine';

describe('SelectionEngine properties', () => {
  it('selects the clicked element in single-selection mode', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 12 }), (id) => {
        const selection = new SelectionEngine();

        selection.handleElementClick(id);

        expect(selection.getSelection()).toEqual([id]);
      }),
    );
  });

  it('clears selection on background click', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 8 }), {
          minLength: 1,
          maxLength: 5,
        }),
        (ids) => {
          const selection = new SelectionEngine({ selectionMode: 'multi' });

          ids.forEach((id) => {
            selection.select(id, { additive: true });
          });

          selection.handleBackgroundClick();

          expect(selection.getSelection()).toEqual([]);
        },
      ),
    );
  });

  it('toggles selection state on shift-click', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 12 }), (id) => {
        const selection = new SelectionEngine();

        selection.handleElementClick(id);
        selection.handleElementClick(id, { shiftKey: true });

        expect(selection.isSelected(id)).toBe(false);
      }),
    );
  });

  it('applies configured selection styles to selected targets', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 12 }),
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.string({ minLength: 1, maxLength: 10 }),
        (id, color, strokeWidth) => {
          const target = new MockInteractionElement();
          const selection = new SelectionEngine({
            selectedStyles: {
              color,
              strokeWidth,
            },
          });

          selection.registerElement(id, 'station', target);
          selection.select(id);

          expect(target.style).toEqual({
            color,
            strokeWidth,
          });
        },
      ),
    );
  });
});
