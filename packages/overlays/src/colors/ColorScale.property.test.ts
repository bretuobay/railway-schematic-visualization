import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { ColorScale } from './ColorScale';

describe('ColorScale', () => {
  it('registers custom scales by name', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc
          .array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'), {
            minLength: 6,
            maxLength: 6,
          })
          .map((parts) => parts.join('')),
        (name, color) => {
          const normalizedName = name.trim();
          const expected = `#${color}`;

          fc.pre(normalizedName.length > 0);
          ColorScale.register(normalizedName, () => expected);

          expect(ColorScale.get(normalizedName)?.(0.5)).toBe(expected);
        },
      ),
    );
  });
});
