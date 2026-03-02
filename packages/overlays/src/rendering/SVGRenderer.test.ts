import { describe, expect, it } from 'vitest';

import { SVGRenderer } from './SVGRenderer';
import type { SvgRenderNode } from './types';

describe('SVGRenderer', () => {
  it('creates nodes for every geometry type', () => {
    const nodes: SvgRenderNode[][] = [];
    const renderer = new SVGRenderer();
    const result = renderer.render(
      {
        setNodes: (nextNodes) => {
          nodes.push([...nextNodes]);
        },
      },
      [
        {
          id: 'point',
          geometry: { type: 'point', x: 10, y: 20, label: 'A' },
          style: { fill: '#111111' },
          zIndex: 1,
        },
        {
          id: 'line',
          geometry: { type: 'line', points: [[0, 0], [10, 10]] },
          zIndex: 2,
        },
        {
          id: 'polygon',
          geometry: { type: 'polygon', points: [[0, 0], [10, 0], [10, 10]] },
          zIndex: 3,
        },
        {
          id: 'path',
          geometry: {
            type: 'path',
            commands: [{ command: 'M', values: [0, 0] }, { command: 'L', values: [10, 10] }],
          },
          zIndex: 4,
        },
      ],
    );

    expect(result.map((node) => node.tag)).toEqual([
      'circle',
      'text',
      'polyline',
      'polygon',
      'path',
    ]);
    expect(nodes[0]).toHaveLength(5);
  });

  it('applies style attributes to generated nodes', () => {
    const renderer = new SVGRenderer();
    const [node] = renderer.render(
      {},
      [
        {
          id: 'point',
          geometry: { type: 'point', x: 10, y: 20, radius: 5 },
          style: {
            fill: '#123456',
            stroke: '#abcdef',
            strokeWidth: 2,
            opacity: 0.5,
            dashArray: [4, 2],
          },
        },
      ],
    );

    expect(node?.attributes).toMatchObject({
      fill: '#123456',
      stroke: '#abcdef',
      'stroke-width': '2',
      opacity: '0.5',
      'stroke-dasharray': '4 2',
    });
  });
});
