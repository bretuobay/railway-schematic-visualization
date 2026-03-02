import { describe, expect, it } from 'vitest';

import { CoordinateSystemType } from '../coordinates';
import { JSONParser } from './JSONParser';

type JsonDoc = {
  nodes: Array<Record<string, unknown>>;
  edges: Array<Record<string, unknown>>;
  lines: Array<Record<string, unknown>>;
};

function validDocument(): JsonDoc {
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
        type: 'endpoint',
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
    lines: [],
  };
}

function parseDocument(document: unknown) {
  return new JSONParser().parse(JSON.stringify(document));
}

describe('JSONParser validation branches', () => {
  it('rejects malformed top-level JSON input', () => {
    const parser = new JSONParser();

    expect(parser.parse('{bad json').ok).toBe(false);
    expect(parser.parse('[]').ok).toBe(false);
    expect(parseDocument({ edges: [], lines: [] }).ok).toBe(false);
    expect(parseDocument({ nodes: [], lines: [] }).ok).toBe(false);
    expect(parseDocument({ nodes: [], edges: [] }).ok).toBe(false);
  });

  it('validates node payload shapes and coordinate variants', () => {
    const cases: Array<{
      readonly mutate: (document: JsonDoc) => unknown;
      readonly fieldPath: string;
    }> = [
      {
        mutate: (document) => ({ ...document, nodes: [null] }),
        fieldPath: 'nodes[0]',
      },
      {
        mutate: (document) => ({
          ...document,
          nodes: [{ ...document.nodes[0], id: 42 }],
        }),
        fieldPath: 'nodes[0].id',
      },
      {
        mutate: (document) => ({
          ...document,
          nodes: [{ ...document.nodes[0], name: 42 }],
        }),
        fieldPath: 'nodes[0].name',
      },
      {
        mutate: (document) => ({
          ...document,
          nodes: [{ ...document.nodes[0], type: 'unknown' }],
        }),
        fieldPath: 'nodes[0].type',
      },
      {
        mutate: (document) => ({
          ...document,
          nodes: [{ ...document.nodes[0], coordinate: null }],
        }),
        fieldPath: 'nodes[0].coordinate',
      },
      {
        mutate: (document) => ({
          ...document,
          nodes: [
            {
              ...document.nodes[0],
              coordinate: { type: CoordinateSystemType.Screen, x: 'bad', y: 0 },
            },
          ],
        }),
        fieldPath: 'nodes[0].coordinate',
      },
      {
        mutate: (document) => ({
          ...document,
          nodes: [
            {
              ...document.nodes[0],
              coordinate: { type: CoordinateSystemType.Linear, distance: 10 },
            },
          ],
        }),
        fieldPath: 'nodes[0].coordinate',
      },
      {
        mutate: (document) => ({
          ...document,
          nodes: [
            {
              ...document.nodes[0],
              coordinate: {
                type: CoordinateSystemType.Linear,
                trackId: 'track-1',
                distance: 10,
                endDistance: 'bad',
              },
            },
          ],
        }),
        fieldPath: 'nodes[0].coordinate',
      },
      {
        mutate: (document) => ({
          ...document,
          nodes: [
            {
              ...document.nodes[0],
              coordinate: {
                type: CoordinateSystemType.Linear,
                trackId: 'track-1',
                distance: 10,
                direction: 'sideways',
              },
            },
          ],
        }),
        fieldPath: 'nodes[0].coordinate',
      },
      {
        mutate: (document) => ({
          ...document,
          nodes: [
            {
              ...document.nodes[0],
              coordinate: {
                type: CoordinateSystemType.Geographic,
                latitude: 'bad',
                longitude: 10,
              },
            },
          ],
        }),
        fieldPath: 'nodes[0].coordinate',
      },
      {
        mutate: (document) => ({
          ...document,
          nodes: [
            {
              ...document.nodes[0],
              coordinate: {
                type: 'unsupported',
              },
            },
          ],
        }),
        fieldPath: 'nodes[0].coordinate',
      },
      {
        mutate: (document) => ({
          ...document,
          nodes: [{ ...document.nodes[0], metadata: 42 }],
        }),
        fieldPath: 'nodes[0].metadata',
      },
    ];

    for (const testCase of cases) {
      const result = parseDocument(testCase.mutate(validDocument()));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.context?.fieldPath).toBe(testCase.fieldPath);
      }
    }
  });

  it('validates edge payload shapes and geometry branches', () => {
    const cases: Array<{
      readonly mutate: (document: JsonDoc) => unknown;
      readonly fieldPath: string;
    }> = [
      {
        mutate: (document) => ({ ...document, edges: [null] }),
        fieldPath: 'edges[0]',
      },
      {
        mutate: (document) => ({
          ...document,
          edges: [{ ...document.edges[0], id: 42 }],
        }),
        fieldPath: 'edges[0].id',
      },
      {
        mutate: (document) => ({
          ...document,
          edges: [{ ...document.edges[0], source: 42 }],
        }),
        fieldPath: 'edges[0].source',
      },
      {
        mutate: (document) => ({
          ...document,
          edges: [{ ...document.edges[0], target: 42 }],
        }),
        fieldPath: 'edges[0].target',
      },
      {
        mutate: (document) => ({
          ...document,
          edges: [{ ...document.edges[0], length: 'bad' }],
        }),
        fieldPath: 'edges[0].length',
      },
      {
        mutate: (document) => ({
          ...document,
          edges: [{ ...document.edges[0], geometry: null }],
        }),
        fieldPath: 'edges[0].geometry',
      },
      {
        mutate: (document) => ({
          ...document,
          edges: [
            {
              ...document.edges[0],
              geometry: { type: 'curve' },
            },
          ],
        }),
        fieldPath: 'edges[0].geometry',
      },
      {
        mutate: (document) => ({
          ...document,
          edges: [
            {
              ...document.edges[0],
              geometry: { type: 'switch', switchType: 'bad', orientation: 0 },
            },
          ],
        }),
        fieldPath: 'edges[0].geometry',
      },
      {
        mutate: (document) => ({
          ...document,
          edges: [
            {
              ...document.edges[0],
              geometry: { type: 'switch', switchType: 'left_turnout', orientation: 'bad' },
            },
          ],
        }),
        fieldPath: 'edges[0].geometry',
      },
      {
        mutate: (document) => ({
          ...document,
          edges: [
            {
              ...document.edges[0],
              geometry: { type: 'banana' },
            },
          ],
        }),
        fieldPath: 'edges[0].geometry',
      },
      {
        mutate: (document) => ({
          ...document,
          edges: [{ ...document.edges[0], metadata: 42 }],
        }),
        fieldPath: 'edges[0].metadata',
      },
    ];

    for (const testCase of cases) {
      const result = parseDocument(testCase.mutate(validDocument()));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.context?.fieldPath).toBe(testCase.fieldPath);
      }
    }
  });

  it('validates line payload shapes and graph integrity', () => {
    const cases: Array<{
      readonly mutate: (document: JsonDoc) => unknown;
      readonly fieldPath: string;
    }> = [
      {
        mutate: (document) => ({
          ...document,
          lines: [null],
        }),
        fieldPath: 'lines[0]',
      },
      {
        mutate: (document) => ({
          ...document,
          lines: [{ id: 42, name: 'Line', edges: [] }],
        }),
        fieldPath: 'lines[0].id',
      },
      {
        mutate: (document) => ({
          ...document,
          lines: [{ id: 'line-1', name: 42, edges: [] }],
        }),
        fieldPath: 'lines[0].name',
      },
      {
        mutate: (document) => ({
          ...document,
          lines: [{ id: 'line-1', name: 'Line', edges: [10] }],
        }),
        fieldPath: 'lines[0].edges',
      },
      {
        mutate: (document) => ({
          ...document,
          lines: [{ id: 'line-1', name: 'Line', edges: [], color: 42 }],
        }),
        fieldPath: 'lines[0].color',
      },
      {
        mutate: (document) => ({
          ...document,
          lines: [{ id: 'line-1', name: 'Line', edges: [], metadata: 42 }],
        }),
        fieldPath: 'lines[0].metadata',
      },
      {
        mutate: (document) => ({
          ...document,
          lines: [{ id: 'line-1', name: 'Line', edges: ['missing-edge'] }],
        }),
        fieldPath: 'Line line-1 references missing edge missing-edge.',
      },
      {
        mutate: (document) => ({
          ...document,
          edges: [
            {
              id: 'edge-bad',
              source: 'missing-source',
              target: 'node-b',
              length: 10,
              geometry: { type: 'straight' },
            },
          ],
        }),
        fieldPath: 'Edge edge-bad references missing source node missing-source.',
      },
    ];

    for (const testCase of cases) {
      const result = parseDocument(testCase.mutate(validDocument()));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.context?.fieldPath).toContain(testCase.fieldPath);
      }
    }
  });

  it('accepts optional metadata, line colors, and non-straight geometry variants', () => {
    const document = validDocument();
    document.nodes[0] = {
      ...(document.nodes[0] as Record<string, unknown>),
      metadata: { zone: 'west' },
      coordinate: {
        type: CoordinateSystemType.Linear,
        trackId: 'track-1',
        distance: 10,
        endDistance: 12,
        direction: 'up',
      },
    };
    document.nodes[1] = {
      ...(document.nodes[1] as Record<string, unknown>),
      coordinate: {
        type: CoordinateSystemType.Linear,
        trackId: 'track-1',
        distance: 100,
      },
    };
    document.edges[0] = {
      ...(document.edges[0] as Record<string, unknown>),
      geometry: {
        type: 'switch',
        switchType: 'single_crossover',
        orientation: 15,
      },
      metadata: { speed: 40 },
    };
    document.lines = [
      {
        id: 'line-1',
        name: 'Line 1',
        edges: ['edge-ab'],
        color: '#ff0000',
        metadata: { operational: true },
      },
    ];

    const result = parseDocument(document);

    expect(result.ok).toBe(true);
  });
});
