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
import { nodePosition } from './layout-helpers';

export interface AutoLayoutOptions {
  readonly linkDistance?: number;
  readonly linkStrength?: number;
  readonly chargeStrength?: number;
  readonly centerStrength?: number;
  readonly lineStrength?: number;
  readonly maxIterations?: number;
  readonly minDistance?: number;
}

export class AutoLayout implements LayoutStrategy {
  public readonly name = 'auto';
  public readonly warnings: LayoutWarning[] = [];

  private readonly linkDistance: number;
  private readonly linkStrength: number;
  private readonly chargeStrength: number;
  private readonly centerStrength: number;
  private readonly lineStrength: number;
  private readonly maxIterations: number;
  private readonly minDistance: number;
  private lastPositions: ReadonlyMap<NodeId, ScreenCoordinate> = new Map();

  public constructor(options: AutoLayoutOptions = {}) {
    this.linkDistance = options.linkDistance ?? 72;
    this.linkStrength = options.linkStrength ?? 0.08;
    this.chargeStrength = options.chargeStrength ?? 400;
    this.centerStrength = options.centerStrength ?? 0.02;
    this.lineStrength = options.lineStrength ?? 1.2;
    this.maxIterations = options.maxIterations ?? 80;
    this.minDistance = options.minDistance ?? 24;
  }

  public async computePositions(
    graph: RailGraph,
    config: LayoutConfiguration,
  ): Promise<ReadonlyMap<NodeId, ScreenCoordinate>> {
    this.warnings.length = 0;
    const nodes = Array.from(graph.nodes.values());
    const positions = new Map<NodeId, ScreenCoordinate>();

    if (nodes.length === 0) {
      this.lastPositions = positions;
      return positions;
    }

    const centerX = config.padding * 4;
    const centerY = config.padding * 4;
    const initialRadius = Math.max(this.linkDistance, this.minDistance) * 2;

    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * Math.PI * 2;

      positions.set(node.id, {
        type: CoordinateSystemType.Screen,
        x: centerX + Math.cos(angle) * initialRadius,
        y: centerY + Math.sin(angle) * initialRadius,
      });
    });

    for (let iteration = 0; iteration < this.maxIterations; iteration += 1) {
      const deltas = new Map<NodeId, { x: number; y: number }>();

      for (const node of nodes) {
        deltas.set(node.id, { x: 0, y: 0 });
      }

      for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
        const leftNode = nodes[leftIndex]!;
        const leftPosition = positions.get(leftNode.id)!;

        for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex += 1) {
          const rightNode = nodes[rightIndex]!;
          const rightPosition = positions.get(rightNode.id)!;
          const dx = rightPosition.x - leftPosition.x;
          const dy = rightPosition.y - leftPosition.y;
          const distance = Math.hypot(dx, dy) || 0.0001;
          const force = this.chargeStrength / (distance * distance);
          const nx = dx / distance;
          const ny = dy / distance;

          const leftDelta = deltas.get(leftNode.id)!;
          const rightDelta = deltas.get(rightNode.id)!;

          leftDelta.x -= nx * force;
          leftDelta.y -= ny * force;
          rightDelta.x += nx * force;
          rightDelta.y += ny * force;
        }
      }

      for (const edge of graph.edges.values()) {
        const source = positions.get(edge.source)!;
        const target = positions.get(edge.target)!;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.hypot(dx, dy) || 0.0001;
        const desiredDistance =
          edge.length > 0 ? Math.max(this.minDistance, Math.min(edge.length, this.linkDistance * 3)) : this.linkDistance;
        const stretch = distance - desiredDistance;
        const strength = this.linkStrength * (graph.lines.size > 0 ? this.lineStrength : 1);
        const nx = dx / distance;
        const ny = dy / distance;
        const sourceDelta = deltas.get(edge.source)!;
        const targetDelta = deltas.get(edge.target)!;

        sourceDelta.x += nx * stretch * strength;
        sourceDelta.y += ny * stretch * strength;
        targetDelta.x -= nx * stretch * strength;
        targetDelta.y -= ny * stretch * strength;
      }

      for (const node of nodes) {
        const position = positions.get(node.id)!;
        const delta = deltas.get(node.id)!;

        delta.x += (centerX - position.x) * this.centerStrength;
        delta.y += (centerY - position.y) * this.centerStrength;
      }

      for (const node of nodes) {
        const position = positions.get(node.id)!;
        const delta = deltas.get(node.id)!;

        positions.set(node.id, {
          type: CoordinateSystemType.Screen,
          x: position.x + delta.x,
          y: position.y + delta.y,
        });
      }

      this.enforceMinimumDistance(nodes.map((node) => node.id), positions);
    }

    this.lastPositions = positions;

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

  public exportComputedCoordinates(): ReadonlyMap<NodeId, ScreenCoordinate> {
    return new Map(this.lastPositions);
  }

  private enforceMinimumDistance(
    nodeIds: ReadonlyArray<NodeId>,
    positions: Map<NodeId, ScreenCoordinate>,
  ): void {
    for (let leftIndex = 0; leftIndex < nodeIds.length; leftIndex += 1) {
      const leftId = nodeIds[leftIndex]!;
      const leftPosition = positions.get(leftId)!;

      for (let rightIndex = leftIndex + 1; rightIndex < nodeIds.length; rightIndex += 1) {
        const rightId = nodeIds[rightIndex]!;
        const rightPosition = positions.get(rightId)!;
        const dx = rightPosition.x - leftPosition.x;
        const dy = rightPosition.y - leftPosition.y;
        const distance = Math.hypot(dx, dy) || 0.0001;

        if (distance >= this.minDistance) {
          continue;
        }

        const overlap = (this.minDistance - distance) / 2;
        const nx = dx / distance;
        const ny = dy / distance;

        positions.set(leftId, {
          type: CoordinateSystemType.Screen,
          x: leftPosition.x - nx * overlap,
          y: leftPosition.y - ny * overlap,
        });
        positions.set(rightId, {
          type: CoordinateSystemType.Screen,
          x: rightPosition.x + nx * overlap,
          y: rightPosition.y + ny * overlap,
        });
      }
    }
  }
}
