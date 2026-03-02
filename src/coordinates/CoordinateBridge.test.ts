import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { GraphBuilder } from '../builder';
import { ProjectionError } from '../errors';
import { CoordinateSystemType } from './types';
import { CoordinateBridge } from './CoordinateBridge';

function buildLinearGraph() {
  return new GraphBuilder()
    .addNode({
      id: 'a',
      name: 'A',
      type: 'station',
      coordinate: { type: CoordinateSystemType.Linear, trackId: 'track-1', distance: 0 },
    })
    .addNode({
      id: 'b',
      name: 'B',
      type: 'endpoint',
      coordinate: { type: CoordinateSystemType.Linear, trackId: 'track-1', distance: 100 },
    })
    .addEdge({
      id: 'ab',
      source: 'a',
      target: 'b',
      length: 100,
      geometry: { type: 'straight' },
    })
    .build();
}

function buildScreenGraph() {
  return new GraphBuilder()
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
}

function buildMultiSegmentLinearGraph() {
  return new GraphBuilder()
    .addNode({
      id: 'a',
      name: 'A',
      type: 'station',
      coordinate: { type: CoordinateSystemType.Linear, trackId: 'track-1', distance: 0 },
    })
    .addNode({
      id: 'b',
      name: 'B',
      type: 'junction',
      coordinate: { type: CoordinateSystemType.Linear, trackId: 'track-1', distance: 50 },
    })
    .addNode({
      id: 'c',
      name: 'C',
      type: 'endpoint',
      coordinate: { type: CoordinateSystemType.Linear, trackId: 'track-1', distance: 100 },
    })
    .addEdge({
      id: 'ab',
      source: 'a',
      target: 'b',
      length: 50,
      geometry: { type: 'straight' },
    })
    .addEdge({
      id: 'bc',
      source: 'b',
      target: 'c',
      length: 50,
      geometry: { type: 'straight' },
    })
    .build();
}

function buildMultiSegmentScreenGraph(curved = false) {
  return new GraphBuilder()
    .addNode({
      id: 'a',
      name: 'A',
      type: 'station',
      coordinate: { type: CoordinateSystemType.Screen, x: 0, y: 0 },
    })
    .addNode({
      id: 'b',
      name: 'B',
      type: 'junction',
      coordinate: { type: CoordinateSystemType.Screen, x: 50, y: 0 },
    })
    .addNode({
      id: 'c',
      name: 'C',
      type: 'endpoint',
      coordinate: { type: CoordinateSystemType.Screen, x: 100, y: 0 },
    })
    .addEdge({
      id: 'ab',
      source: 'a',
      target: 'b',
      length: 50,
      geometry: curved ? { type: 'curve', curvature: 1 } : { type: 'straight' },
    })
    .addEdge({
      id: 'bc',
      source: 'b',
      target: 'c',
      length: 50,
      geometry: { type: 'straight' },
    })
    .build();
}

describe('CoordinateBridge', () => {
  it('interpolates linear coordinates onto screen coordinates', () => {
    const bridge = new CoordinateBridge(buildLinearGraph(), buildScreenGraph());

    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (distance) => {
        const projected = bridge.projectToScreen({
          type: CoordinateSystemType.Linear,
          trackId: 'track-1',
          distance,
        });

        expect(projected.x).toBeCloseTo(distance, 6);
        expect(projected.y).toBeCloseTo(0, 6);
      }),
    );
  });

  it('rejects out-of-range linear coordinates', () => {
    const bridge = new CoordinateBridge(buildLinearGraph(), buildScreenGraph());

    fc.assert(
      fc.property(fc.integer({ min: 101, max: 1_000 }), (distance) => {
        expect(() =>
          bridge.projectToScreen({
            type: CoordinateSystemType.Linear,
            trackId: 'track-1',
            distance,
          }),
        ).toThrowError(ProjectionError);
      }),
    );
  });

  it('round-trips between linear and screen coordinates within tolerance', () => {
    const bridge = new CoordinateBridge(buildLinearGraph(), buildScreenGraph());

    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (distance) => {
        const screen = bridge.projectToScreen({
          type: CoordinateSystemType.Linear,
          trackId: 'track-1',
          distance,
        });
        const linear = bridge.projectToLinear(screen);

        expect(Math.abs(linear.distance - distance)).toBeLessThanOrEqual(0.1);
      }),
    );
  });

  it('accumulates distance across multiple segments', () => {
    const bridge = new CoordinateBridge(
      buildMultiSegmentLinearGraph(),
      buildMultiSegmentScreenGraph(),
    );

    const projected = bridge.projectToScreen({
      type: CoordinateSystemType.Linear,
      trackId: 'track-1',
      distance: 75,
    });

    expect(projected.x).toBeCloseTo(75, 6);
  });

  it('projects simple two-node tracks', () => {
    const bridge = new CoordinateBridge(buildLinearGraph(), buildScreenGraph());
    const projected = bridge.projectToScreen({
      type: CoordinateSystemType.Linear,
      trackId: 'track-1',
      distance: 25,
    });

    expect(projected.x).toBeCloseTo(25, 6);
    expect(projected.y).toBeCloseTo(0, 6);
  });

  it('projects multi-segment tracks', () => {
    const bridge = new CoordinateBridge(
      buildMultiSegmentLinearGraph(),
      buildMultiSegmentScreenGraph(),
    );
    const projected = bridge.projectToScreen({
      type: CoordinateSystemType.Linear,
      trackId: 'track-1',
      distance: 90,
    });

    expect(projected.x).toBeCloseTo(90, 6);
  });

  it('throws when a coordinate is out of range', () => {
    const bridge = new CoordinateBridge(buildLinearGraph(), buildScreenGraph());

    expect(() =>
      bridge.projectToScreen({
        type: CoordinateSystemType.Linear,
        trackId: 'track-1',
        distance: 400,
      }),
    ).toThrowError(ProjectionError);
  });

  it('round-trips simple coordinates accurately', () => {
    const bridge = new CoordinateBridge(buildLinearGraph(), buildScreenGraph());
    const linear = bridge.projectToLinear({
      type: CoordinateSystemType.Screen,
      x: 64,
      y: 0,
    });

    expect(linear.distance).toBeCloseTo(64, 1);
  });

  it('supports curved edge interpolation', () => {
    const bridge = new CoordinateBridge(
      buildMultiSegmentLinearGraph(),
      buildMultiSegmentScreenGraph(true),
    );
    const projected = bridge.projectToScreen({
      type: CoordinateSystemType.Linear,
      trackId: 'track-1',
      distance: 25,
    });

    expect(projected.y).not.toBeCloseTo(0, 6);
  });
});
