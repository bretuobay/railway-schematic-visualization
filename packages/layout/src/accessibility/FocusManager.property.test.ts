import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';

import { FocusManager } from './FocusManager';

describe('FocusManager properties', () => {
  it('always exposes a skip-to-content link and can activate it when configured', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 30 }),
        async (label) => {
          const manager = new FocusManager({
            skipToContentLabel: label,
          });
          const action = vi.fn();

          expect(manager.getSkipToContent().label).toBe(label);
          manager.setSkipToContent(action, label);
          expect(manager.activateSkipToContent()).toBe(true);
          expect(action).toHaveBeenCalledTimes(1);
        },
      ),
    );
  });
});
