import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { CoordinateSystemType } from '../coordinates';
import { BuildError } from '../errors';
import { RailGraph } from '../model';
import { GraphBuilder } from './index';

function makeBuilder(): GraphBuilder {
  return new GraphBuilder()
    .addNode({
      id: 'node-a',
      name: 'Node A',
      type: 'station',
      coordinate: {
        type: CoordinateSystemType.Screen,
        x: 0,
        y: 0,
      },
    })
    .addNode({
      id: 'node-b',
      name: 'Node B',
      type: 'junction',
      coordinate: {
        type: CoordinateSystemType.Screen,
        x: 100,
        y: 0,
      },
    })
    .addNode({
      id: 'node-c',
      name: 'Node C',
      type: 'signal',
      coordinate: {
        type: CoordinateSystemType.Screen,
        x: 200,
        y: 0,
      },
    });
}

describe('GraphBuilder', () => {
  it('rejects edges that reference missing nodes', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 20 }), (missingId) => {
        const builder = new GraphBuilder();

        expect(() =>
          builder.addEdge({
            id: 'edge-1',
            source: missingId,
            target: 'target-node',
            length: 100,
            geometry: { type: 'straight' },
          }),
        ).toThrowError(BuildError);
      }),
    );
  });

  it('rejects lines that reference missing edges', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 20 }), (missingId) => {
        const builder = new GraphBuilder();

        expect(() =>
          builder.addLine({
            id: 'line-1',
            name: 'Line 1',
            edges: [missingId],
          }),
        ).toThrowError(BuildError);
      }),
    );
  });

  it('builds a simple three-node graph', () => {
    const graph = makeBuilder()
      .addEdge({
        id: 'edge-ab',
        source: 'node-a',
        target: 'node-b',
        length: 100,
        geometry: { type: 'straight' },
      })
      .addEdge({
        id: 'edge-bc',
        source: 'node-b',
        target: 'node-c',
        length: 100,
        geometry: { type: 'straight' },
      })
      .addLine({
        id: 'line-1',
        name: 'Line 1',
        edges: ['edge-ab', 'edge-bc'],
      })
      .build();

    expect(graph).toBeInstanceOf(RailGraph);
    expect(graph.nodes.size).toBe(3);
    expect(graph.edges.size).toBe(2);
    expect(graph.lines.size).toBe(1);
  });

  it('supports chained calls', () => {
    const builder = new GraphBuilder();
    const result = builder
      .addNode({
        id: 'chain-node',
        name: 'Chain Node',
        type: 'endpoint',
        coordinate: {
          type: CoordinateSystemType.Screen,
          x: 10,
          y: 10,
        },
      })
      .addNode({
        id: 'chain-node-2',
        name: 'Chain Node 2',
        type: 'endpoint',
        coordinate: {
          type: CoordinateSystemType.Screen,
          x: 20,
          y: 20,
        },
      })
      .addEdge({
        id: 'chain-edge',
        source: 'chain-node',
        target: 'chain-node-2',
        length: 10,
        geometry: { type: 'straight' },
      });

    expect(result).toBe(builder);
  });

  it('throws a BuildError for invalid node references', () => {
    expect(() =>
      new GraphBuilder().addEdge({
        id: 'invalid-edge',
        source: 'missing-source',
        target: 'missing-target',
        length: 100,
        geometry: { type: 'straight' },
      }),
    ).toThrowError(BuildError);
  });

  it('throws a BuildError for invalid edge references', () => {
    expect(() =>
      new GraphBuilder().addLine({
        id: 'invalid-line',
        name: 'Invalid Line',
        edges: ['missing-edge'],
      }),
    ).toThrowError(BuildError);
  });

  it('builds an empty graph', () => {
    const graph = new GraphBuilder().build();

    expect(graph).toBeInstanceOf(RailGraph);
    expect(graph.nodes.size).toBe(0);
    expect(graph.edges.size).toBe(0);
    expect(graph.lines.size).toBe(0);
  });
});
