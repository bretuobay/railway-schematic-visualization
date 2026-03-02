import { describe, expect, it } from 'vitest';

import { ColorPalette, contrastRatio } from './ColorPalette';

describe('ColorPalette accessibility helpers', () => {
  it('identifies color-blind safe palettes', () => {
    expect(ColorPalette.isColorBlindSafe('ColorBlindSafe')).toBe(true);
    expect(ColorPalette.isColorBlindSafe('Blues')).toBe(false);
  });

  it('identifies high contrast palettes', () => {
    expect(ColorPalette.isHighContrast('HighContrast')).toBe(true);
    expect(ColorPalette.isHighContrast('Blues')).toBe(false);
  });

  it('measures contrast ratios above WCAG AAA thresholds for the high-contrast palette', () => {
    const palette = ColorPalette.HighContrast;

    expect(contrastRatio(palette[0]!, palette[1]!)).toBeGreaterThanOrEqual(7);
  });
});
