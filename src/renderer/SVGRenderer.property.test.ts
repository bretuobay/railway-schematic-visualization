import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { GraphBuilder } from '../builder';
import { CoordinateSystemType } from '../coordinates';
import { DEFAULT_STYLING } from './styling';
import { SVGRenderer } from './SVGRenderer';

function boundedCoordinateArbitrary() {
  return fc.integer({ min: -500, max: 500 });
}

function hexColorArbitrary() {
  return fc
    .array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'), {
      minLength: 6,
      maxLength: 6,
    })
    .map((parts) => `#${parts.join('')}`);
}

describe('SVGRenderer properties', () => {
  it('produces valid SVG wrappers and edge markup for screen graphs', () => {
    const renderer = new SVGRenderer();

    fc.assert(
      fc.property(
        boundedCoordinateArbitrary(),
        boundedCoordinateArbitrary(),
        boundedCoordinateArbitrary(),
        boundedCoordinateArbitrary(),
        (x1, y1, x2, y2) => {
          const graph = new GraphBuilder()
            .addNode({
              id: 'a',
              name: 'A',
              type: 'station',
              coordinate: { type: CoordinateSystemType.Screen, x: x1, y: y1 },
            })
            .addNode({
              id: 'b',
              name: 'B',
              type: 'endpoint',
              coordinate: { type: CoordinateSystemType.Screen, x: x2, y: y2 },
            })
            .addEdge({
              id: 'ab',
              source: 'a',
              target: 'b',
              length: Math.abs(x2 - x1) + Math.abs(y2 - y1) + 1,
              geometry: { type: 'straight' },
            })
            .build();
          const svg = renderer.render(graph);

          expect(svg.startsWith('<svg')).toBe(true);
          expect(svg.endsWith('</svg>')).toBe(true);
          expect(svg).toContain('<path');
          expect(svg).toContain('viewBox="');
          expect(svg).toContain('class="rail-edge');
          expect(svg).not.toContain('NaN');
        },
      ),
    );
  });

  it('renders station nodes as circles', () => {
    const renderer = new SVGRenderer();

    fc.assert(
      fc.property(boundedCoordinateArbitrary(), boundedCoordinateArbitrary(), (x, y) => {
        const graph = new GraphBuilder()
          .addNode({
            id: 'station',
            name: 'Station',
            type: 'station',
            coordinate: { type: CoordinateSystemType.Screen, x, y },
          })
          .build();

        expect(renderer.render(graph)).toContain('<circle');
      }),
    );
  });

  it('renders signal nodes as polygons', () => {
    const renderer = new SVGRenderer();

    fc.assert(
      fc.property(boundedCoordinateArbitrary(), boundedCoordinateArbitrary(), (x, y) => {
        const graph = new GraphBuilder()
          .addNode({
            id: 'signal',
            name: 'Signal',
            type: 'signal',
            coordinate: { type: CoordinateSystemType.Screen, x, y },
          })
          .build();

        expect(renderer.render(graph)).toContain('<polygon');
      }),
    );
  });

  it('applies explicit styling overrides and default styling fallback', () => {
    const renderer = new SVGRenderer();

    fc.assert(
      fc.property(hexColorArbitrary(), (color) => {
        const graph = new GraphBuilder()
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
            coordinate: { type: CoordinateSystemType.Screen, x: 100, y: 0 },
          })
          .addEdge({
            id: 'ab',
            source: 'a',
            target: 'b',
            length: 100,
            geometry: { type: 'straight' },
          })
          .build();
        const withOverride = renderer.render(graph, {
          track: {
            strokeColor: color,
            strokeWidth: DEFAULT_STYLING.track.strokeWidth,
            fillColor: DEFAULT_STYLING.track.fillColor,
          },
        });
        const withDefault = renderer.render(graph);

        expect(withOverride).toContain(color);
        expect(withDefault).toContain(DEFAULT_STYLING.track.strokeColor);
      }),
    );
  });

  it('projects geographic coordinates without producing invalid output', () => {
    const renderer = new SVGRenderer();

    fc.assert(
      fc.property(
        fc.double({ min: -80, max: 80, noNaN: true }),
        fc.double({ min: -170, max: 170, noNaN: true }),
        fc.double({ min: -80, max: 80, noNaN: true }),
        fc.double({ min: -170, max: 170, noNaN: true }),
        (lat1, lon1, lat2, lon2) => {
          const graph = new GraphBuilder()
            .addNode({
              id: 'geo-a',
              name: 'Geo A',
              type: 'station',
              coordinate: {
                type: CoordinateSystemType.Geographic,
                latitude: lat1,
                longitude: lon1,
              },
            })
            .addNode({
              id: 'geo-b',
              name: 'Geo B',
              type: 'endpoint',
              coordinate: {
                type: CoordinateSystemType.Geographic,
                latitude: lat2,
                longitude: lon2,
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
          const svg = renderer.render(graph);

          expect(svg).toContain('<svg');
          expect(svg).not.toContain('NaN');
        },
      ),
    );
  });

  it('uses cubic bezier commands for curve geometry', () => {
    const renderer = new SVGRenderer();

    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10 }), (curvature) => {
        const graph = new GraphBuilder()
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
            coordinate: { type: CoordinateSystemType.Screen, x: 100, y: 0 },
          })
          .addEdge({
            id: 'curve-edge',
            source: 'a',
            target: 'b',
            length: 100,
            geometry: { type: 'curve', curvature },
          })
          .build();

        expect(renderer.render(graph)).toContain(' C ');
      }),
    );
  });

  it('applies switch templates and reacts to scale changes', () => {
    const renderer = new SVGRenderer();
    const graph = new GraphBuilder()
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
        coordinate: { type: CoordinateSystemType.Screen, x: 100, y: 0 },
      })
      .addEdge({
        id: 'switch-edge',
        source: 'a',
        target: 'b',
        length: 100,
        geometry: { type: 'switch', switchType: 'left_turnout', orientation: 0 },
      })
      .build();

    fc.assert(
      fc.property(fc.integer({ min: 1, max: 4 }), fc.integer({ min: 5, max: 8 }), (small, large) => {
        const smallSvg = renderer.render(graph, {
          switch: { scaleFactor: small },
        });
        const largeSvg = renderer.render(graph, {
          switch: { scaleFactor: large },
        });

        expect(smallSvg).toContain('rail-edge--switch');
        expect(largeSvg).toContain('rail-edge--switch');
        expect(smallSvg).not.toEqual(largeSvg);
      }),
    );
  });
});
