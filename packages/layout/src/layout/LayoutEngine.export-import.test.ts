import fc from 'fast-check';
import {
  asEdgeId,
  asNodeId,
  CoordinateSystemType,
  GraphBuilder,
  type RailGraph,
} from '@rail-schematic-viz/core';
import { describe, expect, it } from 'vitest';

import { LayoutEngine } from './LayoutEngine';
import type { LayoutData } from './LayoutStrategy';
import { ProportionalLayout } from './ProportionalLayout';

function makeGeographicGraph(edgeLengths: ReadonlyArray<number>): RailGraph {
  const builder = new GraphBuilder();

  edgeLengths.forEach((_, index) => {
    builder.addNode({
      id: `node-${index}`,
      name: `Node ${index}`,
      type: index === 0 ? 'station' : 'endpoint',
      coordinate: {
        type: CoordinateSystemType.Geographic,
        latitude: 5 + index * 0.001,
        longitude: 5 + index * 0.001,
      },
    });
  });

  builder.addNode({
    id: `node-${edgeLengths.length}`,
    name: `Node ${edgeLengths.length}`,
    type: 'endpoint',
    coordinate: {
      type: CoordinateSystemType.Geographic,
      latitude: 5 + edgeLengths.length * 0.001,
      longitude: 5 + edgeLengths.length * 0.001,
    },
  });

  edgeLengths.forEach((length, index) => {
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

function makeScreenGraph(): RailGraph {
  return new GraphBuilder()
    .addNode(screenNode('node-0', 10, 20, 'station'))
    .addNode(screenNode('node-1', 60, 20, 'station'))
    .addNode(screenNode('node-2', 110, 20, 'endpoint'))
    .addEdge({
      id: 'edge-0',
      source: 'node-0',
      target: 'node-1',
      length: 50,
      geometry: { type: 'straight' },
    })
    .addEdge({
      id: 'edge-1',
      source: 'node-1',
      target: 'node-2',
      length: 50,
      geometry: { type: 'straight' },
    })
    .build();
}

function screenNode(
  id: string,
  x: number,
  y: number,
  type: 'station' | 'endpoint',
): {
  id: string;
  name: string;
  type: 'station' | 'endpoint';
  coordinate: {
    type: CoordinateSystemType.Screen;
    x: number;
    y: number;
  };
} {
  return {
    id,
    name: id,
    type,
    coordinate: {
      type: CoordinateSystemType.Screen,
      x,
      y,
    },
  };
}

function expectRoundTripPreserved(
  graph: RailGraph,
  engine: LayoutEngine,
  data: LayoutData,
): void {
  const imported = engine.importLayout(graph, data);

  for (const [nodeId, node] of imported.nodes) {
    expect(node.coordinate).toEqual({
      type: CoordinateSystemType.Screen,
      ...data.nodePositions[nodeId],
    });
  }

  for (const [edgeId, geometry] of imported.edgeGeometries) {
    expect(geometry).toEqual(
      data.edgeGeometries[edgeId]!.map((point) => ({
        type: CoordinateSystemType.Screen,
        x: point.x,
        y: point.y,
      })),
    );
  }
}

describe('LayoutEngine export and import', () => {
  it('exports complete layout data for computed layouts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 5 }),
        async (edgeLengths) => {
          const graph = makeGeographicGraph(edgeLengths);
          const engine = new LayoutEngine(new ProportionalLayout({ scaleFactor: 2 }));

          await engine.layout(graph);
          const exported = engine.exportLayout();

          expect(exported.mode).toBe('proportional');
          expect(Object.keys(exported.nodePositions)).toHaveLength(graph.nodes.size);
          expect(Object.keys(exported.edgeGeometries)).toHaveLength(graph.edges.size);
          expect(Number.isNaN(Date.parse(exported.timestamp))).toBe(false);
        },
      ),
    );
  });

  it('rejects imports with no matching node ids', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 12 }), (suffix) => {
        const graph = makeScreenGraph();
        const engine = new LayoutEngine(new ProportionalLayout());

        expect(() =>
          engine.importLayout(graph, {
            mode: 'manual',
            nodePositions: {
              [`missing-${suffix}`]: { x: 999, y: 999 },
            },
            edgeGeometries: {},
            timestamp: new Date().toISOString(),
          }),
        ).toThrow('matching node IDs');
      }),
    );
  });

  it('supports partial imports by applying only matching node positions', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -200, max: 200 }),
        fc.integer({ min: -200, max: 200 }),
        (x, y) => {
          const graph = makeScreenGraph();
          const engine = new LayoutEngine(new ProportionalLayout());
          const imported = engine.importLayout(graph, {
            mode: 'manual',
            nodePositions: {
              'node-1': { x, y },
              'missing-node': { x: 999, y: 999 },
            },
            edgeGeometries: {},
            timestamp: new Date().toISOString(),
          });

          expect(imported.nodes.get(asNodeId('node-1'))!.coordinate).toEqual({
            type: CoordinateSystemType.Screen,
            x,
            y,
          });
          expect(imported.nodes.get(asNodeId('node-0'))!.coordinate).toEqual({
            type: CoordinateSystemType.Screen,
            x: 10,
            y: 20,
          });
          expect(imported.nodes.get(asNodeId('node-2'))!.coordinate).toEqual({
            type: CoordinateSystemType.Screen,
            x: 110,
            y: 20,
          });
        },
      ),
    );
  });

  it('preserves positions and geometries across export-import round trips', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 4 }),
        async (edgeLengths) => {
          const graph = makeGeographicGraph(edgeLengths);
          const engine = new LayoutEngine(new ProportionalLayout({ scaleFactor: 3 }));

          await engine.layout(graph);
          const exported = engine.exportLayout();

          expectRoundTripPreserved(graph, engine, exported);
        },
      ),
    );
  });

  it('exports all required fields', async () => {
    const graph = makeGeographicGraph([20, 40]);
    const engine = new LayoutEngine(new ProportionalLayout());

    await engine.layout(graph);
    const exported = engine.exportLayout();

    expect(exported).toMatchObject({
      mode: 'proportional',
      nodePositions: expect.any(Object),
      edgeGeometries: expect.any(Object),
      timestamp: expect.any(String),
    });
    expect(exported.nodePositions['node-0']).toBeDefined();
    expect(exported.edgeGeometries['edge-0']).toBeDefined();
  });

  it('imports layouts with matching node ids', () => {
    const graph = makeScreenGraph();
    const engine = new LayoutEngine(new ProportionalLayout());
    const imported = engine.importLayout(graph, {
      mode: 'manual',
      nodePositions: {
        'node-0': { x: 200, y: 300 },
        'node-1': { x: 260, y: 300 },
        'node-2': { x: 320, y: 300 },
      },
      edgeGeometries: {
        'edge-0': [
          { x: 200, y: 300 },
          { x: 260, y: 300 },
        ],
      },
      timestamp: new Date().toISOString(),
    });

    expect(imported.layoutMode).toBe('manual');
    expect(imported.nodes.get(asNodeId('node-0'))!.coordinate).toEqual({
      type: CoordinateSystemType.Screen,
      x: 200,
      y: 300,
    });
    expect(imported.edgeGeometries.get(asEdgeId('edge-0'))).toEqual([
      { type: CoordinateSystemType.Screen, x: 200, y: 300 },
      { type: CoordinateSystemType.Screen, x: 260, y: 300 },
    ]);
  });

  it('rejects mismatched imports', () => {
    const graph = makeScreenGraph();
    const engine = new LayoutEngine(new ProportionalLayout());

    expect(() =>
      engine.importLayout(graph, {
        mode: 'manual',
        nodePositions: {
          stranger: { x: 1, y: 2 },
        },
        edgeGeometries: {},
        timestamp: new Date().toISOString(),
      }),
    ).toThrow('matching node IDs');
  });

  it('imports partial layouts without overwriting unmatched nodes', () => {
    const graph = makeScreenGraph();
    const engine = new LayoutEngine(new ProportionalLayout());
    const imported = engine.importLayout(graph, {
      mode: 'manual',
      nodePositions: {
        'node-1': { x: 150, y: 150 },
      },
      edgeGeometries: {},
      timestamp: new Date().toISOString(),
    });

    expect(imported.nodes.get(asNodeId('node-0'))!.coordinate).toEqual({
      type: CoordinateSystemType.Screen,
      x: 10,
      y: 20,
    });
    expect(imported.nodes.get(asNodeId('node-1'))!.coordinate).toEqual({
      type: CoordinateSystemType.Screen,
      x: 150,
      y: 150,
    });
  });

  it('preserves node positions and geometries during deterministic round trips', async () => {
    const graph = makeGeographicGraph([15, 30]);
    const engine = new LayoutEngine(new ProportionalLayout({ scaleFactor: 2 }));

    await engine.layout(graph);
    const exported = engine.exportLayout();

    expectRoundTripPreserved(graph, engine, exported);
  });
});
