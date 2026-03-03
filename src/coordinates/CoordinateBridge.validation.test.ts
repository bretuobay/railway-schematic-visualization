import { describe, expect, it } from 'vitest';

import { GraphBuilder } from '../builder';
import { ProjectionError } from '../errors';
import { CoordinateSystemType } from './types';
import { CoordinateBridge } from './CoordinateBridge';

function linearGraph(options?: {
  readonly trackIdA?: string;
  readonly trackIdB?: string;
}) {
  return new GraphBuilder()
    .addNode({
      id: 'a',
      name: 'A',
      type: 'station',
      coordinate: {
        type: CoordinateSystemType.Linear,
        trackId: options?.trackIdA ?? 'track-1',
        distance: 0,
      },
    })
    .addNode({
      id: 'b',
      name: 'B',
      type: 'endpoint',
      coordinate: {
        type: CoordinateSystemType.Linear,
        trackId: options?.trackIdB ?? 'track-1',
        distance: 100,
      },
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

function screenGraph() {
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

describe('CoordinateBridge validation branches', () => {
  it('rejects invalid graph pair combinations during construction', () => {
    expect(() => new CoordinateBridge(screenGraph(), screenGraph())).toThrowError(ProjectionError);
    expect(() => new CoordinateBridge(linearGraph(), linearGraph())).toThrowError(ProjectionError);

    const mismatchedEdgeCount = new GraphBuilder()
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
      .build();

    expect(() => new CoordinateBridge(linearGraph(), mismatchedEdgeCount)).toThrowError(
      ProjectionError,
    );
  });

  it('rejects mismatched topology and track definitions', () => {
    const badScreen = new GraphBuilder()
      .addNode({
        id: 'a',
        name: 'A',
        type: 'station',
        coordinate: { type: CoordinateSystemType.Screen, x: 0, y: 0 },
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
        target: 'c',
        length: 100,
        geometry: { type: 'straight' },
      })
      .build();

    expect(() => new CoordinateBridge(linearGraph(), badScreen)).toThrowError(ProjectionError);
    expect(() => new CoordinateBridge(linearGraph({ trackIdB: 'track-2' }), screenGraph())).toThrowError(
      ProjectionError,
    );
  });

  it('covers unknown tracks and empty segment projection errors', () => {
    const bridge = new CoordinateBridge(linearGraph(), screenGraph());

    expect(() =>
      bridge.projectToScreen({
        type: CoordinateSystemType.Linear,
        trackId: 'unknown-track',
        distance: 10,
      }),
    ).toThrowError(ProjectionError);

    const bridgeWithoutSegments = bridge as unknown as {
      segments: [];
      projectToLinear: (value: { type: CoordinateSystemType.Screen; x: number; y: number }) => void;
    };
    bridgeWithoutSegments.segments = [];

    expect(() =>
      bridgeWithoutSegments.projectToLinear({
        type: CoordinateSystemType.Screen,
        x: 0,
        y: 0,
      }),
    ).toThrowError(ProjectionError);
  });

  it('covers non-curve and curve projection helpers directly', () => {
    const bridge = new CoordinateBridge(linearGraph(), screenGraph()) as unknown as {
      curveControlPoint: (segment: unknown) => { x: number; y: number };
      projectOntoStraight: (segment: unknown, point: unknown) => { factor: number };
      projectOntoCurve: (segment: unknown, point: unknown) => { factor: number };
    };

    const straightSegment = {
      edge: { geometry: { type: 'straight' } },
      screenStart: { type: CoordinateSystemType.Screen, x: 0, y: 0 },
      screenEnd: { type: CoordinateSystemType.Screen, x: 100, y: 0 },
      distanceStart: 0,
      distanceEnd: 100,
    };
    const curvedSegment = {
      ...straightSegment,
      edge: { geometry: { type: 'curve', curvature: 1 } },
    };

    expect(bridge.curveControlPoint(straightSegment).x).toBeCloseTo(50, 6);
    expect(
      bridge.projectOntoStraight(straightSegment, {
        type: CoordinateSystemType.Screen,
        x: -50,
        y: 0,
      }).factor,
    ).toBe(0);
    expect(
      bridge.projectOntoStraight(straightSegment, {
        type: CoordinateSystemType.Screen,
        x: 150,
        y: 0,
      }).factor,
    ).toBe(1);
    expect(
      bridge.projectOntoCurve(curvedSegment, {
        type: CoordinateSystemType.Screen,
        x: 50,
        y: 10,
      }).factor,
    ).toBeGreaterThanOrEqual(0);
  });
});
