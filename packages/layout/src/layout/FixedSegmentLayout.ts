import { CoordinateSystemType } from '@rail-schematic-viz/core';
import type {
  EdgeId,
  NodeId,
  RailGraph,
  ScreenCoordinate,
} from '@rail-schematic-viz/core';

import type {
  LayoutConfiguration,
  LayoutStrategy,
  LayoutValidationResult,
  LayoutWarning,
} from './LayoutStrategy';
import { nextPosition, nodePosition, resolveOrientation } from './layout-helpers';

export interface FixedSegmentLayoutOptions {
  readonly segmentLength?: number;
  readonly parallelSpacing?: number;
}

export class FixedSegmentLayout implements LayoutStrategy {
  public readonly name = 'fixed-segment';
  public readonly warnings: LayoutWarning[] = [];
  private readonly segmentLength: number;
  private readonly parallelSpacing: number;

  public constructor(options: FixedSegmentLayoutOptions = {}) {
    this.segmentLength = options.segmentLength ?? 64;
    this.parallelSpacing = options.parallelSpacing ?? 16;
  }

  public async computePositions(
    graph: RailGraph,
    config: LayoutConfiguration,
  ): Promise<ReadonlyMap<NodeId, ScreenCoordinate>> {
    const orientation = resolveOrientation(config.orientation);
    const positions = new Map<NodeId, ScreenCoordinate>();
    const rootNode = Array.from(graph.nodes.keys())[0];

    if (!rootNode) {
      return positions;
    }

    positions.set(rootNode, {
      type: CoordinateSystemType.Screen,
      x: config.padding,
      y: config.padding,
    });

    const outgoingCounts = new Map<NodeId, number>();

    for (const edge of graph.edges.values()) {
      const sourcePosition = nodePosition(positions, edge.source);
      const currentCount = outgoingCounts.get(edge.source) ?? 0;

      outgoingCounts.set(edge.source, currentCount + 1);
      positions.set(
        edge.target,
        nextPosition(
          sourcePosition,
          this.segmentLength,
          graph,
          edge,
          orientation,
          currentCount * this.parallelSpacing,
        ),
      );
    }

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
}
