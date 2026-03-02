import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { ColorPalette } from './ColorPalette';

describe('ColorPalette', () => {
  it('registers custom palettes', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (name) => {
        const normalizedName = name.trim();
        const palette = ['#111111', '#222222', '#333333'];

        fc.pre(normalizedName.length > 0);
        ColorPalette.register(normalizedName, palette);

        expect(ColorPalette.getPalette(normalizedName)).toEqual(palette);
      }),
    );
  });
});
