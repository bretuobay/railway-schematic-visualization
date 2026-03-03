import fc from 'fast-check';
import {
  asNodeId,
  CoordinateSystemType,
  GraphBuilder,
} from '@rail-schematic-viz/core';
import { describe, expect, it } from 'vitest';

import { LayoutOptimizer } from './LayoutOptimizer';
import type { LayoutConfiguration } from './LayoutStrategy';

const BASE_CONFIGURATION: LayoutConfiguration = {
  padding: 24,
  orientation: 'auto',
  overlapThreshold: 8,
};

function simpleGraph() {
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
      coordinate: { type: CoordinateSystemType.Screen, x: 50, y: 0 },
    })
    .addEdge({
      id: 'ab',
      source: 'a',
      target: 'b',
      length: 50,
      geometry: { type: 'straight' },
    })
    .build();
}

function crossingGraph() {
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
      coordinate: { type: CoordinateSystemType.Screen, x: 100, y: 100 },
    })
    .addNode({
      id: 'c',
      name: 'C',
      type: 'endpoint',
      coordinate: { type: CoordinateSystemType.Screen, x: 0, y: 100 },
    })
    .addNode({
      id: 'd',
      name: 'D',
      type: 'endpoint',
      coordinate: { type: CoordinateSystemType.Screen, x: 100, y: 0 },
    })
    .addEdge({
      id: 'ab',
      source: 'a',
      target: 'b',
      length: 10,
      geometry: { type: 'straight' },
    })
    .addEdge({
      id: 'cd',
      source: 'c',
      target: 'd',
      length: 10,
      geometry: { type: 'straight' },
    })
    .build();
}

describe('LayoutOptimizer', () => {
  it('applies configured padding around layout bounds', () => {
    const optimizer = new LayoutOptimizer();

    fc.assert(
      fc.property(
        fc.integer({ min: 8, max: 40 }),
        fc.integer({ min: -500, max: -1 }),
        fc.integer({ min: -500, max: -1 }),
        (padding, x, y) => {
          const positions = new Map([
            [
              asNodeId('node-a'),
              { type: CoordinateSystemType.Screen, x, y } as const,
            ],
          ]);

          optimizer.applyPadding(positions, padding);

          const coordinate = positions.get(asNodeId('node-a'))!;

          expect(coordinate.x).toBeGreaterThanOrEqual(padding);
          expect(coordinate.y).toBeGreaterThanOrEqual(padding);
        },
      ),
    );
  });

  it('preserves manual position overrides', () => {
    const optimizer = new LayoutOptimizer();

    fc.assert(
      fc.property(
        fc.integer({ min: -200, max: 200 }),
        fc.integer({ min: -200, max: 200 }),
        (x, y) => {
          const positions = new Map([
            [
              asNodeId('node-a'),
              { type: CoordinateSystemType.Screen, x: 0, y: 0 } as const,
            ],
          ]);
          const overrides = new Map([
            [
              asNodeId('node-a'),
              { type: CoordinateSystemType.Screen, x, y } as const,
            ],
          ]);

          optimizer.applyManualOverrides(positions, {
            ...BASE_CONFIGURATION,
            manualOverrides: overrides,
          });

          expect(positions.get(asNodeId('node-a'))).toEqual({
            type: CoordinateSystemType.Screen,
            x,
            y,
          });
        },
      ),
    );
  });

  it('resolves label collisions by separating overlapping nodes', () => {
    const optimizer = new LayoutOptimizer();
    const positions = new Map([
      [
        asNodeId('node-a'),
        { type: CoordinateSystemType.Screen, x: 10, y: 10 } as const,
      ],
      [
        asNodeId('node-b'),
        { type: CoordinateSystemType.Screen, x: 10, y: 10 } as const,
      ],
    ]);

    optimizer.resolveLabelCollisions(positions, 20);

    const left = positions.get(asNodeId('node-a'))!;
    const right = positions.get(asNodeId('node-b'))!;

    expect(Math.hypot(right.x - left.x, right.y - left.y)).toBeGreaterThanOrEqual(20);
  });

  it('keeps locked nodes fixed when collisions cannot be resolved automatically', () => {
    const optimizer = new LayoutOptimizer();
    const positions = new Map([
      [
        asNodeId('node-a'),
        { type: CoordinateSystemType.Screen, x: 10, y: 10 } as const,
      ],
      [
        asNodeId('node-b'),
        { type: CoordinateSystemType.Screen, x: 10, y: 10 } as const,
      ],
    ]);
    const lockedNodes = new Set([asNodeId('node-a'), asNodeId('node-b')]);

    optimizer.resolveLabelCollisions(positions, 20, lockedNodes);

    expect(positions.get(asNodeId('node-a'))).toEqual({
      type: CoordinateSystemType.Screen,
      x: 10,
      y: 10,
    });
    expect(positions.get(asNodeId('node-b'))).toEqual({
      type: CoordinateSystemType.Screen,
      x: 10,
      y: 10,
    });
  });

  it('shifts a target node to reduce a simple edge crossing', () => {
    const optimizer = new LayoutOptimizer();
    const graph = crossingGraph();
    const positions = new Map([
      [asNodeId('a'), { type: CoordinateSystemType.Screen, x: 0, y: 0 } as const],
      [asNodeId('b'), { type: CoordinateSystemType.Screen, x: 100, y: 100 } as const],
      [asNodeId('c'), { type: CoordinateSystemType.Screen, x: 0, y: 100 } as const],
      [asNodeId('d'), { type: CoordinateSystemType.Screen, x: 100, y: 0 } as const],
    ]);

    optimizer.minimizeEdgeCrossings(graph, positions, 24);

    expect(positions.get(asNodeId('d'))!.y).toBeGreaterThan(0);
  });

  it('optimizes positions end-to-end with padding, overrides, and collision handling', () => {
    const optimizer = new LayoutOptimizer();
    const graph = simpleGraph();
    const optimized = optimizer.optimize(
      graph,
      new Map([
        [
          asNodeId('a'),
          { type: CoordinateSystemType.Screen, x: -20, y: -20 } as const,
        ],
        [
          asNodeId('b'),
          { type: CoordinateSystemType.Screen, x: -20, y: -20 } as const,
        ],
      ]),
      {
        ...BASE_CONFIGURATION,
        manualOverrides: new Map([
          [
            asNodeId('a'),
            { type: CoordinateSystemType.Screen, x: 4, y: 4 } as const,
          ],
        ]),
      },
    );

    const a = optimized.get(asNodeId('a'))!;
    const b = optimized.get(asNodeId('b'))!;

    expect(a.x).toBeGreaterThanOrEqual(BASE_CONFIGURATION.padding);
    expect(a.y).toBeGreaterThanOrEqual(BASE_CONFIGURATION.padding);
    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeGreaterThanOrEqual(
      BASE_CONFIGURATION.overlapThreshold,
    );
  });
});
