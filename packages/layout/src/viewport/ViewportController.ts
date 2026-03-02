import type { BoundingBox } from '../spatial';

export interface ViewportPoint {
  readonly x: number;
  readonly y: number;
}

export interface ViewportTransform {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

export interface ViewportHost {
  readonly clientWidth?: number;
  readonly clientHeight?: number;
  readonly viewBox?: {
    readonly baseVal?: {
      readonly width: number;
      readonly height: number;
    };
  };
  addEventListener?(
    type: string,
    listener: (event: unknown) => void,
    options?: AddEventListenerOptions | boolean,
  ): void;
  removeEventListener?(
    type: string,
    listener: (event: unknown) => void,
    options?: EventListenerOptions | boolean,
  ): void;
  getBoundingClientRect?(): {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  };
}

export interface ViewportControllerConfig {
  readonly width?: number;
  readonly height?: number;
  readonly minScale?: number;
  readonly maxScale?: number;
  readonly panExtent?: BoundingBox;
  readonly animationFrameMs?: number;
  readonly initialTransform?: Partial<ViewportTransform>;
}

export interface ViewportTransitionOptions {
  readonly animated?: boolean;
  readonly duration?: number;
}

export interface ViewportZoomOptions extends ViewportTransitionOptions {
  readonly point?: ViewportPoint;
}

export type ViewportEvent = 'pan' | 'zoom' | 'transform' | 'viewport-change';

export interface ViewportEventPayload {
  readonly transform: ViewportTransform;
  readonly previousTransform: ViewportTransform;
  readonly visibleBounds: BoundingBox;
}

type ViewportEventHandler = (payload: ViewportEventPayload) => void;
type ViewportChangeKind = 'pan' | 'zoom' | 'transform';

const DEFAULT_CONFIG: Required<
  Pick<ViewportControllerConfig, 'minScale' | 'maxScale' | 'animationFrameMs'>
> = {
  minScale: 0.25,
  maxScale: 8,
  animationFrameMs: 16,
};

interface DragState {
  readonly x: number;
  readonly y: number;
}

export class ViewportController {
  private readonly host: ViewportHost;
  private readonly config: ViewportControllerConfig;
  private readonly handlers = new Map<ViewportEvent, Set<ViewportEventHandler>>();
  private readonly wheelListener: (event: unknown) => void;
  private readonly pointerDownListener: (event: unknown) => void;
  private readonly pointerMoveListener: (event: unknown) => void;
  private readonly pointerUpListener: (event: unknown) => void;
  private transform: ViewportTransform;
  private dragState: DragState | undefined;

  public constructor(host: SVGSVGElement | ViewportHost, config: ViewportControllerConfig = {}) {
    this.host = host;
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
    this.transform = {
      x: config.initialTransform?.x ?? 0,
      y: config.initialTransform?.y ?? 0,
      scale: this.clampScale(config.initialTransform?.scale ?? 1),
    };
    this.transform = this.clampTransform(this.transform);

    this.wheelListener = (event) => {
      const wheelEvent = event as {
        readonly deltaY?: number;
        readonly offsetX?: number;
        readonly offsetY?: number;
        readonly clientX?: number;
        readonly clientY?: number;
        preventDefault?: () => void;
      };
      const factor = (wheelEvent.deltaY ?? 0) <= 0 ? 1.1 : 1 / 1.1;
      const point = this.resolveEventPoint(wheelEvent);

      wheelEvent.preventDefault?.();
      void this.zoomBy(factor, { point });
    };
    this.pointerDownListener = (event) => {
      this.dragState = this.resolveEventPoint(event);
    };
    this.pointerMoveListener = (event) => {
      if (!this.dragState) {
        return;
      }

      const point = this.resolveEventPoint(event);
      const deltaX = point.x - this.dragState.x;
      const deltaY = point.y - this.dragState.y;

      this.dragState = point;
      void this.panBy(deltaX, deltaY);
    };
    this.pointerUpListener = () => {
      this.dragState = undefined;
    };

    this.attachInteractions();
  }

  public on(event: ViewportEvent, handler: ViewportEventHandler): void {
    const handlers = this.handlers.get(event) ?? new Set<ViewportEventHandler>();

    handlers.add(handler);
    this.handlers.set(event, handlers);
  }

  public off(event: ViewportEvent, handler: ViewportEventHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  public destroy(): void {
    this.host.removeEventListener?.('wheel', this.wheelListener);
    this.host.removeEventListener?.('pointerdown', this.pointerDownListener);
    this.host.removeEventListener?.('pointermove', this.pointerMoveListener);
    this.host.removeEventListener?.('pointerup', this.pointerUpListener);
    this.host.removeEventListener?.('pointercancel', this.pointerUpListener);
  }

  public getTransform(): ViewportTransform {
    return { ...this.transform };
  }

  public getVisibleBounds(): BoundingBox {
    const { width, height } = this.getViewportSize();
    const scale = this.transform.scale || 1;

    return {
      minX: (0 - this.transform.x) / scale,
      minY: (0 - this.transform.y) / scale,
      maxX: (width - this.transform.x) / scale,
      maxY: (height - this.transform.y) / scale,
    };
  }

  public async panTo(
    x: number,
    y: number,
    options: ViewportTransitionOptions = {},
  ): Promise<ViewportTransform> {
    return this.transitionTo(
      {
        x,
        y,
        scale: this.transform.scale,
      },
      'pan',
      options,
    );
  }

  public async panBy(
    deltaX: number,
    deltaY: number,
    options: ViewportTransitionOptions = {},
  ): Promise<ViewportTransform> {
    return this.panTo(
      this.transform.x + deltaX,
      this.transform.y + deltaY,
      options,
    );
  }

  public async zoomTo(
    scale: number,
    options: ViewportZoomOptions = {},
  ): Promise<ViewportTransform> {
    if (options.point) {
      return this.zoomToPoint(options.point, scale, options);
    }

    const { width, height } = this.getViewportSize();

    return this.zoomToPoint(
      { x: width / 2, y: height / 2 },
      scale,
      options,
    );
  }

  public async zoomBy(
    factor: number,
    options: ViewportZoomOptions = {},
  ): Promise<ViewportTransform> {
    const resolvedFactor = Number.isFinite(factor) && factor > 0 ? factor : 1;

    return this.zoomTo(this.transform.scale * resolvedFactor, options);
  }

  public async zoomToPoint(
    point: ViewportPoint,
    scale: number,
    options: ViewportTransitionOptions = {},
  ): Promise<ViewportTransform> {
    const nextScale = this.clampScale(scale);
    const worldX = (point.x - this.transform.x) / this.transform.scale;
    const worldY = (point.y - this.transform.y) / this.transform.scale;

    return this.transitionTo(
      {
        x: point.x - worldX * nextScale,
        y: point.y - worldY * nextScale,
        scale: nextScale,
      },
      'zoom',
      options,
    );
  }

  private attachInteractions(): void {
    this.host.addEventListener?.('wheel', this.wheelListener, { passive: false });
    this.host.addEventListener?.('pointerdown', this.pointerDownListener);
    this.host.addEventListener?.('pointermove', this.pointerMoveListener);
    this.host.addEventListener?.('pointerup', this.pointerUpListener);
    this.host.addEventListener?.('pointercancel', this.pointerUpListener);
  }

  private async transitionTo(
    target: ViewportTransform,
    kind: ViewportChangeKind,
    options: ViewportTransitionOptions,
  ): Promise<ViewportTransform> {
    const clampedTarget = this.clampTransform(target);
    const start = this.transform;

    if (this.transformsEqual(start, clampedTarget)) {
      return this.getTransform();
    }

    const steps = this.resolveTransitionSteps(options);

    for (let index = 1; index <= steps; index += 1) {
      const progress = index / steps;
      const nextTransform =
        index === steps
          ? clampedTarget
          : {
              x: start.x + (clampedTarget.x - start.x) * progress,
              y: start.y + (clampedTarget.y - start.y) * progress,
              scale: start.scale + (clampedTarget.scale - start.scale) * progress,
            };
      const previousTransform = this.transform;

      this.transform = nextTransform;
      this.emit(kind, previousTransform);
    }

    return this.getTransform();
  }

  private emit(kind: ViewportChangeKind, previousTransform: ViewportTransform): void {
    const payload: ViewportEventPayload = {
      transform: this.getTransform(),
      previousTransform,
      visibleBounds: this.getVisibleBounds(),
    };

    if (kind === 'pan') {
      this.dispatch('pan', payload);
    }

    if (kind === 'zoom') {
      this.dispatch('zoom', payload);
    }

    this.dispatch('transform', payload);
    this.dispatch('viewport-change', payload);
  }

  private dispatch(event: ViewportEvent, payload: ViewportEventPayload): void {
    const handlers = this.handlers.get(event);

    if (!handlers) {
      return;
    }

    for (const handler of handlers) {
      handler(payload);
    }
  }

  private resolveTransitionSteps(options: ViewportTransitionOptions): number {
    if (!options.animated) {
      return 1;
    }

    const duration = options.duration ?? this.config.animationFrameMs ?? DEFAULT_CONFIG.animationFrameMs;
    const frameMs = this.config.animationFrameMs ?? DEFAULT_CONFIG.animationFrameMs;

    return Math.max(2, Math.ceil(duration / Math.max(1, frameMs)));
  }

  private clampTransform(transform: ViewportTransform): ViewportTransform {
    return {
      x: this.clampPan('x', transform.x),
      y: this.clampPan('y', transform.y),
      scale: this.clampScale(transform.scale),
    };
  }

  private clampScale(scale: number): number {
    const minScale = this.config.minScale ?? DEFAULT_CONFIG.minScale;
    const maxScale = this.config.maxScale ?? DEFAULT_CONFIG.maxScale;

    return Math.min(maxScale, Math.max(minScale, scale));
  }

  private clampPan(axis: 'x' | 'y', value: number): number {
    if (!this.config.panExtent) {
      return value;
    }

    if (axis === 'x') {
      return Math.min(this.config.panExtent.maxX, Math.max(this.config.panExtent.minX, value));
    }

    return Math.min(this.config.panExtent.maxY, Math.max(this.config.panExtent.minY, value));
  }

  private getViewportSize(): { width: number; height: number } {
    const width = this.config.width
      ?? this.host.viewBox?.baseVal?.width
      ?? this.host.clientWidth
      ?? this.host.getBoundingClientRect?.().width
      ?? 1;
    const height = this.config.height
      ?? this.host.viewBox?.baseVal?.height
      ?? this.host.clientHeight
      ?? this.host.getBoundingClientRect?.().height
      ?? 1;

    return {
      width: Math.max(1, width),
      height: Math.max(1, height),
    };
  }

  private resolveEventPoint(event: unknown): ViewportPoint {
    const pointerEvent = event as {
      readonly offsetX?: number;
      readonly offsetY?: number;
      readonly clientX?: number;
      readonly clientY?: number;
    };

    if (
      typeof pointerEvent.offsetX === 'number' &&
      typeof pointerEvent.offsetY === 'number'
    ) {
      return {
        x: pointerEvent.offsetX,
        y: pointerEvent.offsetY,
      };
    }

    const rect = this.host.getBoundingClientRect?.() ?? {
      left: 0,
      top: 0,
      width: this.getViewportSize().width,
      height: this.getViewportSize().height,
    };

    return {
      x: (pointerEvent.clientX ?? 0) - rect.left,
      y: (pointerEvent.clientY ?? 0) - rect.top,
    };
  }

  private transformsEqual(left: ViewportTransform, right: ViewportTransform): boolean {
    return (
      left.x === right.x &&
      left.y === right.y &&
      left.scale === right.scale
    );
  }
}
