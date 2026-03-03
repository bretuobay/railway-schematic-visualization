import {
  CoordinateSystemType,
  type EdgeId,
  type NodeId,
  type RailGraph,
  type ScreenCoordinate,
} from '@rail-schematic-viz/core';

import {
  PositionedGraph,
  buildPositionedGraph,
} from './PositionedGraph';
import { LayoutOptimizer } from './LayoutOptimizer';
import type {
  LayoutConfiguration,
  LayoutData,
  LayoutStrategy,
} from './LayoutStrategy';

export type LayoutEvent =
  | 'layout-start'
  | 'layout-progress'
  | 'layout-complete'
  | 'layout-export'
  | 'layout-import';

export interface LayoutEventPayload {
  readonly graph?: RailGraph;
  readonly positionedGraph?: PositionedGraph;
  readonly progress?: number;
  readonly data?: LayoutData;
}

type LayoutEventHandler = (payload: LayoutEventPayload) => void;

const DEFAULT_CONFIGURATION: LayoutConfiguration = {
  padding: 24,
  orientation: 'auto',
  overlapThreshold: 1,
};

export class LayoutEngine {
  private strategy: LayoutStrategy;
  private configuration: LayoutConfiguration;
  private readonly optimizer: LayoutOptimizer;
  private readonly handlers = new Map<LayoutEvent, Set<LayoutEventHandler>>();
  private lastLayout: PositionedGraph | undefined;

  public constructor(
    strategy: LayoutStrategy,
    configuration: Partial<LayoutConfiguration> = {},
  ) {
    this.strategy = strategy;
    this.optimizer = new LayoutOptimizer();
    this.configuration = {
      ...DEFAULT_CONFIGURATION,
      ...configuration,
    };
  }

  public on(event: LayoutEvent, handler: LayoutEventHandler): void {
    const handlers = this.handlers.get(event) ?? new Set<LayoutEventHandler>();

    handlers.add(handler);
    this.handlers.set(event, handlers);
  }

  public setStrategy(strategy: LayoutStrategy): void {
    this.strategy = strategy;
  }

  public async layout(graph: RailGraph): Promise<PositionedGraph> {
    this.emit('layout-start', { graph });
    const validation = this.strategy.validate(graph);

    if (!validation.valid) {
      throw new Error(validation.errors.join('; '));
    }

    this.emit('layout-progress', { graph, progress: 0.5 });
    const rawPositions = await this.strategy.computePositions(graph, this.configuration);
    const positions = this.optimizer.optimize(graph, rawPositions, this.configuration);
    const edgeGeometries = this.strategy.computeGeometries(
      graph,
      positions,
      this.configuration,
    );

    this.assertNoOverlap(positions);

    const positionedGraph = buildPositionedGraph(
      graph,
      positions,
      edgeGeometries,
      this.strategy.name,
    );

    this.lastLayout = positionedGraph;
    this.emit('layout-complete', {
      graph,
      positionedGraph,
      progress: 1,
    });

    return positionedGraph;
  }

  public exportLayout(): LayoutData {
    if (!this.lastLayout) {
      throw new Error('No layout has been computed yet.');
    }

    const data: LayoutData = {
      mode: this.lastLayout.layoutMode,
      nodePositions: Object.fromEntries(
        Array.from(this.lastLayout.nodes.values(), (node) => [
          node.id,
          node.coordinate.type === CoordinateSystemType.Screen
            ? { x: node.coordinate.x, y: node.coordinate.y }
            : { x: 0, y: 0 },
        ]),
      ),
      edgeGeometries: Object.fromEntries(
        Array.from(this.lastLayout.edgeGeometries.entries(), ([edgeId, points]) => [
          edgeId,
          points.map((point) => ({ x: point.x, y: point.y })),
        ]),
      ),
      timestamp: new Date().toISOString(),
    };

    this.emit('layout-export', { data });

    return data;
  }

  public importLayout(graph: RailGraph, data: LayoutData): PositionedGraph {
    if (!this.hasMatchingNodeIds(graph, data)) {
      throw new Error('Layout import does not contain any matching node IDs.');
    }

    const positions = new Map<NodeId, ScreenCoordinate>();

    for (const node of graph.nodes.values()) {
      const stored = data.nodePositions[node.id];

      if (stored) {
        positions.set(node.id, {
          type: CoordinateSystemType.Screen,
          x: stored.x,
          y: stored.y,
        });
        continue;
      }

      positions.set(
        node.id,
        node.coordinate.type === CoordinateSystemType.Screen
          ? node.coordinate
          : { type: CoordinateSystemType.Screen, x: 0, y: 0 },
      );
    }

    const geometries = new Map<EdgeId, ReadonlyArray<ScreenCoordinate>>();

    for (const edge of graph.edges.values()) {
      const stored = data.edgeGeometries[edge.id];

      if (stored) {
        geometries.set(
          edge.id,
          stored.map((point) => ({
            type: CoordinateSystemType.Screen,
            x: point.x,
            y: point.y,
          })),
        );
        continue;
      }

      const source = positions.get(edge.source);
      const target = positions.get(edge.target);

      if (source && target) {
        geometries.set(edge.id, [source, target]);
      }
    }

    const positionedGraph = buildPositionedGraph(graph, positions, geometries, data.mode);

    this.lastLayout = positionedGraph;
    this.emit('layout-import', { data, positionedGraph });

    return positionedGraph;
  }

  private hasMatchingNodeIds(graph: RailGraph, data: LayoutData): boolean {
    for (const nodeId of Object.keys(data.nodePositions)) {
      if (graph.nodes.has(nodeId as NodeId)) {
        return true;
      }
    }

    return false;
  }

  private assertNoOverlap(positions: ReadonlyMap<NodeId, ScreenCoordinate>): void {
    const entries = Array.from(positions.entries());

    for (let index = 0; index < entries.length; index += 1) {
      const [, left] = entries[index]!;

      for (let comparisonIndex = index + 1; comparisonIndex < entries.length; comparisonIndex += 1) {
        const [, right] = entries[comparisonIndex]!;
        const distance = Math.hypot(left.x - right.x, left.y - right.y);

        if (distance < this.configuration.overlapThreshold) {
          throw new Error('Layout computation produced overlapping node positions.');
        }
      }
    }
  }

  private emit(event: LayoutEvent, payload: LayoutEventPayload): void {
    const handlers = this.handlers.get(event);

    if (!handlers) {
      return;
    }

    for (const handler of handlers) {
      handler(payload);
    }
  }
}
