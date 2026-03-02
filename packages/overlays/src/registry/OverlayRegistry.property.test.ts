import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { OverlayRegistry } from '.';

describe('OverlayRegistry', () => {
  it('registers custom overlay factories and creates validated overlays', () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1 })
          .filter(
            (value) =>
              value.trim().length > 0
              && !['heat-map', 'annotation', 'range-band', 'traffic-flow', 'time-series'].includes(
                value.trim(),
              ),
          ),
        (type) => {
          const registry = new OverlayRegistry();
          const normalizedType = type.trim();

          registry.register(type, () => ({
            type: normalizedType,
            initialize: () => undefined,
            render: () => ({ elementCount: 0, durationMs: 0 }),
            update: () => undefined,
            resize: () => undefined,
            destroy: () => undefined,
          }));

          expect(registry.has(type)).toBe(true);
          expect(registry.create(type).type).toBe(normalizedType);
        },
      ),
    );
  });

  it('rejects factories that do not return a RailOverlay', () => {
    const registry = new OverlayRegistry();

    registry.register('custom-invalid', (() => ({ not: 'an overlay' })) as never);

    expect(() => registry.create('custom-invalid')).toThrowError(/RailOverlay/);
  });
});
