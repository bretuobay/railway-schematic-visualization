import { describe, expect, it } from 'vitest';

import { GraphBuilder } from '../builder';
import { CoordinateSystemType } from '../coordinates';
import { SVGRenderer } from './SVGRenderer';

function buildScreenGraph() {
  return new GraphBuilder()
    .addNode({
      id: 'station-a',
      name: 'Station A',
      type: 'station',
      coordinate: { type: CoordinateSystemType.Screen, x: 0, y: 0 },
    })
    .addNode({
      id: 'junction-b',
      name: 'Junction B',
      type: 'junction',
      coordinate: { type: CoordinateSystemType.Screen, x: 100, y: 0 },
    })
    .addNode({
      id: 'signal-c',
      name: 'Signal C',
      type: 'signal',
      coordinate: { type: CoordinateSystemType.Screen, x: 50, y: 20 },
    })
    .addEdge({
      id: 'edge-1',
      source: 'station-a',
      target: 'junction-b',
      length: 100,
      geometry: { type: 'switch', switchType: 'left_turnout', orientation: 0 },
    })
    .build();
}

function buildGeographicGraph() {
  return new GraphBuilder()
    .addNode({
      id: 'geo-a',
      name: 'Geo A',
      type: 'station',
      coordinate: {
        type: CoordinateSystemType.Geographic,
        latitude: 51.5007,
        longitude: -0.1246,
      },
    })
    .addNode({
      id: 'geo-b',
      name: 'Geo B',
      type: 'endpoint',
      coordinate: {
        type: CoordinateSystemType.Geographic,
        latitude: 51.501,
        longitude: -0.12,
      },
    })
    .addEdge({
      id: 'geo-edge',
      source: 'geo-a',
      target: 'geo-b',
      length: 100,
      geometry: { type: 'straight' },
    })
    .build();
}

describe('SVGRenderer', () => {
  it('generates valid SVG markup', () => {
    const svg = new SVGRenderer().render(buildScreenGraph());

    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
  });

  it('renders track paths, station circles, and signal polygons', () => {
    const svg = new SVGRenderer().render(buildScreenGraph());

    expect(svg).toContain('<path');
    expect(svg).toContain('<circle');
    expect(svg).toContain('<polygon');
  });

  it('applies styling configuration to rendered elements', () => {
    const svg = new SVGRenderer().render(buildScreenGraph(), {
      track: {
        strokeColor: '#123456',
        strokeWidth: 4,
        fillColor: '#cbd5e1',
      },
    });

    expect(svg).toContain('#123456');
  });

  it('sets the SVG viewBox and css classes', () => {
    const svg = new SVGRenderer().render(buildScreenGraph());

    expect(svg).toContain('viewBox="');
    expect(svg).toContain('class="rail-edge');
    expect(svg).toContain('class="rail-node');
  });

  it('projects geographic coordinates before rendering', () => {
    const svg = new SVGRenderer().render(buildGeographicGraph());

    expect(svg).toContain('<svg');
    expect(svg).not.toContain('NaN');
  });
});
