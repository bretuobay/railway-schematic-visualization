import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { LegendRenderer } from './LegendRenderer';

describe('LegendRenderer properties', () => {
  it('renders only legends marked visible', () => {
    fc.assert(
      fc.property(fc.boolean(), (visible) => {
        const renderer = new LegendRenderer();
        const nodes = renderer.render([
          {
            id: 'one',
            title: 'One',
            type: 'categorical',
            visible,
            items: [{ label: 'A', color: '#111111' }],
          },
          {
            id: 'two',
            title: 'Two',
            type: 'categorical',
            visible: true,
            items: [{ label: 'B', color: '#222222' }],
          },
        ]);

        expect(nodes.some((node) => node.id === 'two-title')).toBe(true);
        expect(nodes.some((node) => node.id === 'one-title')).toBe(visible);
      }),
    );
  });
});
