import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { ConfigurationValidator } from './ConfigurationValidator';

describe('ConfigurationValidator properties', () => {
  it('returns safe configuration values for layout, viewport, and interaction settings', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          padding: fc.oneof(fc.double({ min: -100, max: 1000, noNaN: true }), fc.constant(undefined)),
          overlapThreshold: fc.oneof(fc.double({ min: -100, max: 1000, noNaN: true }), fc.constant(undefined)),
          minScale: fc.oneof(fc.double({ min: -10, max: 10, noNaN: true }), fc.constant(undefined)),
          maxScale: fc.oneof(fc.double({ min: -10, max: 20, noNaN: true }), fc.constant(undefined)),
          hoverDelay: fc.oneof(fc.double({ min: -1000, max: 5000, noNaN: true }), fc.constant(undefined)),
        }),
        async (sample) => {
          const validator = new ConfigurationValidator();
          const layout = validator.validateLayoutConfig({
            ...(sample.padding !== undefined ? { padding: sample.padding } : {}),
            ...(sample.overlapThreshold !== undefined
              ? { overlapThreshold: sample.overlapThreshold }
              : {}),
          });
          const viewport = validator.validateViewportConfig({
            ...(sample.minScale !== undefined ? { minScale: sample.minScale } : {}),
            ...(sample.maxScale !== undefined ? { maxScale: sample.maxScale } : {}),
          });
          const interactions = validator.validateInteractionConfig({
            ...(sample.hoverDelay !== undefined ? { hoverDelay: sample.hoverDelay } : {}),
          });

          expect(layout.config.padding).toBeGreaterThanOrEqual(0);
          expect(layout.config.overlapThreshold).toBeGreaterThanOrEqual(0);
          expect(viewport.config.minScale).toBeGreaterThan(0);
          expect(viewport.config.maxScale).toBeGreaterThanOrEqual(viewport.config.minScale);
          expect(interactions.config.hoverDelay).toBeGreaterThanOrEqual(0);
        },
      ),
    );
  });
});
