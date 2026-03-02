import fc from 'fast-check';
import {
  CoordinateSystemType,
  GraphBuilder,
  type RailGraph,
} from '@rail-schematic-viz/core';
import { describe, expect, it } from 'vitest';

import { AutoLayout } from './AutoLayout';

function buildUnpositionedGraph(nodeCount: number): RailGraph {
  const builder = new GraphBuilder();

  for (let index = 0; index < nodeCount; index += 1) {
    builder.addNode({
      id: `node-${index}`,
      name: `Node ${index}`,
      type: index === 0 ? 'station' : 'endpoint',
      coordinate: {
        type: CoordinateSystemType.Linear,
        trackId: 'main',
        distance: index * 10,
      },
    });
  }

  for (let index = 0; index < nodeCount - 1; index += 1) {
    builder.addEdge({
      id: `edge-${index}`,
      source: `node-${index}`,
      target: `node-${index + 1}`,
      length: 40 + index,
      geometry: { type: 'straight' },
    });
  }

  return builder.build();
}

describe('AutoLayout', () => {
  it('generates screen coordinates for graphs without screen positions', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 2, max: 8 }), async (nodeCount) => {
        const graph = buildUnpositionedGraph(nodeCount);
        const layout = new AutoLayout({ maxIterations: 20 });
        const positions = await layout.computePositions(graph, {
          padding: 10,
          orientation: 'auto',
          overlapThreshold: 1,
        });

        expect(positions.size).toBe(nodeCount);
        for (const coordinate of positions.values()) {
          expect(coordinate.type).toBe(CoordinateSystemType.Screen);
          expect(Number.isFinite(coordinate.x)).toBe(true);
          expect(Number.isFinite(coordinate.y)).toBe(true);
        }
      }),
    );
  });

  it('enforces the configured minimum node separation', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 3, max: 7 }), async (nodeCount) => {
        const minDistance = 30;
        const graph = buildUnpositionedGraph(nodeCount);
        const layout = new AutoLayout({
          maxIterations: 20,
          minDistance,
        });
        const positions = Array.from(
          (
            await layout.computePositions(graph, {
              padding: 10,
              orientation: 'auto',
              overlapThreshold: 1,
            })
          ).values(),
        );

        for (let leftIndex = 0; leftIndex < positions.length; leftIndex += 1) {
          for (let rightIndex = leftIndex + 1; rightIndex < positions.length; rightIndex += 1) {
            const left = positions[leftIndex]!;
            const right = positions[rightIndex]!;

            expect(Math.hypot(right.x - left.x, right.y - left.y)).toBeGreaterThanOrEqual(
              minDistance - 0.5,
            );
          }
        }
      }),
    );
  });

  it('keeps the network centered around the viewport target', async () => {
    const graph = buildUnpositionedGraph(5);
    const layout = new AutoLayout({ maxIterations: 30 });
    const positions = await layout.computePositions(graph, {
      padding: 12,
      orientation: 'auto',
      overlapThreshold: 1,
    });
    const values = Array.from(positions.values());
    const averageX = values.reduce((sum, point) => sum + point.x, 0) / values.length;
    const averageY = values.reduce((sum, point) => sum + point.y, 0) / values.length;

    expect(Math.abs(averageX - 48)).toBeLessThan(40);
    expect(Math.abs(averageY - 48)).toBeLessThan(40);
  });

  it('exports computed coordinates for reuse and builds geometries', async () => {
    const graph = buildUnpositionedGraph(4);
    const layout = new AutoLayout({ maxIterations: 15 });
    const positions = await layout.computePositions(graph, {
      padding: 10,
      orientation: 'auto',
      overlapThreshold: 1,
    });

    expect(layout.exportComputedCoordinates().size).toBe(positions.size);
    expect(layout.computeGeometries(graph, positions).size).toBe(graph.edges.size);
  });

  it('lays out a 500-node graph within the performance budget', async () => {
    const graph = buildUnpositionedGraph(500);
    const layout = new AutoLayout({ maxIterations: 10 });
    const start = Date.now();

    const positions = await layout.computePositions(graph, {
      padding: 10,
      orientation: 'auto',
      overlapThreshold: 1,
    });

    expect(positions.size).toBe(500);
    expect(Date.now() - start).toBeLessThan(5000);
  });
});
