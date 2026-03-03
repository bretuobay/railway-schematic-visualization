import fc from 'fast-check';
import { asNodeId, CoordinateSystemType, GraphBuilder } from '@rail-schematic-viz/core';
import { describe, expect, it } from 'vitest';

import { FixedSegmentLayout } from './FixedSegmentLayout';

function graphForFixedSegments() {
  return new GraphBuilder()
    .addNode({
      id: 'a',
      name: 'A',
      type: 'station',
      coordinate: { type: CoordinateSystemType.Linear, trackId: 'main', distance: 0 },
    })
    .addNode({
      id: 'b',
      name: 'B',
      type: 'junction',
      coordinate: { type: CoordinateSystemType.Linear, trackId: 'main', distance: 100 },
    })
    .addNode({
      id: 'c',
      name: 'C',
      type: 'endpoint',
      coordinate: { type: CoordinateSystemType.Linear, trackId: 'main', distance: 200 },
    })
    .addNode({
      id: 'd',
      name: 'D',
      type: 'endpoint',
      coordinate: { type: CoordinateSystemType.Linear, trackId: 'main', distance: 300 },
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
      length: 200,
      geometry: { type: 'straight' },
    })
    .addEdge({
      id: 'bd',
      source: 'b',
      target: 'd',
      length: 300,
      geometry: { type: 'straight' },
    })
    .build();
}

describe('FixedSegmentLayout', () => {
  it('renders equal-length segments within tolerance', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 20, max: 120 }), async (segmentLength) => {
        const layout = new FixedSegmentLayout({ segmentLength });
        const positions = await layout.computePositions(graphForFixedSegments(), {
          padding: 0,
          orientation: 'horizontal',
          overlapThreshold: 1,
        });
        const graph = graphForFixedSegments();
        const lengths = Array.from(graph.edges.values(), (edge) => {
          const source = positions.get(edge.source)!;
          const target = positions.get(edge.target)!;

          return Math.hypot(target.x - source.x, target.y - source.y);
        });

        expect(lengths[0]).toBeCloseTo(segmentLength, 6);
        expect(lengths[1]).toBeCloseTo(segmentLength, 6);
      }),
    );
  });

  it('applies even distribution and parallel spacing', async () => {
    const layout = new FixedSegmentLayout({ segmentLength: 50, parallelSpacing: 20 });
    const positions = await layout.computePositions(graphForFixedSegments(), {
      padding: 10,
      orientation: 'horizontal',
      overlapThreshold: 1,
    });

    expect(positions.get(asNodeId('b'))!.x - positions.get(asNodeId('a'))!.x).toBeCloseTo(50, 6);
    expect(positions.get(asNodeId('d'))!.y - positions.get(asNodeId('b'))!.y).toBeCloseTo(20, 6);
  });
});
