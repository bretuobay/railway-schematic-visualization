import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { EventManager } from './EventManager';
import { HoverInteraction } from './HoverInteraction';
import { MockInteractionRoot } from './EventManager.test-helpers';

describe('HoverInteraction properties', () => {
  it('keeps tooltips within the configured viewport bounds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 50, max: 2000 }),
        fc.integer({ min: 50, max: 2000 }),
        fc.integer({ min: 20, max: 500 }),
        fc.integer({ min: 20, max: 400 }),
        fc.integer({ min: -500, max: 2500 }),
        fc.integer({ min: -500, max: 2500 }),
        fc.integer({ min: 0, max: 32 }),
        (
          viewportWidth,
          viewportHeight,
          tooltipWidth,
          tooltipHeight,
          pointX,
          pointY,
          margin,
        ) => {
          const effectiveViewportWidth = Math.max(
            viewportWidth,
            tooltipWidth + margin * 2 + 1,
          );
          const effectiveViewportHeight = Math.max(
            viewportHeight,
            tooltipHeight + margin * 2 + 1,
          );
          const manager = new EventManager(new MockInteractionRoot());
          const hover = new HoverInteraction(manager, {
            viewportWidth: effectiveViewportWidth,
            viewportHeight: effectiveViewportHeight,
            tooltipWidth,
            tooltipHeight,
            tooltipMargin: margin,
          });
          const position = hover.resolveTooltipPosition(
            { x: pointX, y: pointY },
            { width: tooltipWidth, height: tooltipHeight },
          );

          expect(position.x).toBeGreaterThanOrEqual(margin);
          expect(position.y).toBeGreaterThanOrEqual(margin);
          expect(position.x + tooltipWidth).toBeLessThanOrEqual(effectiveViewportWidth - margin);
          expect(position.y + tooltipHeight).toBeLessThanOrEqual(effectiveViewportHeight - margin);

          hover.destroy();
          manager.destroy();
        },
      ),
    );
  });
});
