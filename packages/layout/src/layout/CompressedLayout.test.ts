import fc from 'fast-check';
import { CoordinateSystemType, GraphBuilder } from '@rail-schematic-viz/core';
import { describe, expect, it } from 'vitest';

import { CompressedLayout } from './CompressedLayout';

function graphForCompression() {
  return new GraphBuilder()
    .addNode({
      id: 'a',
      name: 'A',
      type: 'station',
      coordinate: { type: CoordinateSystemType.Screen, x: 0, y: 0 },
    })
    .addNode({
      id: 'b',
      name: 'B',
      type: 'endpoint',
      coordinate: { type: CoordinateSystemType.Screen, x: 100, y: 0 },
    })
    .addNode({
      id: 'c',
      name: 'C',
      type: 'endpoint',
      coordinate: { type: CoordinateSystemType.Screen, x: 400, y: 0 },
    })
    .addEdge({
      id: 'ab',
      source: 'a',
      target: 'b',
      length: 100,
      geometry: { type: 'straight' },
    })
    .addEdge({
      id: 'bc',
      source: 'b',
      target: 'c',
      length: 300,
      geometry: { type: 'straight' },
    })
    .build();
}

describe('CompressedLayout', () => {
  it('applies logarithmic compression with minimum separation', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 10, max: 100 }), async (compressionStrength) => {
        const layout = new CompressedLayout({
          compressionStrength,
          minSeparation: 24,
        });
        const positions = Array.from(
          (
            await layout.computePositions(graphForCompression(), {
              padding: 0,
              orientation: 'horizontal',
              overlapThreshold: 1,
            })
          ).values(),
        );
        const shortSegment = positions[1]!.x - positions[0]!.x;
        const longSegment = positions[2]!.x - positions[1]!.x;

        expect(shortSegment).toBeGreaterThanOrEqual(24);
        expect(longSegment).toBeGreaterThan(shortSegment);
        expect(longSegment).toBeLessThan(300);
      }),
    );
  });

  it('preserves ordering and delegates geometry generation', async () => {
    const layout = new CompressedLayout();
    const graph = graphForCompression();
    const positions = await layout.computePositions(graph, {
      padding: 0,
      orientation: 'horizontal',
      overlapThreshold: 1,
    });
    const values = Array.from(positions.values());

    expect(values[0]!.x).toBeLessThan(values[1]!.x);
    expect(values[1]!.x).toBeLessThan(values[2]!.x);
    expect(layout.computeGeometries(graph, positions).size).toBe(graph.edges.size);
  });
});
