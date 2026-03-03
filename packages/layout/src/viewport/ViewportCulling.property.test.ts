import fc from 'fast-check';
import {
  CoordinateSystemType,
  GraphBuilder,
  asNodeId,
} from '@rail-schematic-viz/core';
import { describe, expect, it } from 'vitest';

import { buildPositionedGraph } from '../layout';

import { ViewportCulling } from './ViewportCulling';

function makeNodeOnlyGraph(nodeCount: number, spacing = 10) {
  const builder = new GraphBuilder();
  const positions = new Map();

  for (let index = 0; index < nodeCount; index += 1) {
    const x = index * spacing;

    builder.addNode({
      id: `node-${index}`,
      name: `Node ${index}`,
      type: index === nodeCount - 1 ? 'endpoint' : 'station',
      coordinate: { type: CoordinateSystemType.Screen, x, y: 0 },
    });
    positions.set(
      asNodeId(`node-${index}`),
      { type: CoordinateSystemType.Screen, x, y: 0 } as const,
    );
  }

  return buildPositionedGraph(builder.build(), positions, new Map(), 'manual');
}

describe('ViewportCulling properties', () => {
  it('activates only when element count exceeds the configured threshold', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 120 }),
        (threshold, delta) => {
          const belowOrEqual = makeNodeOnlyGraph(threshold);
          const above = makeNodeOnlyGraph(threshold + delta);
          const belowCulling = new ViewportCulling({ activationThreshold: threshold });
          const aboveCulling = new ViewportCulling({ activationThreshold: threshold });

          belowCulling.buildIndex(belowOrEqual);
          aboveCulling.buildIndex(above);

          expect(
            belowCulling.queryVisible({
              minX: -10,
              minY: -10,
              maxX: 2000,
              maxY: 10,
            }).enabled,
          ).toBe(false);
          expect(
            aboveCulling.queryVisible({
              minX: -10,
              minY: -10,
              maxX: 5000,
              maxY: 10,
            }).enabled,
          ).toBe(true);
        },
      ),
    );
  });

  it('returns exactly the nodes intersecting the viewport when culling is enabled', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 6, max: 30 }),
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        (nodeCount, startIndex, widthInNodes) => {
          const graph = makeNodeOnlyGraph(nodeCount, 10);
          const culling = new ViewportCulling({
            activationThreshold: 1,
            bufferMargin: 0,
          });
          const clampedStart = Math.min(startIndex, nodeCount - 1);
          const clampedEnd = Math.min(nodeCount - 1, clampedStart + widthInNodes - 1);

          culling.buildIndex(graph);

          const result = culling.queryVisible({
            minX: clampedStart * 10,
            minY: -1,
            maxX: clampedEnd * 10,
            maxY: 1,
          });

          const expected = new Set(
            Array.from(
              { length: clampedEnd - clampedStart + 1 },
              (_, index) => asNodeId(`node-${clampedStart + index}`),
            ),
          );

          expect(result.nodes).toEqual(expected);
        },
      ),
    );
  });

  it('extends visibility queries by the configured buffer margin', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 1, max: 50 }),
        (bufferMargin, outsideDistance) => {
          const graph = makeNodeOnlyGraph(5, 50);
          const culling = new ViewportCulling({
            activationThreshold: 1,
            bufferMargin,
          });
          const targetX = 100;
          const nearOutsideX = targetX - Math.max(1, Math.min(bufferMargin, outsideDistance));

          culling.buildIndex(graph);

          const result = culling.queryVisible({
            minX: nearOutsideX,
            minY: -1,
            maxX: nearOutsideX,
            maxY: 1,
          });

          expect(result.nodes.has(asNodeId('node-2'))).toBe(true);
        },
      ),
    );
  });
});
