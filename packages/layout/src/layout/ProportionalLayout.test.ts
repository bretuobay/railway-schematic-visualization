import fc from 'fast-check';
import { CoordinateSystemType, GraphBuilder } from '@rail-schematic-viz/core';
import { describe, expect, it } from 'vitest';

import { ProportionalLayout } from './ProportionalLayout';

function makeGraph(lengths: ReadonlyArray<number>) {
  const builder = new GraphBuilder();

  lengths.forEach((_, index) => {
    builder.addNode({
      id: `node-${index}`,
      name: `Node ${index}`,
      type: index === 0 ? 'station' : 'endpoint',
      coordinate: {
        type: CoordinateSystemType.Geographic,
        latitude: 0,
        longitude: index,
      },
    });
  });

  builder.addNode({
    id: `node-${lengths.length}`,
    name: `Node ${lengths.length}`,
    type: 'endpoint',
    coordinate: {
      type: CoordinateSystemType.Geographic,
      latitude: 0,
      longitude: lengths.length,
    },
  });

  lengths.forEach((length, index) => {
    builder.addEdge({
      id: `edge-${index}`,
      source: `node-${index}`,
      target: `node-${index + 1}`,
      length,
      geometry: { type: 'straight' },
    });
  });

  return builder.build();
}

describe('ProportionalLayout', () => {
  it('maintains a consistent screen-to-real ratio', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 2, maxLength: 5 }),
        async (lengths) => {
          const scaleFactor = 3;
          const layout = new ProportionalLayout({ scaleFactor });
          const positions = await layout.computePositions(makeGraph(lengths), {
            padding: 0,
            orientation: 'horizontal',
            overlapThreshold: 1,
          });

          const values = Array.from(positions.values());

          for (let index = 1; index < values.length; index += 1) {
            const distance = values[index]!.x - values[index - 1]!.x;
            expect(distance / lengths[index - 1]!).toBeCloseTo(scaleFactor, 6);
          }
        },
      ),
    );
  });

  it('applies scale factors, orientation, and length fallback warnings', async () => {
    const graph = new GraphBuilder()
      .addNode({
        id: 'a',
        name: 'A',
        type: 'station',
        coordinate: {
          type: CoordinateSystemType.Linear,
          trackId: 'main',
          distance: 0,
        },
      })
      .addNode({
        id: 'b',
        name: 'B',
        type: 'endpoint',
        coordinate: {
          type: CoordinateSystemType.Linear,
          trackId: 'main',
          distance: 10,
        },
      })
      .addNode({
        id: 'c',
        name: 'C',
        type: 'endpoint',
        coordinate: {
          type: CoordinateSystemType.Linear,
          trackId: 'main',
          distance: 20,
        },
      })
      .addEdge({
        id: 'ab',
        source: 'a',
        target: 'b',
        length: 0,
        geometry: { type: 'straight' },
      })
      .addEdge({
        id: 'bc',
        source: 'b',
        target: 'c',
        length: 10,
        geometry: { type: 'straight' },
      })
      .build();
    const layout = new ProportionalLayout({ scaleFactor: 2 });
    const vertical = await layout.computePositions(graph, {
      padding: 10,
      orientation: 'vertical',
      overlapThreshold: 1,
    });

    expect(Array.from(vertical.values())[1]!.y).toBeGreaterThan(Array.from(vertical.values())[0]!.y);
    expect(layout.warnings).toHaveLength(1);
    expect(layout.computeGeometries(graph, vertical).size).toBe(graph.edges.size);
  });
});
