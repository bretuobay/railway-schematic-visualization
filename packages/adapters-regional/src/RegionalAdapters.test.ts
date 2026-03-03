import { CoordinateSystemType } from '@rail-schematic-viz/core';

import {
  CSVAdapter,
  ELRAdapter,
  GeoJSONAdapter,
  RINFAdapter,
} from './index';

describe('regional adapters', () => {
  it('parses CSV rows with custom delimiter and numeric column mappings', () => {
    const adapter = new CSVAdapter();
    const result = adapter.parse(
      [
        'Main Line;0;125;Central;main;80',
        'Main Line;125;200;West;main;90',
      ].join('\n'),
      {
        columnMappings: {
          endMileage: 2,
          lineId: 0,
          speedLimit: 5,
          startMileage: 1,
          stationName: 3,
          trackType: 4,
        },
        delimiter: ';',
        hasHeaders: false,
      },
    );

    expect(result.rowCount).toBe(2);
    expect(result.lineIds).toEqual(['main-line']);
    expect(result.graph.lines.size).toBe(1);
    expect(result.graph.edges.size).toBe(2);
    expect(result.graph.nodes.size).toBe(4);
    expect(result.graph.coordinateSystem).toBe(CoordinateSystemType.Linear);
  });

  it('returns descriptive CSV row errors for invalid numeric values', () => {
    const adapter = new CSVAdapter();

    expect(() =>
      adapter.parse(
        ['Line ID,Start Mileage,End Mileage', 'Main Line,zero,25'].join('\n'),
      ),
    ).toThrow('CSV row 2 has invalid startMileage: "zero".');
  });

  it('parses GeoJSON feature collections into a RailGraph and captures CRS metadata', () => {
    const adapter = new GeoJSONAdapter();
    const result = adapter.parse({
      crs: {
        properties: {
          name: 'EPSG:4326',
        },
      },
      features: [
        {
          geometry: {
            coordinates: [
              [-0.1276, 51.5072],
              [-0.1425, 51.501],
            ],
            type: 'LineString',
          },
          id: 'feature-1',
          properties: {
            color: '#2563eb',
            name: 'Blue Route',
            trackId: 'blue-route',
            type: 'main',
          },
          type: 'Feature',
        },
      ],
      type: 'FeatureCollection',
    });

    expect(result.crsName).toBe('EPSG:4326');
    expect(result.featureCount).toBe(1);
    expect(result.graph.coordinateSystem).toBe(CoordinateSystemType.Geographic);
    expect(result.graph.lines.size).toBe(1);
    expect(result.graph.edges.size).toBe(1);
  });

  it('reports invalid GeoJSON geometry types with feature identifiers', () => {
    const adapter = new GeoJSONAdapter();

    expect(() =>
      adapter.parse({
        features: [
          {
            geometry: {
              coordinates: [[0, 0]],
              type: 'Point',
            },
            id: 'bad-feature',
            type: 'Feature',
          },
        ],
        type: 'FeatureCollection',
      }),
    ).toThrow('GeoJSON feature "bad-feature" must use LineString geometry.');
  });

  it('resolves ELR references, converts mileage, and builds ELR graphs', () => {
    const adapter = new ELRAdapter();
    const resolution = adapter.resolveELR('ECML');
    const mileage = adapter.parseMileage('42m 35ch');
    const position = adapter.toLinearPosition('ECM1', '42m 35ch', 'down');
    const result = adapter.parse([
      {
        direction: 'down',
        elr: 'ECM1',
        endMileage: '42m 35ch',
        startMileage: '42m 00ch',
      },
    ]);

    expect(resolution.trackId).toBe('uk-elr-ecm1');
    expect(mileage.totalChains).toBe((42 * 80) + 35);
    expect(mileage.metres).toBeCloseTo(((42 * 80) + 35) * 20.1168);
    expect(position).toEqual({
      direction: 'down',
      distance: mileage.metres,
      trackId: 'uk-elr-ecm1',
      type: CoordinateSystemType.Linear,
    });
    expect(result.segmentCount).toBe(1);
    expect(result.graph.coordinateSystem).toBe(CoordinateSystemType.Linear);
    expect(result.graph.lines.size).toBe(1);
  });

  it('reports unknown ELR codes', () => {
    const adapter = new ELRAdapter();

    expect(() => adapter.resolveELR('UNKNOWN')).toThrow('Unknown ELR code "UNKNOWN".');
  });

  it('resolves RINF identifiers and parses JSON documents into a RailGraph', () => {
    const adapter = new RINFAdapter({
      operationalPoints: [
        {
          id: 'OP1',
          latitude: 48.8566,
          longitude: 2.3522,
          name: 'Paris',
        },
      ],
      sections: [
        {
          endDistance: 1000,
          endOperationalPointId: 'OP2',
          id: 'SOL-1',
          name: 'Paris East',
          startDistance: 0,
          startOperationalPointId: 'OP1',
          trackId: 'fr-rinf-1',
        },
      ],
    });
    const section = adapter.resolveSectionOfLine('SOL-1');
    const point = adapter.resolveOperationalPoint('OP1');
    const result = adapter.parse({
      operationalPoints: [
        {
          id: 'OP2',
          latitude: 48.9,
          longitude: 2.4,
          name: 'Paris East',
        },
      ],
    });

    expect(section.trackId).toBe('fr-rinf-1');
    expect(point.name).toBe('Paris');
    expect(result.sectionCount).toBe(1);
    expect(result.operationalPointCount).toBe(2);
    expect(result.graph.lines.size).toBe(1);
    expect(result.graph.edges.size).toBe(1);
    expect(result.graph.coordinateSystem).toBe(CoordinateSystemType.Geographic);
  });

  it('parses simple RINF XML payloads and reports missing identifiers', () => {
    const adapter = new RINFAdapter();
    const result = adapter.parse(`
      <rinf>
        <operationalPoint id="OPA" name="Alpha" lat="50.1" lon="8.6" />
        <operationalPoint id="OPB" name="Beta" lat="50.2" lon="8.7" />
        <section id="SEC-1" trackId="de-rinf-1" start="0" end="500" from="OPA" to="OPB" />
      </rinf>
    `);

    expect(result.sectionCount).toBe(1);
    expect(result.graph.lines.size).toBe(1);
    expect(() => adapter.resolveSectionOfLine('missing')).toThrow(
      'Unknown RINF section-of-line "missing".',
    );
    expect(() => adapter.resolveOperationalPoint('missing')).toThrow(
      'Unknown RINF operational point "missing".',
    );
  });
});
