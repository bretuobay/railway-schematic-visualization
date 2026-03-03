import type { EventManager } from './EventManager';

export interface TouchPointLike {
  readonly identifier: number;
  readonly clientX: number;
  readonly clientY: number;
}

export interface TouchEventLike {
  readonly touches?: ReadonlyArray<TouchPointLike>;
  readonly changedTouches?: ReadonlyArray<TouchPointLike>;
  readonly target?: unknown;
  preventDefault?: () => void;
}

export interface TouchGesturesRoot {
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
}

export interface TouchViewportAdapter {
  panBy(deltaX: number, deltaY: number): Promise<unknown> | unknown;
  zoomToPoint(
    point: { readonly x: number; readonly y: number },
    scale: number,
  ): Promise<unknown> | unknown;
  getTransform(): { readonly scale: number };
}

export interface TouchGesturesConfig {
  readonly root?: TouchGesturesRoot;
  readonly viewportController?: TouchViewportAdapter;
  readonly eventManager?: Pick<EventManager, 'emit'>;
  readonly pinchSensitivity?: number;
  readonly panSensitivity?: number;
  readonly tapMaxDurationMs?: number;
  readonly longPressDurationMs?: number;
  readonly movementThresholdPx?: number;
}

export interface TouchGestureState {
  readonly activeTouchCount: number;
  readonly longPressTriggered: boolean;
  readonly initialScale: number | null;
}

const DEFAULT_CONFIG: Required<
  Pick<
    TouchGesturesConfig,
    | 'pinchSensitivity'
    | 'panSensitivity'
    | 'tapMaxDurationMs'
    | 'longPressDurationMs'
    | 'movementThresholdPx'
  >
> = {
  pinchSensitivity: 1,
  panSensitivity: 1,
  tapMaxDurationMs: 250,
  longPressDurationMs: 500,
  movementThresholdPx: 8,
};

export class TouchGestures {
  private readonly config: TouchGesturesConfig;
  private readonly rootListeners = new Map<string, (event: unknown) => void>();
  private readonly activeTouches = new Map<number, TouchPointLike>();
  private gestureStartTimestamp: number | null = null;
  private initialDistance: number | null = null;
  private initialScale: number | null = null;
  private tapCandidate:
    | {
        readonly id: number;
        readonly x: number;
        readonly y: number;
      }
    | null = null;
  private longPressTimer: ReturnType<typeof setTimeout> | undefined;
  private longPressTriggered = false;

  public constructor(config: TouchGesturesConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    if (config.root) {
      this.attachRootListeners(config.root);
    }
  }

  public destroy(): void {
    this.clearLongPressTimer();

    if (!this.config.root) {
      return;
    }

    for (const [eventType, listener] of this.rootListeners) {
      this.config.root.removeEventListener?.(eventType, listener);
    }
  }

  public getState(): TouchGestureState {
    return {
      activeTouchCount: this.activeTouches.size,
      longPressTriggered: this.longPressTriggered,
      initialScale: this.initialScale,
    };
  }

  public async handleTouchStart(event: TouchEventLike): Promise<void> {
    event.preventDefault?.();
    const changedTouches = event.changedTouches ?? [];

    for (const touch of changedTouches) {
      this.activeTouches.set(touch.identifier, touch);
    }

    this.gestureStartTimestamp ??= Date.now();

    if (this.activeTouches.size === 1) {
      const [touch] = Array.from(this.activeTouches.values());

      if (!touch) {
        return;
      }

      this.tapCandidate = {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
      };
      this.longPressTriggered = false;
      this.scheduleLongPress(touch, event);
      return;
    }

    this.clearLongPressTimer();

    if (this.activeTouches.size >= 2) {
      const touches = Array.from(this.activeTouches.values()).slice(0, 2);

      this.tapCandidate = null;
      this.initialDistance = distance(touches[0]!, touches[1]!);
      this.initialScale = this.config.viewportController?.getTransform().scale ?? 1;
    }
  }

  public async handleTouchMove(event: TouchEventLike): Promise<void> {
    event.preventDefault?.();
    const changedTouches = event.changedTouches ?? [];
    const previousTouches = new Map(this.activeTouches);

    for (const touch of changedTouches) {
      if (this.activeTouches.has(touch.identifier)) {
        this.activeTouches.set(touch.identifier, touch);
      }
    }

    if (this.activeTouches.size === 1 && this.tapCandidate) {
      const touch = this.activeTouches.get(this.tapCandidate.id);

      if (!touch) {
        return;
      }

      if (
        distanceFromPoint(touch, this.tapCandidate) >
        (this.config.movementThresholdPx ?? DEFAULT_CONFIG.movementThresholdPx)
      ) {
        this.tapCandidate = null;
        this.clearLongPressTimer();
      }

      return;
    }

    if (this.activeTouches.size < 2 || !this.config.viewportController) {
      return;
    }

    const touches = Array.from(this.activeTouches.values()).slice(0, 2);
    const currentCenter = midpoint(touches[0]!, touches[1]!);
    const currentDistance = distance(touches[0]!, touches[1]!);
    const baseDistance = this.initialDistance ?? currentDistance;
    const baseScale = this.initialScale ?? this.config.viewportController.getTransform().scale;
    const rawScale = baseDistance === 0 ? 1 : currentDistance / baseDistance;
    const adjustedScale =
      baseScale * (1 + (rawScale - 1) * (this.config.pinchSensitivity ?? DEFAULT_CONFIG.pinchSensitivity));
    const sharedPanDelta = getSharedPanDelta(touches, previousTouches);
    const deltaX = sharedPanDelta.x * (this.config.panSensitivity ?? DEFAULT_CONFIG.panSensitivity);
    const deltaY = sharedPanDelta.y * (this.config.panSensitivity ?? DEFAULT_CONFIG.panSensitivity);

    await this.config.viewportController.zoomToPoint(currentCenter, adjustedScale);
    await this.config.viewportController.panBy(deltaX, deltaY);
  }

  public async handleTouchEnd(event: TouchEventLike): Promise<void> {
    event.preventDefault?.();
    const changedTouches = event.changedTouches ?? [];

    for (const touch of changedTouches) {
      this.activeTouches.delete(touch.identifier);
    }

    if (this.activeTouches.size === 0) {
      const endedTouch = changedTouches[0];
      const duration =
        this.gestureStartTimestamp === null ? 0 : Date.now() - this.gestureStartTimestamp;

      if (
        endedTouch &&
        this.tapCandidate &&
        !this.longPressTriggered &&
        duration <= (this.config.tapMaxDurationMs ?? DEFAULT_CONFIG.tapMaxDurationMs) &&
        distanceFromPoint(endedTouch, this.tapCandidate)
          <= (this.config.movementThresholdPx ?? DEFAULT_CONFIG.movementThresholdPx)
      ) {
        this.config.eventManager?.emit('element-click', {
          coordinates: {
            x: endedTouch.clientX,
            y: endedTouch.clientY,
          },
          originalEvent: event,
        });
      }

      this.resetGestureState();
      return;
    }

    if (this.activeTouches.size === 1) {
      const [remainingTouch] = Array.from(this.activeTouches.values());

      if (remainingTouch) {
        this.tapCandidate = {
          id: remainingTouch.identifier,
          x: remainingTouch.clientX,
          y: remainingTouch.clientY,
        };
        this.gestureStartTimestamp = Date.now();
        this.scheduleLongPress(remainingTouch, event);
      }
    }
  }

  public async handleTouchCancel(event: TouchEventLike): Promise<void> {
    event.preventDefault?.();
    this.resetGestureState();
  }

  private attachRootListeners(root: TouchGesturesRoot): void {
    const listeners: ReadonlyArray<readonly [string, (event: TouchEventLike) => Promise<void>]> = [
      ['touchstart', (event) => this.handleTouchStart(event)],
      ['touchmove', (event) => this.handleTouchMove(event)],
      ['touchend', (event) => this.handleTouchEnd(event)],
      ['touchcancel', (event) => this.handleTouchCancel(event)],
    ];

    for (const [eventType, handler] of listeners) {
      const listener = (event: unknown) => {
        void handler(event as TouchEventLike);
      };

      this.rootListeners.set(eventType, listener);
      root.addEventListener?.(eventType, listener, { passive: false });
    }
  }

  private scheduleLongPress(touch: TouchPointLike, event: TouchEventLike): void {
    this.clearLongPressTimer();

    this.longPressTimer = setTimeout(() => {
      const activeTouch = this.activeTouches.get(touch.identifier);

      if (!activeTouch || this.activeTouches.size !== 1 || !this.tapCandidate) {
        return;
      }

      if (
        distanceFromPoint(activeTouch, this.tapCandidate)
        > (this.config.movementThresholdPx ?? DEFAULT_CONFIG.movementThresholdPx)
      ) {
        return;
      }

      this.longPressTriggered = true;
      this.config.eventManager?.emit('element-contextmenu', {
        coordinates: {
          x: activeTouch.clientX,
          y: activeTouch.clientY,
        },
        originalEvent: event,
      });
    }, this.config.longPressDurationMs ?? DEFAULT_CONFIG.longPressDurationMs);
  }

  private clearLongPressTimer(): void {
    if (!this.longPressTimer) {
      return;
    }

    clearTimeout(this.longPressTimer);
    this.longPressTimer = undefined;
  }

  private resetGestureState(): void {
    this.clearLongPressTimer();
    this.activeTouches.clear();
    this.gestureStartTimestamp = null;
    this.initialDistance = null;
    this.initialScale = null;
    this.tapCandidate = null;
    this.longPressTriggered = false;
  }
}

function distance(left: TouchPointLike, right: TouchPointLike): number {
  return Math.hypot(right.clientX - left.clientX, right.clientY - left.clientY);
}

function midpoint(
  left: TouchPointLike,
  right: TouchPointLike,
): { readonly x: number; readonly y: number } {
  return {
    x: (left.clientX + right.clientX) / 2,
    y: (left.clientY + right.clientY) / 2,
  };
}

function distanceFromPoint(
  touch: TouchPointLike,
  point: { readonly x: number; readonly y: number },
): number {
  return Math.hypot(touch.clientX - point.x, touch.clientY - point.y);
}

function getSharedPanDelta(
  touches: ReadonlyArray<TouchPointLike>,
  previousTouches: ReadonlyMap<number, TouchPointLike>,
): { readonly x: number; readonly y: number } {
  const deltaX = getSharedAxisDelta(
    touches.map((touch) => touch.clientX - (previousTouches.get(touch.identifier)?.clientX ?? touch.clientX)),
  );
  const deltaY = getSharedAxisDelta(
    touches.map((touch) => touch.clientY - (previousTouches.get(touch.identifier)?.clientY ?? touch.clientY)),
  );

  return {
    x: deltaX,
    y: deltaY,
  };
}

function getSharedAxisDelta(deltas: ReadonlyArray<number>): number {
  if (deltas.length === 0) {
    return 0;
  }

  const isPositive = deltas.every((delta) => delta >= 0);
  const isNegative = deltas.every((delta) => delta <= 0);

  if (!isPositive && !isNegative) {
    return 0;
  }

  const sign = isNegative ? -1 : 1;

  return sign * Math.min(...deltas.map((delta) => Math.abs(delta)));
}
