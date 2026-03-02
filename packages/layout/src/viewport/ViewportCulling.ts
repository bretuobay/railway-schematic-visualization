import {
  asEdgeId,
  asNodeId,
  type EdgeId,
  type NodeId,
  type ScreenCoordinate,
} from '@rail-schematic-viz/core';

import type { PositionedGraph } from '../layout';
import {
  expandBoundingBox,
  mergeBoundingBoxes,
  RTree,
  type BoundingBox,
} from '../spatial';

import type {
  ViewportController,
  ViewportEventPayload,
} from './ViewportController';

export type ViewportCullingElementKind = 'node' | 'edge';
export type ViewportCullingEvent = 'culling-change';

export interface ViewportCullingConfig {
  readonly bufferMargin?: number;
  readonly activationThreshold?: number;
  readonly maxEntries?: number;
  readonly controller?: Pick<ViewportController, 'getVisibleBounds' | 'on' | 'off'>;
}

export interface CulledElementRef {
  readonly kind: ViewportCullingElementKind;
  readonly id: NodeId | EdgeId;
  readonly bounds: BoundingBox;
}

export interface ViewportCullingResult {
  readonly enabled: boolean;
  readonly bounds: BoundingBox;
  readonly queriedBounds: BoundingBox;
  readonly nodes: ReadonlySet<NodeId>;
  readonly edges: ReadonlySet<EdgeId>;
  readonly elements: ReadonlyArray<CulledElementRef>;
}

export interface ViewportCullingEventPayload {
  readonly result: ViewportCullingResult;
}

type ViewportCullingHandler = (payload: ViewportCullingEventPayload) => void;

const DEFAULT_CONFIG: Required<
  Pick<ViewportCullingConfig, 'bufferMargin' | 'activationThreshold' | 'maxEntries'>
> = {
  bufferMargin: 24,
  activationThreshold: 1000,
  maxEntries: 8,
};

export class ViewportCulling {
  private readonly config: ViewportCullingConfig;
  private readonly index: RTree<CulledElementRef>;
  private readonly handlers = new Map<ViewportCullingEvent, Set<ViewportCullingHandler>>();
  private readonly controller: ViewportCullingConfig['controller'];
  private readonly controllerListener: ((payload: ViewportEventPayload) => void) | undefined;
  private graph: PositionedGraph | undefined;
  private lastResult: ViewportCullingResult = this.createEmptyResult();

  public constructor(config: ViewportCullingConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
    this.index = new RTree<CulledElementRef>({
      maxEntries: this.config.maxEntries ?? DEFAULT_CONFIG.maxEntries,
    });
    this.controller = config.controller;

    if (this.controller) {
      this.controllerListener = (payload) => {
        this.lastResult = this.queryVisible(payload.visibleBounds);
        this.emit('culling-change', { result: this.lastResult });
      };

      this.controller.on('viewport-change', this.controllerListener);
    }
  }

  public destroy(): void {
    if (this.controller && this.controllerListener) {
      this.controller.off('viewport-change', this.controllerListener);
    }
  }

  public on(event: ViewportCullingEvent, handler: ViewportCullingHandler): void {
    const handlers = this.handlers.get(event) ?? new Set<ViewportCullingHandler>();

    handlers.add(handler);
    this.handlers.set(event, handlers);
  }

  public off(event: ViewportCullingEvent, handler: ViewportCullingHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  public buildIndex(graph: PositionedGraph): void {
    this.graph = graph;
    const entries: Array<CulledElementRef> = [];

    for (const node of graph.nodes.values()) {
      if (node.coordinate.type !== 'screen') {
        continue;
      }

      entries.push({
        kind: 'node',
        id: node.id,
        bounds: {
          minX: node.coordinate.x,
          minY: node.coordinate.y,
          maxX: node.coordinate.x,
          maxY: node.coordinate.y,
        },
      });
    }

    for (const edge of graph.edges.values()) {
      const geometry = graph.edgeGeometries.get(edge.id)
        ?? this.fallbackEdgeGeometry(graph, edge.source, edge.target);

      if (!geometry || geometry.length === 0) {
        continue;
      }

      entries.push({
        kind: 'edge',
        id: edge.id,
        bounds: this.computeBounds(geometry),
      });
    }

    this.index.bulkLoad(entries.map((entry) => ({
      bounds: entry.bounds,
      value: entry,
    })));

    if (this.controller) {
      this.lastResult = this.queryVisible(this.controller.getVisibleBounds());
    } else {
      this.lastResult = this.createDefaultResult(graph);
    }
  }

  public queryVisible(bounds: BoundingBox): ViewportCullingResult {
    if (!this.graph) {
      this.lastResult = this.createEmptyResult(bounds);
      return this.lastResult;
    }

    const queriedBounds = expandBoundingBox(
      bounds,
      this.config.bufferMargin ?? DEFAULT_CONFIG.bufferMargin,
    );
    const enabled = this.isEnabledForGraph(this.graph);

    if (!enabled) {
      this.lastResult = this.createDefaultResult(this.graph, bounds, queriedBounds);
      return this.lastResult;
    }

    const matches = this.index.search(queriedBounds);
    const nodes = new Set<NodeId>();
    const edges = new Set<EdgeId>();

    for (const entry of matches) {
      if (entry.kind === 'node') {
        nodes.add(entry.id as NodeId);
      } else {
        edges.add(entry.id as EdgeId);
      }
    }

    this.lastResult = {
      enabled: true,
      bounds,
      queriedBounds,
      nodes,
      edges,
      elements: matches,
    };

    return this.lastResult;
  }

  public getLastResult(): ViewportCullingResult {
    return this.lastResult;
  }

  public getIndexSize(): number {
    return this.index.size;
  }

  private emit(event: ViewportCullingEvent, payload: ViewportCullingEventPayload): void {
    const handlers = this.handlers.get(event);

    if (!handlers) {
      return;
    }

    for (const handler of handlers) {
      handler(payload);
    }
  }

  private isEnabledForGraph(graph: PositionedGraph): boolean {
    const elementCount = graph.nodes.size + graph.edges.size;

    return elementCount > (this.config.activationThreshold ?? DEFAULT_CONFIG.activationThreshold);
  }

  private computeBounds(points: ReadonlyArray<ScreenCoordinate>): BoundingBox {
    return {
      minX: Math.min(...points.map((point) => point.x)),
      minY: Math.min(...points.map((point) => point.y)),
      maxX: Math.max(...points.map((point) => point.x)),
      maxY: Math.max(...points.map((point) => point.y)),
    };
  }

  private fallbackEdgeGeometry(
    graph: PositionedGraph,
    sourceId: NodeId,
    targetId: NodeId,
  ): ReadonlyArray<ScreenCoordinate> | undefined {
    const source = graph.nodes.get(sourceId);
    const target = graph.nodes.get(targetId);

    if (!source || !target) {
      return undefined;
    }

    if (source.coordinate.type !== 'screen' || target.coordinate.type !== 'screen') {
      return undefined;
    }

    return [source.coordinate, target.coordinate];
  }

  private createDefaultResult(
    graph?: PositionedGraph,
    bounds?: BoundingBox,
    queriedBounds?: BoundingBox,
  ): ViewportCullingResult {
    if (!graph) {
      return this.createEmptyResult(bounds);
    }

    const nodes = new Set<NodeId>();
    const edges = new Set<EdgeId>();
    const elements: Array<CulledElementRef> = [];

    for (const node of graph.nodes.values()) {
      nodes.add(node.id);
      if (node.coordinate.type === 'screen') {
        elements.push({
          kind: 'node',
          id: node.id,
          bounds: {
            minX: node.coordinate.x,
            minY: node.coordinate.y,
            maxX: node.coordinate.x,
            maxY: node.coordinate.y,
          },
        });
      }
    }

    for (const edge of graph.edges.values()) {
      edges.add(edge.id);
      const geometry = graph.edgeGeometries.get(edge.id)
        ?? this.fallbackEdgeGeometry(graph, edge.source, edge.target);

      if (!geometry || geometry.length === 0) {
        continue;
      }

      elements.push({
        kind: 'edge',
        id: edge.id,
        bounds: this.computeBounds(geometry),
      });
    }

    const resolvedBounds = bounds ?? graph.bounds;
    const resolvedQuery = queriedBounds ?? resolvedBounds;

    return {
      enabled: false,
      bounds: resolvedBounds,
      queriedBounds: resolvedQuery,
      nodes,
      edges,
      elements,
    };
  }

  private createEmptyResult(bounds?: BoundingBox): ViewportCullingResult {
    const resolvedBounds = bounds ?? {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
    };

    return {
      enabled: false,
      bounds: resolvedBounds,
      queriedBounds: resolvedBounds,
      nodes: new Set<NodeId>(),
      edges: new Set<EdgeId>(),
      elements: [],
    };
  }
}

export function deriveViewportBounds(
  coordinates: ReadonlyArray<ScreenCoordinate>,
): BoundingBox {
  if (coordinates.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
    };
  }

  return mergeBoundingBoxes(
    coordinates.map((coordinate) => ({
      minX: coordinate.x,
      minY: coordinate.y,
      maxX: coordinate.x,
      maxY: coordinate.y,
    })),
  );
}

export function normalizeCullingIds(ids: ReadonlyArray<string>): {
  readonly nodes: ReadonlyArray<NodeId>;
  readonly edges: ReadonlyArray<EdgeId>;
} {
  const nodes: Array<NodeId> = [];
  const edges: Array<EdgeId> = [];

  for (const id of ids) {
    if (id.startsWith('node-')) {
      nodes.push(asNodeId(id));
      continue;
    }

    edges.push(asEdgeId(id));
  }

  return { nodes, edges };
}
