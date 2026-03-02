import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { OverlayManager } from './OverlayManager';

describe('OverlayManager configuration properties', () => {
  it('applies defaults and preserves valid values', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.integer({ min: -10, max: 10 }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        (visible, zIndex, opacity) => {
          const manager = new OverlayManager();
          const configuration = manager.validateConfigurationForType('custom', {
            visible,
            zIndex,
            opacity,
          });

          expect(configuration.visible).toBe(visible);
          expect(configuration.zIndex).toBe(zIndex);
          expect(configuration.opacity).toBe(opacity);
          expect(configuration.interactive).toBe(false);
          expect(configuration.animationEnabled).toBe(false);
        },
      ),
    );
  });
});
