import {
  CoordinateSystemType,
  type NodeId,
  type RailGraph,
  type ScreenCoordinate,
} from '@rail-schematic-viz/core';

import type { LayoutConfiguration } from './LayoutStrategy';

function orientation(
  a: ScreenCoordinate,
  b: ScreenCoordinate,
  c: ScreenCoordinate,
): number {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);

  if (Math.abs(value) < 0.000001) {
    return 0;
  }

  return value > 0 ? 1 : 2;
}

function segmentsIntersect(
  p1: ScreenCoordinate,
  q1: ScreenCoordinate,
  p2: ScreenCoordinate,
  q2: ScreenCoordinate,
): boolean {
  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);

  return o1 !== o2 && o3 !== o4;
}

function distance(
  left: ScreenCoordinate,
  right: ScreenCoordinate,
): number {
  return Math.hypot(right.x - left.x, right.y - left.y);
}

export class LayoutOptimizer {
  public optimize(
    graph: RailGraph,
    positions: ReadonlyMap<NodeId, ScreenCoordinate>,
    config: LayoutConfiguration,
  ): ReadonlyMap<NodeId, ScreenCoordinate> {
    const resolved = new Map(positions);
    const lockedNodes = this.applyManualOverrides(resolved, config);

    this.applyPadding(resolved, config.padding);
    this.minimizeEdgeCrossings(graph, resolved, config.padding, lockedNodes);
    this.resolveLabelCollisions(
      resolved,
      Math.max(config.overlapThreshold, Math.max(8, config.padding / 2)),
      lockedNodes,
    );
    this.applyPadding(resolved, config.padding);

    return resolved;
  }

  public applyPadding(
    positions: Map<NodeId, ScreenCoordinate>,
    padding: number,
  ): void {
    if (positions.size === 0) {
      return;
    }

    const values = Array.from(positions.values());
    const minX = Math.min(...values.map((coordinate) => coordinate.x));
    const minY = Math.min(...values.map((coordinate) => coordinate.y));
    const shiftX = minX < padding ? padding - minX : 0;
    const shiftY = minY < padding ? padding - minY : 0;

    if (shiftX === 0 && shiftY === 0) {
      return;
    }

    for (const [nodeId, coordinate] of positions) {
      positions.set(nodeId, {
        type: CoordinateSystemType.Screen,
        x: coordinate.x + shiftX,
        y: coordinate.y + shiftY,
      });
    }
  }

  public applyManualOverrides(
    positions: Map<NodeId, ScreenCoordinate>,
    config: LayoutConfiguration,
  ): ReadonlySet<NodeId> {
    const lockedNodes = new Set<NodeId>();

    if (!config.manualOverrides) {
      return lockedNodes;
    }

    for (const [nodeId, coordinate] of config.manualOverrides) {
      positions.set(nodeId, coordinate);
      lockedNodes.add(nodeId);
    }

    return lockedNodes;
  }

  public resolveLabelCollisions(
    positions: Map<NodeId, ScreenCoordinate>,
    minDistance: number,
    lockedNodes: ReadonlySet<NodeId> = new Set<NodeId>(),
  ): void {
    const entries = Array.from(positions.entries());

    for (let iteration = 0; iteration < 4; iteration += 1) {
      let moved = false;

      for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
        const [leftId, leftCoordinate] = entries[leftIndex]!;

        for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
          const [rightId, rightCoordinate] = entries[rightIndex]!;
          const currentDistance = distance(leftCoordinate, rightCoordinate);

          if (currentDistance >= minDistance) {
            continue;
          }

          const overlap = (minDistance - currentDistance) / 2;
          const dx = rightCoordinate.x - leftCoordinate.x;
          const dy = rightCoordinate.y - leftCoordinate.y;
          const safeDistance = currentDistance || 1;
          const nx = dx === 0 && dy === 0 ? 0 : dx / safeDistance;
          const ny = dx === 0 && dy === 0 ? 1 : dy / safeDistance;
          const leftMovable = !lockedNodes.has(leftId);
          const rightMovable = !lockedNodes.has(rightId);
          let collisionResolved = false;

          if (leftMovable) {
            const updatedLeft = {
              type: CoordinateSystemType.Screen,
              x: leftCoordinate.x - nx * overlap,
              y: leftCoordinate.y - ny * overlap,
            } as const;

            positions.set(leftId, updatedLeft);
            entries[leftIndex] = [leftId, updatedLeft];
            collisionResolved = true;
          }

          if (rightMovable) {
            const updatedRight = {
              type: CoordinateSystemType.Screen,
              x: rightCoordinate.x + nx * overlap,
              y: rightCoordinate.y + ny * overlap,
            } as const;

            positions.set(rightId, updatedRight);
            entries[rightIndex] = [rightId, updatedRight];
            collisionResolved = true;
          }

          moved = moved || collisionResolved;
        }
      }

      if (!moved) {
        return;
      }
    }
  }

  public minimizeEdgeCrossings(
    graph: RailGraph,
    positions: Map<NodeId, ScreenCoordinate>,
    padding: number,
    lockedNodes: ReadonlySet<NodeId> = new Set<NodeId>(),
  ): void {
    const edges = Array.from(graph.edges.values());

    for (let leftIndex = 0; leftIndex < edges.length; leftIndex += 1) {
      const leftEdge = edges[leftIndex]!;
      const leftSource = positions.get(leftEdge.source);
      const leftTarget = positions.get(leftEdge.target);

      if (!leftSource || !leftTarget) {
        continue;
      }

      for (let rightIndex = leftIndex + 1; rightIndex < edges.length; rightIndex += 1) {
        const rightEdge = edges[rightIndex]!;

        if (
          leftEdge.source === rightEdge.source ||
          leftEdge.source === rightEdge.target ||
          leftEdge.target === rightEdge.source ||
          leftEdge.target === rightEdge.target
        ) {
          continue;
        }

        const rightSource = positions.get(rightEdge.source);
        const rightTarget = positions.get(rightEdge.target);

        if (!rightSource || !rightTarget) {
          continue;
        }

        if (!segmentsIntersect(leftSource, leftTarget, rightSource, rightTarget)) {
          continue;
        }

        const movableTargetId = lockedNodes.has(rightEdge.target)
          ? lockedNodes.has(leftEdge.target)
            ? undefined
            : leftEdge.target
          : rightEdge.target;

        if (!movableTargetId) {
          continue;
        }

        const coordinate = positions.get(movableTargetId)!;

        positions.set(movableTargetId, {
          type: CoordinateSystemType.Screen,
          x: coordinate.x,
          y: coordinate.y + Math.max(8, padding),
        });
      }
    }
  }
}
