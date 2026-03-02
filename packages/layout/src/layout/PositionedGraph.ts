import {
  CoordinateSystemType,
  type EdgeId,
  RailGraph,
  type RailGraphInit,
  type ScreenCoordinate,
} from '@rail-schematic-viz/core';

export interface BoundingBox {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface PositionedGraphInit extends RailGraphInit {
  readonly bounds: BoundingBox;
  readonly edgeGeometries: ReadonlyMap<EdgeId, ReadonlyArray<ScreenCoordinate>>;
  readonly layoutMode: string;
}

export class PositionedGraph extends RailGraph {
  public readonly bounds: BoundingBox;
  public readonly edgeGeometries: ReadonlyMap<EdgeId, ReadonlyArray<ScreenCoordinate>>;
  public readonly layoutMode: string;

  public constructor({
    nodes,
    edges,
    lines,
    bounds,
    edgeGeometries,
    layoutMode,
  }: PositionedGraphInit) {
    super({ nodes, edges, lines });
    this.bounds = bounds;
    this.edgeGeometries = edgeGeometries;
    this.layoutMode = layoutMode;
  }
}

export function buildPositionedGraph(
  graph: RailGraph,
  nodePositions: ReadonlyMap<string, ScreenCoordinate>,
  edgeGeometries: ReadonlyMap<EdgeId, ReadonlyArray<ScreenCoordinate>>,
  layoutMode: string,
): PositionedGraph {
  const nodes = Array.from(graph.nodes.values(), (node) => ({
    ...node,
    coordinate:
      nodePositions.get(node.id) ??
      (node.coordinate.type === CoordinateSystemType.Screen
        ? node.coordinate
        : { type: CoordinateSystemType.Screen, x: 0, y: 0 }),
  }));
  const coordinates = Array.from(nodePositions.values());
  const bounds =
    coordinates.length === 0
      ? { minX: 0, minY: 0, maxX: 0, maxY: 0 }
      : {
          minX: Math.min(...coordinates.map((coordinate) => coordinate.x)),
          minY: Math.min(...coordinates.map((coordinate) => coordinate.y)),
          maxX: Math.max(...coordinates.map((coordinate) => coordinate.x)),
          maxY: Math.max(...coordinates.map((coordinate) => coordinate.y)),
        };

  return new PositionedGraph({
    nodes,
    edges: graph.edges.values(),
    lines: graph.lines.values(),
    bounds,
    edgeGeometries,
    layoutMode,
  });
}
