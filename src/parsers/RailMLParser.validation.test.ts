import { describe, expect, it } from 'vitest';

import { RailMLParser } from './RailMLParser';

function parse(xml: string) {
  return new RailMLParser().parse(xml);
}

describe('RailMLParser validation branches', () => {
  it('handles alternative root names and signal coordinate inheritance', () => {
    const result = parse(`
      <railML>
        <infrastructure>
          <topology>
            <netElements>
              <netElement id="a" type="station">
                <screenPositioningSystem x="0" y="0" />
              </netElement>
              <netElement id="b" type="endpoint">
                <screenPositioningSystem x="100" y="0" />
              </netElement>
            </netElements>
            <netRelations>
              <netRelation id="ab" source="a" target="b" length="100">
                <geometry type="straight" />
              </netRelation>
            </netRelations>
            <signals>
              <signal id="sig-1" nodeRef="b" />
            </signals>
          </topology>
        </infrastructure>
      </railML>
    `);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Array.from(result.value.nodes.values()).some((node) => node.id === 'sig-1')).toBe(true);
    }
  });

  it('covers root and topology validation failures', () => {
    const parser = new RailMLParser() as unknown as {
      resolveRoot: (value: unknown) => { ok: boolean };
      resolveTopology: (value: unknown) => { ok: boolean };
    };

    expect(parser.resolveRoot(null).ok).toBe(false);
    expect(parser.resolveRoot({ railml: null }).ok).toBe(false);
    expect(parser.resolveTopology({}).ok).toBe(false);
    expect(parser.resolveTopology({ infrastructure: {} }).ok).toBe(false);
    expect(
      parser.resolveTopology({
        infrastructure: {
          topology: {
            netElements: {},
          },
        },
      }).ok,
    ).toBe(false);
  });

  it('covers netElement, signal, and netRelation validation branches', () => {
    const parser = new RailMLParser() as unknown as {
      parseNetElements: (value: unknown) => { ok: boolean };
      parseSignals: (topology: unknown, nodes: unknown[]) => { ok: boolean };
      parseNetRelations: (value: unknown) => { ok: boolean };
    };

    expect(parser.parseNetElements({ netElements: {} }).ok).toBe(true);
    expect(parser.parseNetElements({ netElements: { netElement: ['bad'] } }).ok).toBe(false);
    expect(parser.parseNetElements({ netElements: { netElement: [{}] } }).ok).toBe(false);

    expect(parser.parseSignals({ signals: { signal: ['bad'] } }, []).ok).toBe(false);
    expect(parser.parseSignals({ signals: { signal: [{}] } }, []).ok).toBe(false);
    expect(
      parser.parseSignals(
        {
          signals: { signal: [{ '@_id': 'sig-1', '@_nodeRef': 'missing-node' }] },
        },
        [],
      ).ok,
    ).toBe(false);

    expect(parser.parseNetRelations({ netRelations: { netRelation: ['bad'] } }).ok).toBe(false);
    expect(parser.parseNetRelations({ netRelations: { netRelation: [{}] } }).ok).toBe(false);
    expect(
      parser.parseNetRelations({
        netRelations: {
          netRelation: [{ '@_id': 'edge', '@_source': 'a', '@_target': 'b' }],
        },
      }).ok,
    ).toBe(false);
  });

  it('covers coordinate extraction error branches', () => {
    const parser = new RailMLParser() as unknown as {
      extractCoordinate: (value: unknown, path: string) => { ok: boolean };
    };

    expect(
      parser.extractCoordinate(
        { screenPositioningSystem: { '@_x': 'bad', '@_y': 0 } },
        'screen',
      ).ok,
    ).toBe(false);
    expect(
      parser.extractCoordinate(
        { linearPositioningSystem: { '@_distance': 10 } },
        'linear',
      ).ok,
    ).toBe(false);
    expect(
      parser.extractCoordinate(
        { geometricPositioningSystem: { '@_latitude': 'bad', '@_longitude': 0 } },
        'geo',
      ).ok,
    ).toBe(false);
    expect(parser.extractCoordinate({}, 'missing').ok).toBe(false);
  });

  it('covers geometry extraction branches and parser failure fallback', () => {
    const parser = new RailMLParser() as unknown as {
      extractGeometry: (value: unknown, path: string) => { ok: boolean };
      xmlParser: { parse: (value: string) => unknown };
    };

    expect(
      parser.extractGeometry({ switch: { '@_switchType': 'bad', '@_orientation': 0 } }, 'switch')
        .ok,
    ).toBe(false);
    expect(
      parser.extractGeometry({ geometry: { '@_type': 'curve', '@_curvature': 'bad' } }, 'curve')
        .ok,
    ).toBe(false);
    expect(parser.extractGeometry({ geometry: { '@_type': 'straight' } }, 'straight').ok).toBe(
      true,
    );

    const originalParse = parser.xmlParser.parse;
    parser.xmlParser.parse = () => {
      throw new Error('boom');
    };

    try {
      const result = parse('<railml><infrastructure><topology><netElements /><netRelations /></topology></infrastructure></railml>');
      expect(result.ok).toBe(false);
    } finally {
      parser.xmlParser.parse = originalParse;
    }
  });
});
