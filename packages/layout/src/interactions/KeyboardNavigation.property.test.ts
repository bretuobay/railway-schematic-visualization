import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { MockInteractionElement } from './EventManager.test-helpers';
import {
  KeyboardNavigation,
  keyboardNavigationInternals,
} from './KeyboardNavigation';
import { SelectionEngine } from './SelectionEngine';

describe('KeyboardNavigation properties', () => {
  it('cycles focus traversal with Tab and Shift+Tab', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 10 }), (count) => {
        const navigation = new KeyboardNavigation();

        for (let index = 0; index < count; index += 1) {
          navigation.registerElement({
            id: `node-${index}`,
            type: 'station',
          });
        }

        for (let index = 0; index <= count; index += 1) {
          navigation.handleKeyDown({ key: 'Tab' });
        }

        expect(navigation.getFocusedId()).toBe('node-0');

        navigation.handleKeyDown({ key: 'Tab', shiftKey: true });
        expect(navigation.getFocusedId()).toBe(`node-${count - 1}`);
      }),
    );
  });

  it('applies visible focus indicator styles when focused', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 12 }), (id) => {
        const target = new MockInteractionElement();
        const navigation = new KeyboardNavigation();

        navigation.registerElement({
          id,
          type: 'station',
          target,
        });
        navigation.focus(id);

        expect(Object.keys(target.style).length).toBeGreaterThan(0);
      }),
    );
  });

  it('uses a focus indicator contrast ratio that meets WCAG minimum', () => {
    fc.assert(
      fc.property(
        fc.constant('#0b57d0'),
        fc.constant('#ffffff'),
        (foreground, background) => {
          expect(
            keyboardNavigationInternals.contrastRatio(foreground, background),
          ).toBeGreaterThanOrEqual(3);
        },
      ),
    );
  });

  it('navigates topologically to connected elements in the requested direction', () => {
    fc.assert(
      fc.property(fc.integer({ min: 10, max: 200 }), (distance) => {
        const navigation = new KeyboardNavigation();

        navigation.registerElement({
          id: 'center',
          type: 'junction',
          position: { x: 100, y: 100 },
        });
        navigation.registerElement({
          id: 'right',
          type: 'station',
          position: { x: 100 + distance, y: 100 },
        });
        navigation.connectElements('center', 'right');
        navigation.focus('center');
        navigation.navigate('right');

        expect(navigation.getFocusedId()).toBe('right');
      }),
    );
  });

  it('activates the currently focused element with keyboard activation keys', () => {
    fc.assert(
      fc.property(fc.constantFrom('Enter', ' ', 'Spacebar'), (key) => {
        const navigation = new KeyboardNavigation();

        navigation.registerElement({
          id: 'station-a',
          type: 'station',
        });
        navigation.focus('station-a');

        expect(navigation.handleKeyDown({ key })).toBe('station-a');
      }),
    );
  });

  it('clears selection and focus on Escape', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 12 }), (id) => {
        const selection = new SelectionEngine();
        const navigation = new KeyboardNavigation({
          selectionEngine: selection,
        });

        selection.select(id);
        navigation.registerElement({
          id,
          type: 'station',
        });
        navigation.focus(id);
        navigation.handleKeyDown({ key: 'Escape' });

        expect(selection.getSelection()).toEqual([]);
        expect(navigation.getFocusedId()).toBeNull();
      }),
    );
  });
});
