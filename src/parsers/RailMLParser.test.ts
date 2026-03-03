import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { CoordinateSystemType } from '../coordinates';
import { GraphBuilder } from '../builder';
import { RailMLParser, RailMLSerializer } from './RailMLParser';

function loadFixture(name: string): string {
  return readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), 'utf8');
}

describe('RailMLParser and RailMLSerializer', () => {
  it('parses a valid railML document', () => {
    const result = new RailMLParser().parse(loadFixture('valid-screen-railml.xml'));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.nodes.size).toBe(3);
      expect(result.value.edges.size).toBe(1);
      expect(result.value.getEdge(result.value.edges.keys().next().value!)?.geometry.type).toBe('switch');
    }
  });

  it('returns line and column details for invalid XML syntax', () => {
    const result = new RailMLParser().parse(loadFixture('invalid-syntax-railml.xml'));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.context?.line).toBeDefined();
      expect(result.error.context?.column).toBeDefined();
    }
  });

  it('returns a missing-elements error when required sections are absent', () => {
    const result = new RailMLParser().parse(loadFixture('missing-elements-railml.xml'));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('Missing required elements');
    }
  });

  it('extracts geographic and linear coordinate systems', () => {
    const geographic = new RailMLParser().parse(loadFixture('valid-geographic-railml.xml'));
    const linear = new RailMLParser().parse(loadFixture('valid-linear-railml.xml'));

    expect(geographic.ok).toBe(true);
    expect(linear.ok).toBe(true);

    if (geographic.ok) {
      expect(geographic.value.coordinateSystem).toBe(CoordinateSystemType.Geographic);
    }

    if (linear.ok) {
      expect(linear.value.coordinateSystem).toBe(CoordinateSystemType.Linear);
    }
  });

  it('extracts switch and signal entities', () => {
    const result = new RailMLParser().parse(loadFixture('valid-screen-railml.xml'));

    expect(result.ok).toBe(true);
    if (result.ok) {
      const signal = Array.from(result.value.nodes.values()).find((node) => node.type === 'signal');
      const edge = Array.from(result.value.edges.values())[0];

      expect(signal).toBeDefined();
      expect(edge?.geometry.type).toBe('switch');
    }
  });

  it('extracts operational points and line definitions from the extended railML document', () => {
    const result = new RailMLParser().parse(loadFixture('valid-screen-railml-with-extensions.xml'));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.nodes.size).toBe(4);
      expect(result.value.lines.size).toBe(1);

      const operationalPoint = Array.from(result.value.nodes.values()).find((node) => node.id === 'op-1');
      const line = Array.from(result.value.lines.values()).find((entry) => entry.id === 'line-1');

      expect(operationalPoint?.type).toBe('station');
      expect(line?.edges).toEqual(['edge-ab']);
      expect(line?.color).toBe('#2563eb');
    }
  });

  it('round-trips parser-created graphs through railML serialization', () => {
    const parser = new RailMLParser();
    const serializer = new RailMLSerializer();
    const parsed = parser.parse(loadFixture('valid-screen-railml-with-extensions.xml'));

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      const firstPass = serializer.serialize(parsed.value);
      const reparsed = parser.parse(firstPass);

      expect(reparsed.ok).toBe(true);
      if (reparsed.ok) {
        const secondPass = serializer.serialize(reparsed.value);

        expect(secondPass).toBe(firstPass);
      }
    }
  });

  it('serializes graphs with screen, linear, and geographic coordinates into parseable railML', () => {
    const serializer = new RailMLSerializer();
    const parser = new RailMLParser();
    const screenGraph = new GraphBuilder()
      .addNode({
        id: 'screen-a',
        name: 'Screen A',
        type: 'station',
        coordinate: { type: CoordinateSystemType.Screen, x: 0, y: 0 },
      })
      .addNode({
        id: 'screen-signal',
        name: 'Signal',
        type: 'signal',
        coordinate: { type: CoordinateSystemType.Screen, x: 12, y: 0 },
      })
      .addNode({
        id: 'screen-b',
        name: 'Screen B',
        type: 'endpoint',
        coordinate: { type: CoordinateSystemType.Screen, x: 48, y: 0 },
      })
      .addEdge({
        id: 'screen-edge',
        source: 'screen-a',
        target: 'screen-b',
        length: 48,
        geometry: { type: 'switch', switchType: 'right_turnout', orientation: 30 },
      })
      .addLine({
        id: 'screen-line',
        name: 'Screen Line',
        edges: ['screen-edge'],
      })
      .build();
    const linearGraph = new GraphBuilder()
      .addNode({
        id: 'linear-a',
        name: 'Linear A',
        type: 'station',
        coordinate: { type: CoordinateSystemType.Linear, trackId: 'ELR-1', distance: 10.5 },
      })
      .addNode({
        id: 'linear-b',
        name: 'Linear B',
        type: 'endpoint',
        coordinate: { type: CoordinateSystemType.Linear, trackId: 'ELR-1', distance: 40.5 },
      })
      .addEdge({
        id: 'linear-edge',
        source: 'linear-a',
        target: 'linear-b',
        length: 30,
        geometry: { type: 'straight' },
      })
      .build();
    const geographicGraph = new GraphBuilder()
      .addNode({
        id: 'geo-a',
        name: 'Geo A',
        type: 'station',
        coordinate: { type: CoordinateSystemType.Geographic, latitude: 51.5, longitude: -0.12 },
      })
      .addNode({
        id: 'geo-b',
        name: 'Geo B',
        type: 'endpoint',
        coordinate: { type: CoordinateSystemType.Geographic, latitude: 51.51, longitude: -0.11 },
      })
      .addEdge({
        id: 'geo-edge',
        source: 'geo-a',
        target: 'geo-b',
        length: 10,
        geometry: { type: 'curve', curvature: 0.5 },
      })
      .build();

    for (const graph of [screenGraph, linearGraph, geographicGraph]) {
      const xml = serializer.serialize(graph);
      const result = parser.parse(xml);

      expect(xml).toContain('<railml');
      expect(result.ok).toBe(true);
    }
  });
});
