import {
  CoordinateSystemType,
  projectWebMercator,
  type RailEdge,
  type RailGraph,
  type ScreenCoordinate,
} from '@rail-schematic-viz/core';

import type { LayoutConfiguration } from './LayoutStrategy';

export function resolveOrientation(
  orientation: LayoutConfiguration['orientation'],
): 'horizontal' | 'vertical' {
  return orientation === 'auto' ? 'horizontal' : orientation;
}

export function getDistanceForEdge(edge: RailEdge, fallback = 1): number {
  return edge.length > 0 ? edge.length : fallback;
}

export function coordinateVector(
  graph: RailGraph,
  edge: RailEdge,
): { readonly dx: number; readonly dy: number } | undefined {
  const source = graph.getNode(edge.source);
  const target = graph.getNode(edge.target);

  if (!source || !target) {
    return undefined;
  }

  if (
    source.coordinate.type === CoordinateSystemType.Geographic &&
    target.coordinate.type === CoordinateSystemType.Geographic
  ) {
    const sourcePoint = projectWebMercator(source.coordinate);
    const targetPoint = projectWebMercator(target.coordinate);

    return {
      dx: targetPoint.x - sourcePoint.x,
      dy: targetPoint.y - sourcePoint.y,
    };
  }

  if (
    source.coordinate.type === CoordinateSystemType.Screen &&
    target.coordinate.type === CoordinateSystemType.Screen
  ) {
    return {
      dx: target.coordinate.x - source.coordinate.x,
      dy: target.coordinate.y - source.coordinate.y,
    };
  }

  return undefined;
}

export function nextPosition(
  current: ScreenCoordinate,
  length: number,
  graph: RailGraph,
  edge: RailEdge,
  orientation: 'horizontal' | 'vertical',
  crossAxisOffset = 0,
): ScreenCoordinate {
  const vector = coordinateVector(graph, edge);

  if (vector && (vector.dx !== 0 || vector.dy !== 0)) {
    const magnitude = Math.hypot(vector.dx, vector.dy) || 1;

    return {
      type: CoordinateSystemType.Screen,
      x: current.x + (vector.dx / magnitude) * length,
      y: current.y + (vector.dy / magnitude) * length,
    };
  }

  if (orientation === 'vertical') {
    return {
      type: CoordinateSystemType.Screen,
      x: current.x + crossAxisOffset,
      y: current.y + length,
    };
  }

  return {
    type: CoordinateSystemType.Screen,
    x: current.x + length,
    y: current.y + crossAxisOffset,
  };
}

export function nodePosition(
  positions: ReadonlyMap<string, ScreenCoordinate>,
  nodeId: string,
): ScreenCoordinate {
  return (
    positions.get(nodeId) ?? {
      type: CoordinateSystemType.Screen,
      x: 0,
      y: 0,
    }
  );
}
