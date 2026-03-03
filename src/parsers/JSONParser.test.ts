import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { CoordinateSystemType } from '../coordinates';
import { GraphBuilder } from '../builder';
import type { RailSchematicJsonDocument } from './schema';
import { JSONParser, JSONSerializer } from './JSONParser';

function makeJsonDocument(): RailSchematicJsonDocument {
  return {
    nodes: [
      {
        id: 'node-a',
        name: 'Node A',
        type: 'station',
        coordinate: {
          type: CoordinateSystemType.Screen,
          x: 0,
          y: 0,
        },
      },
      {
        id: 'node-b',
        name: 'Node B',
        type: 'station',
        coordinate: {
          type: CoordinateSystemType.Screen,
          x: 100,
          y: 0,
        },
      },
    ],
    edges: [
      {
        id: 'edge-ab',
        source: 'node-a',
        target: 'node-b',
        length: 100,
        geometry: {
          type: 'straight',
        },
      },
    ],
    lines: [
      {
        id: 'line-1',
        name: 'Line 1',
        edges: ['edge-ab'],
      },
    ],
  };
}

function graphFromBuilder() {
  return new GraphBuilder()
    .addNode({
      id: 'node-a',
      name: 'Node A',
      type: 'station',
      coordinate: { type: CoordinateSystemType.Screen, x: 0, y: 0 },
    })
    .addNode({
      id: 'node-b',
      name: 'Node B',
      type: 'junction',
      coordinate: { type: CoordinateSystemType.Screen, x: 50, y: 10 },
    })
    .addEdge({
      id: 'edge-ab',
      source: 'node-a',
      target: 'node-b',
      length: 75,
      geometry: { type: 'curve', curvature: 0.2 },
    })
    .addLine({
      id: 'line-1',
      name: 'Line 1',
      edges: ['edge-ab'],
    })
    .build();
}

describe('JSONParser and JSONSerializer', () => {
  it('preserves graph structure across JSON round-trips', () => {
    const parser = new JSONParser();
    const serializer = new JSONSerializer();

    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 500 }), { minLength: 1, maxLength: 5 }),
        (distances) => {
          const builder = new GraphBuilder();

          distances.forEach((distance, index) => {
            builder.addNode({
              id: `node-${index}`,
              name: `Node ${index}`,
              type: index === 0 ? 'station' : 'signal',
              coordinate: {
                type: CoordinateSystemType.Screen,
                x: index * 10,
                y: distance,
              },
            });
          });

          if (distances.length > 1) {
            for (let index = 0; index < distances.length - 1; index += 1) {
              builder.addEdge({
                id: `edge-${index}`,
                source: `node-${index}`,
                target: `node-${index + 1}`,
                length: Math.abs(distances[index]! - distances[index + 1]!) + 1,
                geometry: { type: 'straight' },
              });
            }

            builder.addLine({
              id: 'line-main',
              name: 'Line Main',
              edges: Array.from({ length: distances.length - 1 }, (_, index) => `edge-${index}`),
            });
          }

          const original = builder.build();
          const serialized = serializer.serialize(original);
          const reparsed = parser.parse(serialized);

          expect(reparsed.ok).toBe(true);

          if (reparsed.ok) {
            expect(reparsed.value.nodes.size).toBe(original.nodes.size);
            expect(reparsed.value.edges.size).toBe(original.edges.size);
            expect(reparsed.value.lines.size).toBe(original.lines.size);
            expect(Array.from(reparsed.value.nodes.keys())).toEqual(Array.from(original.nodes.keys()));
          }
        },
      ),
    );
  });

  it('parses a valid JSON document', () => {
    const result = new JSONParser().parse(JSON.stringify(makeJsonDocument()));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.nodes.size).toBe(2);
      expect(result.value.edges.size).toBe(1);
      expect(result.value.lines.size).toBe(1);
    }
  });

  it('returns a field path for invalid JSON documents', () => {
    const invalidDocument = {
      nodes: [
        {
          name: 'Missing id',
          type: 'station',
          coordinate: {
            type: CoordinateSystemType.Screen,
            x: 0,
            y: 0,
          },
        },
      ],
      edges: [],
      lines: [],
    };

    const result = new JSONParser().parse(JSON.stringify(invalidDocument));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.context?.fieldPath).toBe('nodes[0].id');
    }
  });

  it('serializes a simple graph into the JSON schema shape', () => {
    const serialized = new JSONSerializer().serialize(graphFromBuilder());
    const parsed = JSON.parse(serialized) as RailSchematicJsonDocument;

    expect(parsed.nodes).toHaveLength(2);
    expect(parsed.edges).toHaveLength(1);
    expect(parsed.lines).toHaveLength(1);
    expect(parsed.edges[0]?.geometry.type).toBe('curve');
  });

  it('round-trips a complex graph through parse and serialize', () => {
    const serializer = new JSONSerializer();
    const parser = new JSONParser();
    const original = graphFromBuilder();
    const firstPass = serializer.serialize(original);
    const parsed = parser.parse(firstPass);

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      const secondPass = serializer.serialize(parsed.value);
      expect(JSON.parse(secondPass)).toEqual(JSON.parse(firstPass));
    }
  });
});
