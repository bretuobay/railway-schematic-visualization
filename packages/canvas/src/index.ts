import {
  CoordinateSystemType,
  SVGRenderer as CoreSVGRenderer,
  projectWebMercator,
  type CoordinateBridge,
  type Coordinate,
  type RailGraph,
  type ScreenCoordinate,
  type StylingConfiguration,
} from '@rail-schematic-viz/core';

export interface HeatmapPoint {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly value: number;
  readonly radius?: number;
}

export interface CanvasContextLike {
  clearRect(x: number, y: number, width: number, height: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
  ): void;
  fill(): void;
  stroke(): void;
  closePath?(): void;
  setStrokeStyle?(value: string): void;
  setFillStyle?(value: string): void;
  setLineWidth?(value: number): void;
  toDataURL?(type?: string): string;
}

export interface CanvasViewBox {
  readonly minX: number;
  readonly minY: number;
  readonly width: number;
  readonly height: number;
}

export interface CanvasRenderHit {
  readonly id: string;
  readonly kind: 'edge' | 'heatmap' | 'node';
  readonly distance: number;
}

export interface CanvasRenderCommand {
  readonly kind: 'clear' | 'edge' | 'heatmap' | 'node';
  readonly id: string;
  readonly points?: ReadonlyArray<ScreenCoordinate>;
  readonly center?: ScreenCoordinate;
  readonly radius?: number;
  readonly color?: string;
  readonly width?: number;
  readonly opacity?: number;
}

export interface CanvasRenderSnapshot {
  readonly commands: ReadonlyArray<CanvasRenderCommand>;
  readonly heatmapCount: number;
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly viewBox: CanvasViewBox;
  readonly width: number;
  readonly height: number;
}

export interface CanvasRenderOptions {
  readonly context?: CanvasContextLike;
  readonly width?: number;
  readonly height?: number;
  readonly includeBaseGraph?: boolean;
  readonly coordinateBridge?: CoordinateBridge;
  readonly heatmapPoints?: ReadonlyArray<HeatmapPoint>;
  readonly styling?: Partial<StylingConfiguration>;
}

export interface HybridRenderOptions extends CanvasRenderOptions {
  readonly denseLayerThreshold?: number;
  readonly renderInteractiveAsSVG?: boolean;
}

export interface HybridRenderResult {
  readonly svgLayer?: string;
  readonly canvasLayer: CanvasRenderSnapshot;
  readonly usedCanvasForDenseLayers: boolean;
}

export interface CanvasPackageMetadata {
  readonly packageName: '@rail-schematic-viz/canvas';
  readonly supportsHybridRendering: true;
}

const DEFAULT_STYLING: StylingConfiguration = {
  signal: {
    fillColor: '#dc2626',
    size: 8,
  },
  station: {
    fillColor: '#ffffff',
    radius: 6,
    strokeColor: '#0f172a',
  },
  switch: {
    scaleFactor: 1,
  },
  track: {
    fillColor: '#cbd5e1',
    strokeColor: '#1f2937',
    strokeWidth: 4,
  },
};

export const PACKAGE_METADATA = {
  packageName: '@rail-schematic-viz/canvas',
  supportsHybridRendering: true,
} as const satisfies CanvasPackageMetadata;

export function getPackageMetadata(): CanvasPackageMetadata {
  return PACKAGE_METADATA;
}

export class CanvasRenderer {
  private lastGraph: RailGraph | undefined;
  private lastOptions: CanvasRenderOptions | undefined;
  private lastSnapshot: CanvasRenderSnapshot | undefined;
  private readonly svgRenderer = new CoreSVGRenderer();

  public render(
    graph: RailGraph,
    options: CanvasRenderOptions = {},
  ): CanvasRenderSnapshot {
    const styling = mergeStyling(options.styling);
    const projectedNodes = projectNodes(graph, options.coordinateBridge);
    const viewBox = computeViewBox(projectedNodes);
    const width = Math.max(1, Math.round(options.width ?? viewBox.width));
    const height = Math.max(1, Math.round(options.height ?? viewBox.height));
    const commands: CanvasRenderCommand[] = [
      {
        id: 'canvas-clear',
        kind: 'clear',
      },
    ];

    if (options.context) {
      options.context.clearRect(0, 0, width, height);
    }

    if (options.includeBaseGraph !== false) {
      for (const edge of graph.edges.values()) {
        const start = projectedNodes.get(edge.source);
        const end = projectedNodes.get(edge.target);

        if (!start || !end) {
          continue;
        }

        const points = [start, end];
        commands.push({
          color: styling.track.strokeColor,
          id: edge.id,
          kind: 'edge',
          points,
          width: styling.track.strokeWidth,
        });
        drawEdge(options.context, points, styling);
      }

      for (const node of graph.nodes.values()) {
        const point = projectedNodes.get(node.id);

        if (!point) {
          continue;
        }

        commands.push({
          center: point,
          color:
            node.type === 'signal'
              ? styling.signal.fillColor
              : styling.station.fillColor,
          id: node.id,
          kind: 'node',
          radius:
            node.type === 'signal'
              ? Math.max(2, styling.signal.size / 2)
              : styling.station.radius,
        });
        drawNode(options.context, point, node.type === 'signal', styling);
      }
    }

    for (const point of options.heatmapPoints ?? []) {
      const radius = Math.max(2, point.radius ?? 10);
      const opacity = clamp(point.value, 0, 1);
      const center: ScreenCoordinate = {
        type: CoordinateSystemType.Screen,
        x: point.x,
        y: point.y,
      };

      commands.push({
        center,
        color: heatmapColor(opacity),
        id: point.id,
        kind: 'heatmap',
        opacity,
        radius,
      });
      drawHeatmapPoint(options.context, center, radius, opacity);
    }

    const snapshot: CanvasRenderSnapshot = {
      commands,
      edgeCount: commands.filter((command) => command.kind === 'edge').length,
      heatmapCount: commands.filter((command) => command.kind === 'heatmap').length,
      height,
      nodeCount: commands.filter((command) => command.kind === 'node').length,
      viewBox,
      width,
    };

    this.lastGraph = graph;
    this.lastOptions = { ...options };
    this.lastSnapshot = snapshot;

    return snapshot;
  }

  public clear(
    width?: number,
    height?: number,
    context?: CanvasContextLike,
  ): CanvasRenderSnapshot {
    const resolvedWidth = Math.max(1, Math.round(width ?? this.lastSnapshot?.width ?? 1));
    const resolvedHeight = Math.max(
      1,
      Math.round(height ?? this.lastSnapshot?.height ?? 1),
    );

    context?.clearRect(0, 0, resolvedWidth, resolvedHeight);

    const snapshot: CanvasRenderSnapshot = {
      commands: [
        {
          id: 'canvas-clear',
          kind: 'clear',
        },
      ],
      edgeCount: 0,
      heatmapCount: 0,
      height: resolvedHeight,
      nodeCount: 0,
      viewBox: {
        height: resolvedHeight,
        minX: 0,
        minY: 0,
        width: resolvedWidth,
      },
      width: resolvedWidth,
    };

    this.lastSnapshot = snapshot;

    return snapshot;
  }

  public hitTest(point: { readonly x: number; readonly y: number }): CanvasRenderHit | undefined {
    const snapshot = this.lastSnapshot;

    if (!snapshot) {
      return undefined;
    }

    let bestMatch: CanvasRenderHit | undefined;

    for (const command of snapshot.commands) {
      let distance: number | undefined;

      if (command.kind === 'node' || command.kind === 'heatmap') {
        if (!command.center || command.radius === undefined) {
          continue;
        }

        const deltaX = point.x - command.center.x;
        const deltaY = point.y - command.center.y;
        const centerDistance = Math.sqrt((deltaX ** 2) + (deltaY ** 2));

        if (centerDistance <= command.radius) {
          distance = centerDistance;
        }
      }

      if (command.kind === 'edge' && command.points?.length === 2) {
        const [start, end] = command.points;

        if (!start || !end) {
          continue;
        }

        distance = distanceToSegment(point, start, end);

        if (distance > (command.width ?? 4) + 3) {
          distance = undefined;
        }
      }

      if (distance === undefined) {
        continue;
      }

      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = {
          distance,
          id: command.id,
          kind: command.kind as 'edge' | 'heatmap' | 'node',
        };
        continue;
      }

      if (
        bestMatch
        && distance === bestMatch.distance
        && hitPriority(command.kind) > hitPriority(bestMatch.kind)
      ) {
        bestMatch = {
          distance,
          id: command.id,
          kind: command.kind as 'edge' | 'heatmap' | 'node',
        };
      }
    }

    return bestMatch;
  }

  public exportAsPNG(context?: CanvasContextLike): string {
    if (context?.toDataURL) {
      return context.toDataURL('image/png');
    }

    const payload = JSON.stringify(this.lastSnapshot ?? { commands: [] });

    return `data:image/png;base64,${toBase64(payload)}`;
  }

  public exportAsSVG(
    graph?: RailGraph,
    styling?: Partial<StylingConfiguration>,
  ): string {
    const targetGraph = graph ?? this.lastGraph;

    if (!targetGraph) {
      throw new Error('No graph is available for SVG export.');
    }

    return this.svgRenderer.render(targetGraph, styling ?? this.lastOptions?.styling);
  }

  public getLastSnapshot(): CanvasRenderSnapshot | undefined {
    return this.lastSnapshot
      ? {
          ...this.lastSnapshot,
          commands: [...this.lastSnapshot.commands],
          viewBox: { ...this.lastSnapshot.viewBox },
        }
      : undefined;
  }
}

export class HybridRenderer {
  private readonly canvasRenderer = new CanvasRenderer();
  private lastGraph: RailGraph | undefined;
  private lastOptions: HybridRenderOptions | undefined;

  public render(
    graph: RailGraph,
    options: HybridRenderOptions = {},
  ): HybridRenderResult {
    const threshold = options.denseLayerThreshold ?? 1000;
    const usedCanvasForDenseLayers = (options.heatmapPoints?.length ?? 0) >= threshold
      || (options.heatmapPoints?.length ?? 0) > 0;
    const svgLayer = options.renderInteractiveAsSVG === false
      ? undefined
      : new CoreSVGRenderer().render(graph, options.styling);
    const canvasOptions: CanvasRenderOptions = {
      ...buildCanvasBaseOptions(options),
      ...(svgLayer
        ? { includeBaseGraph: false }
        : (options.includeBaseGraph !== undefined
          ? { includeBaseGraph: options.includeBaseGraph }
          : {})),
    };
    const canvasLayer = this.canvasRenderer.render(graph, canvasOptions);

    this.lastGraph = graph;
    this.lastOptions = { ...options };

    return {
      canvasLayer,
      ...(svgLayer ? { svgLayer } : {}),
      usedCanvasForDenseLayers,
    };
  }

  public updateCanvasLayers(
    heatmapPoints: ReadonlyArray<HeatmapPoint>,
    context?: CanvasContextLike,
  ): CanvasRenderSnapshot {
    if (!this.lastGraph) {
      throw new Error('Hybrid renderer has not rendered a graph yet.');
    }

    const canvasOptions: CanvasRenderOptions = {
      ...buildCanvasBaseOptions(this.lastOptions),
      ...(context ? { context } : {}),
      heatmapPoints,
      ...(this.lastOptions?.renderInteractiveAsSVG
        ? { includeBaseGraph: false }
        : (this.lastOptions?.includeBaseGraph !== undefined
          ? { includeBaseGraph: this.lastOptions.includeBaseGraph }
          : {})),
    };

    return this.canvasRenderer.render(this.lastGraph, canvasOptions);
  }

  public hitTest(point: { readonly x: number; readonly y: number }): CanvasRenderHit | undefined {
    return this.canvasRenderer.hitTest(point);
  }

  public exportCanvasAsPNG(context?: CanvasContextLike): string {
    return this.canvasRenderer.exportAsPNG(context);
  }

  public exportSVG(): string {
    if (!this.lastGraph) {
      throw new Error('Hybrid renderer has not rendered a graph yet.');
    }

    return new CoreSVGRenderer().render(this.lastGraph, this.lastOptions?.styling);
  }
}

function mergeStyling(
  styling?: Partial<StylingConfiguration>,
): StylingConfiguration {
  return {
    signal: {
      ...DEFAULT_STYLING.signal,
      ...styling?.signal,
    },
    station: {
      ...DEFAULT_STYLING.station,
      ...styling?.station,
    },
    switch: {
      ...DEFAULT_STYLING.switch,
      ...styling?.switch,
    },
    track: {
      ...DEFAULT_STYLING.track,
      ...styling?.track,
    },
  };
}

function buildCanvasBaseOptions(
  options: CanvasRenderOptions | HybridRenderOptions | undefined,
): CanvasRenderOptions {
  return {
    ...(options?.context ? { context: options.context } : {}),
    ...(options?.coordinateBridge
      ? { coordinateBridge: options.coordinateBridge }
      : {}),
    ...(options?.heatmapPoints ? { heatmapPoints: options.heatmapPoints } : {}),
    ...(options?.height !== undefined ? { height: options.height } : {}),
    ...(options?.width !== undefined ? { width: options.width } : {}),
    ...(options?.styling ? { styling: options.styling } : {}),
  };
}

function projectNodes(
  graph: RailGraph,
  coordinateBridge?: CoordinateBridge,
): Map<string, ScreenCoordinate> {
  const points = new Map<string, ScreenCoordinate>();

  for (const node of graph.nodes.values()) {
    points.set(node.id, toScreenCoordinate(node.coordinate, coordinateBridge));
  }

  return points;
}

function toScreenCoordinate(
  coordinate: Coordinate,
  coordinateBridge?: CoordinateBridge,
): ScreenCoordinate {
  switch (coordinate.type) {
    case CoordinateSystemType.Screen:
      return coordinate;
    case CoordinateSystemType.Geographic:
      return projectWebMercator(coordinate);
    case CoordinateSystemType.Linear:
      if (!coordinateBridge) {
        throw new Error('CanvasRenderer requires a CoordinateBridge for linear coordinates.');
      }

      return coordinateBridge.projectToScreen(coordinate);
  }
}

function computeViewBox(points: Map<string, ScreenCoordinate>): CanvasViewBox {
  const values = Array.from(points.values());

  if (values.length === 0) {
    return {
      height: 100,
      minX: 0,
      minY: 0,
      width: 100,
    };
  }

  const margin = 20;
  const xs = values.map((point) => point.x);
  const ys = values.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    height: Math.max(1, (maxY - minY) + (margin * 2)),
    minX: minX - margin,
    minY: minY - margin,
    width: Math.max(1, (maxX - minX) + (margin * 2)),
  };
}

function drawEdge(
  context: CanvasContextLike | undefined,
  points: ReadonlyArray<ScreenCoordinate>,
  styling: StylingConfiguration,
): void {
  if (!context || points.length < 2) {
    return;
  }

  context.beginPath();
  context.setStrokeStyle?.(styling.track.strokeColor);
  context.setLineWidth?.(styling.track.strokeWidth);
  context.moveTo(points[0]!.x, points[0]!.y);
  context.lineTo(points[1]!.x, points[1]!.y);
  context.stroke();
  context.closePath?.();
}

function drawNode(
  context: CanvasContextLike | undefined,
  center: ScreenCoordinate,
  isSignal: boolean,
  styling: StylingConfiguration,
): void {
  if (!context) {
    return;
  }

  const radius = isSignal
    ? Math.max(2, styling.signal.size / 2)
    : styling.station.radius;

  context.beginPath();
  context.setFillStyle?.(isSignal ? styling.signal.fillColor : styling.station.fillColor);
  context.arc(center.x, center.y, radius, 0, Math.PI * 2);
  context.fill();
  context.closePath?.();
}

function drawHeatmapPoint(
  context: CanvasContextLike | undefined,
  center: ScreenCoordinate,
  radius: number,
  opacity: number,
): void {
  if (!context) {
    return;
  }

  context.beginPath();
  context.setFillStyle?.(heatmapColor(opacity));
  context.arc(center.x, center.y, radius, 0, Math.PI * 2);
  context.fill();
  context.closePath?.();
}

function heatmapColor(opacity: number): string {
  const intensity = Math.round(clamp(opacity, 0, 1) * 255)
    .toString(16)
    .padStart(2, '0');

  return `#ef4444${intensity}`;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function distanceToSegment(
  point: { readonly x: number; readonly y: number },
  start: ScreenCoordinate,
  end: ScreenCoordinate,
): number {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const lengthSquared = (deltaX ** 2) + (deltaY ** 2);

  if (lengthSquared === 0) {
    return Math.sqrt(((point.x - start.x) ** 2) + ((point.y - start.y) ** 2));
  }

  const factor = clamp(
    (((point.x - start.x) * deltaX) + ((point.y - start.y) * deltaY)) / lengthSquared,
    0,
    1,
  );
  const projectedX = start.x + (factor * deltaX);
  const projectedY = start.y + (factor * deltaY);

  return Math.sqrt(((point.x - projectedX) ** 2) + ((point.y - projectedY) ** 2));
}

function hitPriority(kind: CanvasRenderCommand['kind'] | CanvasRenderHit['kind']): number {
  switch (kind) {
    case 'node':
      return 3;
    case 'heatmap':
      return 2;
    case 'edge':
      return 1;
    default:
      return 0;
  }
}

function toBase64(value: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'utf8').toString('base64');
  }

  if (typeof btoa !== 'undefined') {
    return btoa(value);
  }

  throw new Error('No base64 encoder is available.');
}
