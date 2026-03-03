import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';

import { KeyboardShortcuts } from './KeyboardShortcuts';
import { SelectionEngine } from './SelectionEngine';

describe('KeyboardShortcuts properties', () => {
  it('executes registered shortcuts and prevents default browser behavior', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('+', '-', '0', 'f', 'Escape'),
        async (key) => {
          const zoomBy = vi.fn();
          const zoomTo = vi.fn();
          const fitToView = vi.fn();
          const selection = new SelectionEngine({ selectionMode: 'multi' });
          const preventDefault = vi.fn();
          const shortcuts = new KeyboardShortcuts({
            viewportController: {
              zoomBy,
              zoomTo,
              getTransform: () => ({ scale: 1 }),
            },
            fitToView: {
              fitToView,
              fitSelection: vi.fn(),
            },
            selectionEngine: selection,
            getFitBounds: {
              minX: 0,
              minY: 0,
              maxX: 10,
              maxY: 10,
            },
          });

          selection.select('a');

          await shortcuts.handleKeyDown({
            key,
            preventDefault,
          });

          expect(preventDefault).toHaveBeenCalledTimes(1);

          if (key === '+') {
            expect(zoomBy).toHaveBeenCalled();
          } else if (key === '-') {
            expect(zoomBy).toHaveBeenCalled();
          } else if (key === '0') {
            expect(zoomTo).toHaveBeenCalledWith(1);
          } else if (key === 'f') {
            expect(fitToView).toHaveBeenCalled();
          } else {
            expect(selection.getSelection()).toEqual([]);
          }

          shortcuts.destroy();
        },
      ),
    );
  });

  it('toggles help display with the help shortcut', async () => {
    await fc.assert(
      fc.asyncProperty(fc.boolean(), async (initialVisible) => {
        const shortcuts = new KeyboardShortcuts();

        if (initialVisible) {
          await shortcuts.handleKeyDown({
            key: '?',
            shiftKey: true,
            preventDefault: vi.fn(),
          });
        }

        const before = shortcuts.isHelpVisible();

        await shortcuts.handleKeyDown({
          key: '?',
          shiftKey: true,
          preventDefault: vi.fn(),
        });

        expect(shortcuts.isHelpVisible()).toBe(!before);

        shortcuts.destroy();
      }),
    );
  });
});
