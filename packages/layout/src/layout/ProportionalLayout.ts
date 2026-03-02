import {
  CoordinateSystemType,
  type EdgeId,
  type NodeId,
  type RailGraph,
  type ScreenCoordinate,
} from '@rail-schematic-viz/core';

import type {
  LayoutConfiguration,
  LayoutStrategy,
  LayoutValidationResult,
  LayoutWarning,
} from './LayoutStrategy';
import {
  getDistanceForEdge,
  nextPosition,
  nodePosition,
  resolveOrientation,
} from './layout-helpers';

export interface ProportionalLayoutOptions {
  readonly scaleFactor?: number;
}

export class ProportionalLayout implements LayoutStrategy {
  public readonly name = 'proportional';
  public readonly warnings: LayoutWarning[] = [];
  private readonly scaleFactor: number;

  public constructor(options: ProportionalLayoutOptions = {}) {
    this.scaleFactor = options.scaleFactor ?? 1;
  }

  public async computePositions(
    graph: RailGraph,
    config: LayoutConfiguration,
  ): Promise<ReadonlyMap<NodeId, ScreenCoordinate>> {
    this.warnings.length = 0;
    const orientation = resolveOrientation(config.orientation);
    const positions = new Map<NodeId, ScreenCoordinate>();
    const edges = Array.from(graph.edges.values());
    const startNode = edges[0]?.source ?? Array.from(graph.nodes.keys())[0];

    if (!startNode) {
      return positions;
    }

    positions.set(startNode, {
      type: CoordinateSystemType.Screen,
      x: config.padding,
      y: config.padding,
    });

    for (const [index, edge] of edges.entries()) {
      const sourcePosition = nodePosition(positions, edge.source);
      const edgeLength = getDistanceForEdge(edge, 1);

      if (edge.length <= 0) {
        this.warnings.push({
          message: `Missing or invalid edge length for ${edge.id}; using unit length.`,
          edgeId: edge.id,
        });
      }

      positions.set(
        edge.target,
        nextPosition(
          sourcePosition,
          edgeLength * this.scaleFactor,
          graph,
          edge,
          orientation,
          index === 0 ? 0 : config.padding * 0.5,
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
