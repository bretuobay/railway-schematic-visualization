import {
  CoordinateSystemType,
  type EdgeId,
  type NodeId,
  type RailEdge,
  type RailGraph,
  type ScreenCoordinate,
} from '@rail-schematic-viz/core';

import type {
  LayoutConfiguration,
  LayoutStrategy,
  LayoutValidationResult,
  LayoutWarning,
} from './LayoutStrategy';
import { coordinateVector, getDistanceForEdge, nodePosition } from './layout-helpers';

export interface MetroMapLayoutOptions {
  readonly gridSpacing?: number;
  readonly angleSnapTolerance?: number;
  readonly maxIterations?: number;
}

const OCTILINEAR_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315] as const;

function toRadians(angleDegrees: number): number {
  return (angleDegrees * Math.PI) / 180;
}

function normalizeAngle(angleDegrees: number): number {
  const normalized = angleDegrees % 360;

  return normalized < 0 ? normalized + 360 : normalized;
}

function nearestOctilinearAngle(angleDegrees: number): number {
  const normalized = normalizeAngle(angleDegrees);
  let bestAngle: number = OCTILINEAR_ANGLES[0];
  let bestDelta = Number.POSITIVE_INFINITY;

  for (const candidate of OCTILINEAR_ANGLES) {
    const direct = Math.abs(candidate - normalized);
    const wrapped = 360 - direct;
    const delta = Math.min(direct, wrapped);

    if (delta < bestDelta) {
      bestAngle = candidate;
      bestDelta = delta;
    }
  }

  return bestAngle;
}

function snapToGrid(
  coordinate: ScreenCoordinate,
  gridSpacing: number,
): ScreenCoordinate {
  return {
    type: CoordinateSystemType.Screen,
    x: Math.round(coordinate.x / gridSpacing) * gridSpacing,
    y: Math.round(coordinate.y / gridSpacing) * gridSpacing,
  };
}

export class MetroMapLayout implements LayoutStrategy {
  public readonly name = 'metro-map';
  public readonly warnings: LayoutWarning[] = [];
  private readonly gridSpacing: number;
  private readonly angleSnapTolerance: number;
  private readonly maxIterations: number;

  public constructor(options: MetroMapLayoutOptions = {}) {
    this.gridSpacing = options.gridSpacing ?? 32;
    this.angleSnapTolerance = options.angleSnapTolerance ?? 1;
    this.maxIterations = options.maxIterations ?? 3;
  }

  public async computePositions(
    graph: RailGraph,
    config: LayoutConfiguration,
  ): Promise<ReadonlyMap<NodeId, ScreenCoordinate>> {
    this.warnings.length = 0;
    const positions = new Map<NodeId, ScreenCoordinate>();
    const rootNode = Array.from(graph.nodes.keys())[0];

    if (!rootNode) {
      return positions;
    }

    positions.set(
      rootNode,
      snapToGrid(
        {
          type: CoordinateSystemType.Screen,
          x: config.padding,
          y: config.padding,
        },
        this.gridSpacing,
      ),
    );

    const outgoingCounts = new Map<NodeId, number>();
    const edges = Array.from(graph.edges.values());

    for (const edge of edges) {
      const sourcePosition = nodePosition(positions, edge.source);
      const outgoingCount = outgoingCounts.get(edge.source) ?? 0;

      outgoingCounts.set(edge.source, outgoingCount + 1);

      const snappedAngle = this.resolveEdgeAngle(graph, edge, outgoingCount);
      const realLength = getDistanceForEdge(edge, this.gridSpacing);
      const steps = Math.max(1, Math.round(realLength / this.gridSpacing));
      const length = steps * this.gridSpacing;
      const radians = toRadians(snappedAngle);
      const targetPosition = snapToGrid(
        {
          type: CoordinateSystemType.Screen,
          x: sourcePosition.x + Math.cos(radians) * length,
          y: sourcePosition.y + Math.sin(radians) * length,
        },
        this.gridSpacing,
      );

      positions.set(edge.target, targetPosition);
    }

    this.resolveOverlaps(positions);

    return positions;
  }

  public computeGeometries(
    graph: RailGraph,
    positions: ReadonlyMap<NodeId, ScreenCoordinate>,
  ): ReadonlyMap<EdgeId, ReadonlyArray<ScreenCoordinate>> {
    const geometries = new Map<EdgeId, ReadonlyArray<ScreenCoordinate>>();

    for (const edge of graph.edges.values()) {
      geometries.set(edge.id, [
        nodePosition(positions, edge.source),
        nodePosition(positions, edge.target),
      ]);
    }

    return geometries;
  }

  public validate(graph: RailGraph): LayoutValidationResult {
    if (graph.nodes.size === 0) {
      return {
        valid: false,
        errors: ['Graph must contain at least one node.'],
      };
    }

    return {
      valid: true,
      errors: [],
    };
  }

  private resolveEdgeAngle(
    graph: RailGraph,
    edge: RailEdge,
    outgoingIndex: number,
  ): number {
    const vector = coordinateVector(graph, edge);
    const fallbackAngle = OCTILINEAR_ANGLES[outgoingIndex % OCTILINEAR_ANGLES.length]!;

    if (!vector || (vector.dx === 0 && vector.dy === 0)) {
      return fallbackAngle;
    }

    const rawAngle = normalizeAngle((Math.atan2(vector.dy, vector.dx) * 180) / Math.PI);
    const snappedAngle = nearestOctilinearAngle(rawAngle);
    const difference = Math.abs(snappedAngle - rawAngle);
    const wrappedDifference = Math.min(difference, 360 - difference);

    if (wrappedDifference > this.angleSnapTolerance) {
      this.warnings.push({
        message: `Snapped edge ${edge.id} from ${rawAngle.toFixed(1)}deg to ${snappedAngle}deg.`,
        edgeId: edge.id,
      });
    }

    return snappedAngle;
  }

  private resolveOverlaps(
    positions: Map<NodeId, ScreenCoordinate>,
  ): void {
    const entries = Array.from(positions.entries());

    for (let iteration = 0; iteration < this.maxIterations; iteration += 1) {
      const occupied = new Set<string>();
      let moved = false;

      for (const [index, [nodeId, coordinate]] of entries.entries()) {
        let resolved = coordinate;
        let key = `${resolved.x}:${resolved.y}`;

        while (occupied.has(key)) {
          const shift = (index + 1) * this.gridSpacing;

          resolved = {
            type: CoordinateSystemType.Screen,
            x: resolved.x + shift,
            y: resolved.y + (index % 2 === 0 ? this.gridSpacing : -this.gridSpacing),
          };
          key = `${resolved.x}:${resolved.y}`;
          moved = true;
        }

        occupied.add(key);
        positions.set(nodeId, resolved);
        entries[index] = [nodeId, resolved];
      }

      if (!moved) {
        return;
      }
    }
  }
}
