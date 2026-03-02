import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  asEdgeId,
  asLineId,
  asNodeId,
  CoordinateSystemType,
  type Coordinate,
  type EdgeId,
  type LineId,
  type NodeId,
} from '../coordinates/types';
import type { RailEdge } from './RailEdge';
import type { RailLine } from './RailLine';
import type { RailNode } from './RailNode';
import { RailGraph } from './RailGraph';

const nodeTypeArbitrary = fc.constantFrom<'station' | 'junction' | 'signal' | 'endpoint'>(
  'station',
  'junction',
  'signal',
  'endpoint',
);

function screenCoordinateArbitrary(): fc.Arbitrary<Coordinate> {
  return fc.record({
    type: fc.constant(CoordinateSystemType.Screen),
    x: fc.integer({ min: -10_000, max: 10_000 }),
    y: fc.integer({ min: -10_000, max: 10_000 }),
  });
}

function railNodeArbitrary(index: number): fc.Arbitrary<RailNode> {
  return fc.record({
    id: fc.constant(asNodeId(`node-${index}`)),
    name: fc.string({ minLength: 1, maxLength: 24 }),
    type: nodeTypeArbitrary,
    coordinate: screenCoordinateArbitrary(),
  });
}

function buildNodes(count: number): fc.Arbitrary<ReadonlyArray<RailNode>> {
  return fc.array(fc.integer(), { minLength: count, maxLength: count }).chain(() =>
    fc.tuple(...Array.from({ length: count }, (_, index) => railNodeArbitrary(index))),
  );
}

function edgeArbitrary(nodes: ReadonlyArray<RailNode>, index: number): fc.Arbitrary<RailEdge> {
  return fc
    .tuple(
      fc.integer({ min: 0, max: nodes.length - 1 }),
      fc.integer({ min: 0, max: nodes.length - 1 }),
      fc.integer({ min: 1, max: 50_000 }),
    )
    .map(([sourceIndex, targetIndex, length]) => ({
      id: asEdgeId(`edge-${index}`),
      source: nodes[sourceIndex]!.id,
      target: nodes[targetIndex]!.id,
      length,
      geometry: { type: 'straight' as const },
    }));
}

function lineFromEdges(edges: ReadonlyArray<RailEdge>): RailLine {
  return {
    id: asLineId('line-0'),
    name: 'Line 0',
    edges: edges.map((edge) => edge.id),
  };
}

function graphScenarioArbitrary(
  nodeCount: number,
  maxEdgeCount: number,
): fc.Arbitrary<{
  readonly nodes: ReadonlyArray<RailNode>;
  readonly edges: ReadonlyArray<RailEdge>;
  readonly line: RailLine;
}> {
  return buildNodes(nodeCount).chain((nodes) =>
    fc.integer({ min: 1, max: maxEdgeCount }).chain((edgeCount) =>
      fc
        .tuple(...Array.from({ length: edgeCount }, (_, index) => edgeArbitrary(nodes, index)))
        .map((edges) => ({
          nodes,
          edges: [...edges],
          line: lineFromEdges(edges),
        })),
    ),
  );
}

function missingNodeId(): NodeId {
  return asNodeId('missing-node');
}

function missingEdgeId(): EdgeId {
  return asEdgeId('missing-edge');
}

function missingLineId(): LineId {
  return asLineId('missing-line');
}

describe('RailGraph property tests', () => {
  it('returns nodes by identifier', () => {
    fc.assert(
      fc.property(buildNodes(3), (nodes) => {
        const graph = new RailGraph({ nodes, edges: [], lines: [] });

        for (const node of nodes) {
          expect(graph.getNode(node.id)).toEqual(node);
        }

        expect(graph.getNode(missingNodeId())).toBeUndefined();
      }),
    );
  });

  it('queries edges by source and target endpoints', () => {
    fc.assert(
      fc.property(graphScenarioArbitrary(4, 6), ({ nodes, edges, line }) => {
        const graph = new RailGraph({
          nodes,
          edges,
          lines: [line],
        });

        for (const node of nodes) {
          expect(graph.getEdgesFrom(node.id)).toEqual(
            edges.filter((edge) => edge.source === node.id),
          );
          expect(graph.getEdgesTo(node.id)).toEqual(
            edges.filter((edge) => edge.target === node.id),
          );
        }

        expect(graph.getEdge(missingEdgeId())).toBeUndefined();
        expect(graph.getLine(missingLineId())).toBeUndefined();
      }),
    );
  });

  it('traverses connected nodes from incoming and outgoing edges', () => {
    fc.assert(
      fc.property(graphScenarioArbitrary(4, 6), ({ nodes, edges, line }) => {
        const graph = new RailGraph({ nodes, edges, lines: [line] });

        for (const node of nodes) {
          const expectedIds = new Set<NodeId>();

          for (const edge of edges) {
            if (edge.source === node.id) {
              expectedIds.add(edge.target);
            }

            if (edge.target === node.id) {
              expectedIds.add(edge.source);
            }
          }

          const receivedIds = graph
            .getConnectedNodes(node.id)
            .map((candidate) => candidate.id)
            .sort();
          const expected = Array.from(expectedIds).sort();

          expect(receivedIds).toEqual(expected);
        }
      }),
    );
  });

  it('validates coordinate system consistency across nodes', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10_000 }), (distance) => {
        const nodes: RailNode[] = [
          {
            id: asNodeId('screen-node'),
            name: 'Screen Node',
            type: 'station',
            coordinate: {
              type: CoordinateSystemType.Screen,
              x: 10,
              y: 20,
            },
          },
          {
            id: asNodeId('linear-node'),
            name: 'Linear Node',
            type: 'signal',
            coordinate: {
              type: CoordinateSystemType.Linear,
              trackId: 'track-1',
              distance,
            },
          },
        ];

        const graph = new RailGraph({ nodes, edges: [], lines: [] });
        const validation = graph.validate();

        expect(validation.valid).toBe(false);
        expect(validation.errors).toContain('All nodes must use the same coordinate system.');
      }),
    );
  });
});
