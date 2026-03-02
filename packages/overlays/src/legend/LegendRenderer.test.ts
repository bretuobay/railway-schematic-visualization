import { describe, expect, it } from 'vitest';

import { LegendRenderer } from './LegendRenderer';

describe('LegendRenderer', () => {
  it('renders continuous, discrete, and categorical legends', () => {
    const renderer = new LegendRenderer();
    const nodes = renderer.render([
      {
        id: 'continuous',
        title: 'Continuous',
        type: 'continuous',
        min: 0,
        max: 10,
        startColor: '#000000',
        endColor: '#ffffff',
      },
      {
        id: 'discrete',
        title: 'Discrete',
        type: 'discrete',
        items: [{ label: 'Low', color: '#111111' }],
      },
      {
        id: 'categorical',
        title: 'Categorical',
        type: 'categorical',
        items: [{ label: 'Line', color: '#222222', shape: 'line' }],
      },
    ]);

    expect(nodes.some((node) => node.id === 'continuous-bar')).toBe(true);
    expect(nodes.some((node) => node.id === 'discrete-swatch-0')).toBe(true);
    expect(nodes.some((node) => node.id === 'categorical-symbol-0')).toBe(true);
  });

  it('supports corner positioning and collapsible state', () => {
    const renderer = new LegendRenderer();
    let nodes = renderer.render(
      [
        {
          id: 'legend',
          title: 'Legend',
          type: 'categorical',
          items: [{ label: 'A', color: '#111111' }],
        },
      ],
      {
        position: 'bottom-left',
        collapsible: true,
      },
    );

    expect(nodes.find((node) => node.id === 'legend-toggle')).toBeDefined();
    expect(Number(nodes[0]?.attributes.y)).toBeGreaterThan(0);

    renderer.toggleCollapse();
    nodes = renderer.update(
      [
        {
          id: 'legend',
          title: 'Legend',
          type: 'categorical',
          items: [{ label: 'A', color: '#111111' }],
        },
      ],
      {
        collapsible: true,
      },
    );

    expect(nodes.some((node) => node.id === 'legend-title')).toBe(false);
  });

  it('clears rendered state', () => {
    const renderer = new LegendRenderer();

    renderer.render([]);
    renderer.clear();

    expect(renderer.getNodes()).toHaveLength(0);
  });
});
