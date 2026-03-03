import fc from 'fast-check';
import {
  CoordinateSystemType,
  GraphBuilder,
  type NodeId,
} from '@rail-schematic-viz/core';
import { describe, expect, it } from 'vitest';

import { MetroMapLayout } from './MetroMapLayout';

function buildMetroGraph(lengths: ReadonlyArray<number>) {
  const builder = new GraphBuilder();

  lengths.forEach((_, index) => {
    builder.addNode({
      id: `node-${index}`,
      name: `Node ${index}`,
      type: index === 0 ? 'station' : 'junction',
      coordinate: {
        type: CoordinateSystemType.Geographic,
        latitude: index % 2 === 0 ? index * 0.01 : index * 0.01 + 0.005,
        longitude: index * 0.01,
      },
    });
  });

  builder.addNode({
    id: `node-${lengths.length}`,
    name: `Node ${lengths.length}`,
    type: 'endpoint',
    coordinate: {
      type: CoordinateSystemType.Geographic,
      latitude: lengths.length * 0.01,
      longitude: lengths.length * 0.01,
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

function buildBranchingGraph() {
  return new GraphBuilder()
    .addNode({
      id: 'root',
      name: 'Root',
      type: 'station',
      coordinate: { type: CoordinateSystemType.Screen, x: 0, y: 0 },
    })
    .addNode({
      id: 'a',
      name: 'A',
      type: 'endpoint',
      coordinate: { type: CoordinateSystemType.Screen, x: 10, y: 15 },
    })
    .addNode({
      id: 'b',
      name: 'B',
      type: 'endpoint',
      coordinate: { type: CoordinateSystemType.Screen, x: 20, y: 5 },
    })
    .addNode({
      id: 'c',
      name: 'C',
      type: 'endpoint',
      coordinate: { type: CoordinateSystemType.Screen, x: -15, y: 25 },
    })
    .addEdge({
      id: 'edge-a',
      source: 'root',
      target: 'a',
      length: 10,
      geometry: { type: 'straight' },
    })
    .addEdge({
      id: 'edge-b',
      source: 'root',
      target: 'b',
      length: 10,
      geometry: { type: 'straight' },
    })
    .addEdge({
      id: 'edge-c',
      source: 'root',
      target: 'c',
      length: 10,
      geometry: { type: 'straight' },
    })
    .build();
}

function nearestOctilinearDelta(angleDegrees: number): number {
  const candidates = [0, 45, 90, 135, 180, 225, 270, 315];

  return Math.min(
    ...candidates.map((candidate) => {
      const direct = Math.abs(candidate - angleDegrees);

      return Math.min(direct, 360 - direct);
    }),
  );
}

function node(
  positions: ReadonlyMap<NodeId, { x: number; y: number }>,
  id: string,
) {
  return positions.get(id as NodeId)!;
}

describe('MetroMapLayout', () => {
  it('constrains edge angles to octilinear directions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 1, max: 120 }), { minLength: 2, maxLength: 5 }),
        async (lengths) => {
          const graph = buildMetroGraph(lengths);
          const layout = new MetroMapLayout({ gridSpacing: 20 });
          const positions = await layout.computePositions(graph, {
            padding: 10,
            orientation: 'auto',
            overlapThreshold: 1,
          });

          for (const edge of graph.edges.values()) {
            const source = positions.get(edge.source)!;
            const target = positions.get(edge.target)!;
            const angle = ((Math.atan2(target.y - source.y, target.x - source.x) * 180) / Math.PI + 360) % 360;

            expect(nearestOctilinearDelta(angle)).toBeLessThanOrEqual(1);
          }
        },
      ),
    );
  });

  it('avoids duplicate node positions after overlap resolution', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 16, max: 64 }), async (gridSpacing) => {
        const graph = buildBranchingGraph();
        const layout = new MetroMapLayout({
          gridSpacing,
          maxIterations: 4,
        });
        const positions = await layout.computePositions(graph, {
          padding: 0,
          orientation: 'auto',
          overlapThreshold: 1,
        });
        const keys = new Set(Array.from(positions.values(), (point) => `${point.x}:${point.y}`));

        expect(keys.size).toBe(positions.size);
      }),
    );
  });

  it('snaps all nodes to the configured grid', async () => {
    const gridSpacing = 24;
    const graph = buildMetroGraph([25, 80, 40]);
    const layout = new MetroMapLayout({ gridSpacing });
    const positions = await layout.computePositions(graph, {
      padding: 11,
      orientation: 'auto',
      overlapThreshold: 1,
    });

    for (const coordinate of positions.values()) {
      expect(coordinate.x % gridSpacing).toBe(0);
      expect(coordinate.y % gridSpacing).toBe(0);
    }
  });

  it('supports branching layouts with octilinear branches', async () => {
    const graph = buildBranchingGraph();
    const layout = new MetroMapLayout({ gridSpacing: 20, maxIterations: 5 });
    const positions = await layout.computePositions(graph, {
      padding: 0,
      orientation: 'auto',
      overlapThreshold: 1,
    });
    const root = node(positions, 'root');
    const a = node(positions, 'a');
    const b = node(positions, 'b');
    const c = node(positions, 'c');

    expect(a.x === root.x || a.y === root.y || Math.abs(a.x - root.x) === Math.abs(a.y - root.y)).toBe(true);
    expect(b.x === root.x || b.y === root.y || Math.abs(b.x - root.x) === Math.abs(b.y - root.y)).toBe(true);
    expect(c.x === root.x || c.y === root.y || Math.abs(c.x - root.x) === Math.abs(c.y - root.y)).toBe(true);
    expect(layout.computeGeometries(graph, positions).size).toBe(graph.edges.size);
  });

  it('records warnings when source geometry needs angle snapping', async () => {
    const graph = buildBranchingGraph();
    const layout = new MetroMapLayout({ gridSpacing: 20, angleSnapTolerance: 0.1 });

    await layout.computePositions(graph, {
      padding: 0,
      orientation: 'auto',
      overlapThreshold: 1,
    });

    expect(layout.warnings.length).toBeGreaterThan(0);
  });
});
