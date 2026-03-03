import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { isRailOverlay } from '.';

describe('overlay interface compliance', () => {
  it('accepts valid overlay shapes and rejects non-objects', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (type) => {
        const overlay = {
          type,
          initialize: () => undefined,
          render: () => ({ elementCount: 0, durationMs: 0 }),
          update: () => undefined,
          resize: () => undefined,
          destroy: () => undefined,
        };

        expect(isRailOverlay(overlay)).toBe(true);
        expect(isRailOverlay(null)).toBe(false);
        expect(isRailOverlay(type)).toBe(false);
      }),
    );
  });
});
