import {
  asEdgeId,
  CoordinateSystemType,
  GraphBuilder,
  type RailGraph,
} from '@rail-schematic-viz/core';

import { buildPositionedGraph, type PositionedGraph } from '../layout';
import type { BoundingBox } from '../spatial';
import type {
  MinimapContainer,
  MinimapKeyboardEventLike,
  MinimapPointerEventLike,
  MinimapWheelEventLike,
} from './Minimap';

type Listener = (event: unknown) => void;

export class MockMinimapContainer implements MinimapContainer {
  public readonly style: Record<string, string> = {};
  private readonly listeners = new Map<string, Set<Listener>>();
  private rect = {
    left: 0,
    top: 0,
    width: 180,
    height: 120,
  };

  public get clientWidth(): number {
    return this.rect.width;
  }

  public get clientHeight(): number {
    return this.rect.height;
  }

  public addEventListener(type: string, listener: Listener): void {
    const listeners = this.listeners.get(type) ?? new Set<Listener>();

    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  public removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }

  public getBoundingClientRect(): {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  } {
    return { ...this.rect };
  }

  public setRect(bounds: {
    readonly left?: number;
    readonly top?: number;
    readonly width?: number;
    readonly height?: number;
  }): void {
    this.rect = {
      ...this.rect,
      ...bounds,
    };
  }

  public dispatch(
    type: string,
    event:
      | MinimapPointerEventLike
      | MinimapWheelEventLike
      | MinimapKeyboardEventLike
      | Record<string, unknown>,
  ): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }

  public listenerCount(type: string): number {
    return this.listeners.get(type)?.size ?? 0;
  }
}

type ViewportChangeHandler = (payload: {
  readonly transform: { readonly x: number; readonly y: number; readonly scale: number };
  readonly previousTransform: { readonly x: number; readonly y: number; readonly scale: number };
  readonly visibleBounds: BoundingBox;
}) => void;

export class MockMinimapViewport {
  private readonly handlers = new Set<ViewportChangeHandler>();
  private transform = {
    x: 0,
    y: 0,
    scale: 2,
  };
  public readonly screenWidth: number;
  public readonly screenHeight: number;
  public readonly panToCalls: Array<{ readonly x: number; readonly y: number }> = [];
  public readonly panByCalls: Array<{ readonly deltaX: number; readonly deltaY: number }> = [];
  public readonly zoomByCalls: Array<{ readonly factor: number }> = [];

  public constructor(config: {
    readonly screenWidth?: number;
    readonly screenHeight?: number;
    readonly initialTransform?: Partial<{ readonly x: number; readonly y: number; readonly scale: number }>;
  } = {}) {
    this.screenWidth = config.screenWidth ?? 200;
    this.screenHeight = config.screenHeight ?? 100;
    this.transform = {
      x: config.initialTransform?.x ?? 0,
      y: config.initialTransform?.y ?? 0,
      scale: config.initialTransform?.scale ?? 2,
    };
  }

  public on(event: 'viewport-change', handler: ViewportChangeHandler): void {
    if (event === 'viewport-change') {
      this.handlers.add(handler);
    }
  }

  public off(event: 'viewport-change', handler: ViewportChangeHandler): void {
    if (event === 'viewport-change') {
      this.handlers.delete(handler);
    }
  }

  public getTransform(): { readonly x: number; readonly y: number; readonly scale: number } {
    return { ...this.transform };
  }

  public getVisibleBounds(): BoundingBox {
    return {
      minX: (0 - this.transform.x) / this.transform.scale,
      minY: (0 - this.transform.y) / this.transform.scale,
      maxX: (this.screenWidth - this.transform.x) / this.transform.scale,
      maxY: (this.screenHeight - this.transform.y) / this.transform.scale,
    };
  }

  public async panTo(
    x: number,
    y: number,
  ): Promise<{ readonly x: number; readonly y: number; readonly scale: number }> {
    const previousTransform = this.getTransform();

    this.transform = {
      ...this.transform,
      x,
      y,
    };
    this.panToCalls.push({ x, y });
    this.emit(previousTransform);

    return this.getTransform();
  }

  public async panBy(
    deltaX: number,
    deltaY: number,
  ): Promise<{ readonly x: number; readonly y: number; readonly scale: number }> {
    this.panByCalls.push({ deltaX, deltaY });

    return this.panTo(this.transform.x + deltaX, this.transform.y + deltaY);
  }

  public async zoomBy(
    factor: number,
  ): Promise<{ readonly x: number; readonly y: number; readonly scale: number }> {
    const previousTransform = this.getTransform();

    this.transform = {
      ...this.transform,
      scale: this.transform.scale * factor,
    };
    this.zoomByCalls.push({ factor });
    this.emit(previousTransform);

    return this.getTransform();
  }

  public emitViewportChange(): void {
    this.emit(this.getTransform());
  }

  private emit(previousTransform: {
    readonly x: number;
    readonly y: number;
    readonly scale: number;
  }): void {
    const payload = {
      transform: this.getTransform(),
      previousTransform,
      visibleBounds: this.getVisibleBounds(),
    };

    for (const handler of this.handlers) {
      handler(payload);
    }
  }
}

export function buildMinimapGraph(): PositionedGraph {
  const graph = buildTestGraph();
  const nodePositions = new Map([
    ['alpha', { type: CoordinateSystemType.Screen, x: 0, y: 0 } as const],
    ['beta', { type: CoordinateSystemType.Screen, x: 100, y: 0 } as const],
    ['gamma', { type: CoordinateSystemType.Screen, x: 100, y: 100 } as const],
    ['delta', { type: CoordinateSystemType.Screen, x: 0, y: 100 } as const],
  ]);
  const edgeGeometries = new Map([
    [
      asEdgeId('alpha-beta'),
      [
        { type: CoordinateSystemType.Screen, x: 0, y: 0 } as const,
        { type: CoordinateSystemType.Screen, x: 100, y: 0 } as const,
      ],
    ],
    [
      asEdgeId('beta-gamma'),
      [
        { type: CoordinateSystemType.Screen, x: 100, y: 0 } as const,
        { type: CoordinateSystemType.Screen, x: 100, y: 100 } as const,
      ],
    ],
    [
      asEdgeId('gamma-delta'),
      [
        { type: CoordinateSystemType.Screen, x: 100, y: 100 } as const,
        { type: CoordinateSystemType.Screen, x: 0, y: 100 } as const,
      ],
    ],
  ]);

  return buildPositionedGraph(graph, nodePositions, edgeGeometries, 'test-minimap');
}

function buildTestGraph(): RailGraph {
  const builder = new GraphBuilder();

  builder.addNode({
    id: 'alpha',
    name: 'Alpha',
    type: 'station',
    coordinate: { type: CoordinateSystemType.Screen, x: 0, y: 0 },
  });
  builder.addNode({
    id: 'beta',
    name: 'Beta',
    type: 'station',
    coordinate: { type: CoordinateSystemType.Screen, x: 100, y: 0 },
  });
  builder.addNode({
    id: 'gamma',
    name: 'Gamma',
    type: 'station',
    coordinate: { type: CoordinateSystemType.Screen, x: 100, y: 100 },
  });
  builder.addNode({
    id: 'delta',
    name: 'Delta',
    type: 'station',
    coordinate: { type: CoordinateSystemType.Screen, x: 0, y: 100 },
  });

  builder.addEdge({
    id: 'alpha-beta',
    source: 'alpha',
    target: 'beta',
    length: 100,
    geometry: { type: 'straight' },
  });
  builder.addEdge({
    id: 'beta-gamma',
    source: 'beta',
    target: 'gamma',
    length: 100,
    geometry: { type: 'straight' },
  });
  builder.addEdge({
    id: 'gamma-delta',
    source: 'gamma',
    target: 'delta',
    length: 100,
    geometry: { type: 'straight' },
  });

  return builder.build();
}
