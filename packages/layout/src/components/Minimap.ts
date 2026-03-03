import { CoordinateSystemType } from '@rail-schematic-viz/core';

import type { PositionedGraph } from '../layout';
import type { BoundingBox, BoundingBoxPoint } from '../spatial';
import { containsPoint, createBoundingBox } from '../spatial';
import type {
  ViewportController,
  ViewportEventPayload,
  ViewportTransform,
  ViewportTransitionOptions,
} from '../viewport';

export type MinimapCorner =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export interface MinimapContainer {
  readonly clientWidth?: number;
  readonly clientHeight?: number;
  readonly style?: Record<string, string>;
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

export interface MinimapPointerEventLike {
  readonly clientX?: number;
  readonly clientY?: number;
  preventDefault?: () => void;
  stopPropagation?: () => void;
}

export interface MinimapWheelEventLike extends MinimapPointerEventLike {
  readonly deltaY?: number;
}

export interface MinimapKeyboardEventLike {
  readonly key?: string;
  preventDefault?: () => void;
  stopPropagation?: () => void;
}

export interface MinimapStyle {
  readonly backgroundColor?: string;
  readonly borderColor?: string;
  readonly viewportColor?: string;
  readonly viewportHoverColor?: string;
}

export interface MinimapConfig {
  readonly width?: number;
  readonly height?: number;
  readonly corner?: MinimapCorner;
  readonly visible?: boolean;
  readonly style?: MinimapStyle;
  readonly keyboardStepRatio?: number;
}

export interface MinimapNodePreview {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

export interface MinimapState {
  readonly visible: boolean;
  readonly width: number;
  readonly height: number;
  readonly corner: MinimapCorner;
  readonly graphBounds: BoundingBox;
  readonly viewportIndicator: BoundingBox;
  readonly nodePreviews: ReadonlyArray<MinimapNodePreview>;
  readonly edgeCount: number;
  readonly renderMode: 'low-detail';
  readonly viewportIndicatorHighlighted: boolean;
  readonly dragging: boolean;
  readonly cursor: string;
  readonly styles: Required<MinimapStyle>;
  readonly updatedAt: number;
}

export type MinimapViewportController = Pick<
  ViewportController,
  'getTransform' | 'getVisibleBounds' | 'panTo' | 'panBy' | 'zoomBy' | 'on' | 'off'
>;

const DEFAULT_STYLE: Required<MinimapStyle> = {
  backgroundColor: '#f8fafc',
  borderColor: '#475569',
  viewportColor: '#0f172a',
  viewportHoverColor: '#2563eb',
};

const DEFAULT_CONFIG: Required<
  Pick<MinimapConfig, 'width' | 'height' | 'corner' | 'visible' | 'keyboardStepRatio'>
> = {
  width: 180,
  height: 120,
  corner: 'top-right',
  visible: true,
  keyboardStepRatio: 0.1,
};

interface DragState {
  readonly startPoint: BoundingBoxPoint;
  readonly startCenter: BoundingBoxPoint;
}

export class Minimap {
  private readonly container: MinimapContainer;
  private readonly graph: PositionedGraph;
  private readonly viewportController: MinimapViewportController;
  private readonly config: MinimapConfig;
  private readonly listeners = new Map<string, (event: unknown) => void>();
  private readonly viewportChangeListener: (payload: ViewportEventPayload) => void;
  private state: MinimapState;
  private dragState: DragState | undefined;

  public constructor(
    container: MinimapContainer,
    graph: PositionedGraph,
    viewportController: MinimapViewportController,
    config: MinimapConfig = {},
  ) {
    this.container = container;
    this.graph = graph;
    this.viewportController = viewportController;
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      style: {
        ...DEFAULT_STYLE,
        ...config.style,
      },
    };
    this.state = this.computeState();
    this.viewportChangeListener = () => {
      this.refresh();
    };

    this.attachListeners();
    this.viewportController.on('viewport-change', this.viewportChangeListener);
    this.applyContainerState();
  }

  public destroy(): void {
    for (const [eventType, listener] of this.listeners) {
      this.container.removeEventListener?.(eventType, listener);
    }

    this.viewportController.off('viewport-change', this.viewportChangeListener);
  }

  public getState(): MinimapState {
    return {
      ...this.state,
      graphBounds: { ...this.state.graphBounds },
      viewportIndicator: { ...this.state.viewportIndicator },
      nodePreviews: this.state.nodePreviews.map((node) => ({ ...node })),
      styles: { ...this.state.styles },
    };
  }

  public refresh(): MinimapState {
    this.state = this.computeState({
      viewportIndicatorHighlighted: this.state.viewportIndicatorHighlighted,
      dragging: this.state.dragging,
      cursor: this.state.cursor,
    });
    this.applyContainerState();

    return this.getState();
  }

  public setVisible(visible: boolean): MinimapState {
    this.state = this.computeState({
      visible,
      viewportIndicatorHighlighted: false,
      dragging: false,
      cursor: visible ? 'default' : 'hidden',
    });
    this.dragState = undefined;
    this.applyContainerState();

    return this.getState();
  }

  public async handleClick(event: MinimapPointerEventLike): Promise<void> {
    if (!this.state.visible) {
      return;
    }

    this.preventInteractionEvent(event);
    const point = this.resolvePoint(event);

    await this.centerViewportAt(this.minimapToWorldPoint(point));
    this.refresh();
  }

  public async handlePointerDown(event: MinimapPointerEventLike): Promise<void> {
    if (!this.state.visible) {
      return;
    }

    this.preventInteractionEvent(event);
    const point = this.resolvePoint(event);

    if (!containsPoint(this.state.viewportIndicator, point)) {
      return;
    }

    this.dragState = {
      startPoint: point,
      startCenter: this.currentVisibleCenter(),
    };
    this.state = this.computeState({
      viewportIndicatorHighlighted: true,
      dragging: true,
      cursor: 'grabbing',
    });
    this.applyContainerState();
  }

  public async handlePointerMove(event: MinimapPointerEventLike): Promise<void> {
    if (!this.state.visible) {
      return;
    }

    this.preventInteractionEvent(event);
    const point = this.resolvePoint(event);

    if (!this.dragState) {
      const hovered = containsPoint(this.state.viewportIndicator, point);

      this.state = this.computeState({
        viewportIndicatorHighlighted: hovered,
        dragging: false,
        cursor: hovered ? 'grab' : 'default',
      });
      this.applyContainerState();
      return;
    }

    const graphBounds = createBoundingBox(this.graph.bounds);
    const deltaWorldX = this.minimapDeltaToWorldX(point.x - this.dragState.startPoint.x);
    const deltaWorldY = this.minimapDeltaToWorldY(point.y - this.dragState.startPoint.y);

    await this.centerViewportAt({
      x: clampValue(this.dragState.startCenter.x + deltaWorldX, graphBounds.minX, graphBounds.maxX),
      y: clampValue(this.dragState.startCenter.y + deltaWorldY, graphBounds.minY, graphBounds.maxY),
    });
    this.state = this.computeState({
      viewportIndicatorHighlighted: true,
      dragging: true,
      cursor: 'grabbing',
    });
    this.applyContainerState();
  }

  public async handlePointerUp(event: MinimapPointerEventLike): Promise<void> {
    if (!this.state.visible) {
      return;
    }

    this.preventInteractionEvent(event);

    if (!this.dragState) {
      return;
    }

    this.dragState = undefined;
    this.state = this.computeState({
      viewportIndicatorHighlighted: false,
      dragging: false,
      cursor: 'default',
    });
    this.applyContainerState();
  }

  public handlePointerOver(event: MinimapPointerEventLike): void {
    if (!this.state.visible) {
      return;
    }

    this.preventInteractionEvent(event);
    const hovered = containsPoint(this.state.viewportIndicator, this.resolvePoint(event));

    this.state = this.computeState({
      viewportIndicatorHighlighted: hovered,
      dragging: this.state.dragging,
      cursor: hovered ? (this.state.dragging ? 'grabbing' : 'grab') : 'default',
    });
    this.applyContainerState();
  }

  public handlePointerOut(event: MinimapPointerEventLike): void {
    if (!this.state.visible) {
      return;
    }

    this.preventInteractionEvent(event);

    if (this.state.dragging) {
      return;
    }

    this.state = this.computeState({
      viewportIndicatorHighlighted: false,
      dragging: false,
      cursor: 'default',
    });
    this.applyContainerState();
  }

  public async handleWheel(event: MinimapWheelEventLike): Promise<void> {
    if (!this.state.visible) {
      return;
    }

    this.preventInteractionEvent(event);
    const factor = (event.deltaY ?? 0) <= 0 ? 1.1 : 1 / 1.1;

    await this.viewportController.zoomBy(factor, {});
    this.refresh();
  }

  public async handleKeyDown(event: MinimapKeyboardEventLike): Promise<void> {
    if (!this.state.visible) {
      return;
    }

    const visibleBounds = this.viewportController.getVisibleBounds();
    const center = this.currentVisibleCenter();
    const stepX = (visibleBounds.maxX - visibleBounds.minX) * this.config.keyboardStepRatio!;
    const stepY = (visibleBounds.maxY - visibleBounds.minY) * this.config.keyboardStepRatio!;

    let nextCenter: BoundingBoxPoint | undefined;

    switch (event.key) {
      case 'ArrowLeft':
        nextCenter = { x: center.x - stepX, y: center.y };
        break;
      case 'ArrowRight':
        nextCenter = { x: center.x + stepX, y: center.y };
        break;
      case 'ArrowUp':
        nextCenter = { x: center.x, y: center.y - stepY };
        break;
      case 'ArrowDown':
        nextCenter = { x: center.x, y: center.y + stepY };
        break;
      default:
        return;
    }

    this.preventInteractionEvent(event);
    await this.centerViewportAt(nextCenter);
    this.refresh();
  }

  private applyContainerState(): void {
    const style = this.container.style;

    if (!style) {
      return;
    }

    style.width = `${this.state.width}px`;
    style.height = `${this.state.height}px`;
    style.display = this.state.visible ? 'block' : 'none';
    style.cursor = this.state.visible ? this.state.cursor : 'default';
    style.position = 'absolute';
    style.backgroundColor = this.state.styles.backgroundColor;
    style.border = `1px solid ${this.state.styles.borderColor}`;
    style.inset = cornerToInset(this.state.corner);
    style.outline = this.state.viewportIndicatorHighlighted
      ? `2px solid ${this.state.styles.viewportHoverColor}`
      : `1px solid ${this.state.styles.viewportColor}`;
  }

  private attachListeners(): void {
    const entries: ReadonlyArray<readonly [string, (event: unknown) => void]> = [
      ['click', (event) => void this.handleClick(event as MinimapPointerEventLike)],
      ['pointerdown', (event) => void this.handlePointerDown(event as MinimapPointerEventLike)],
      ['pointermove', (event) => void this.handlePointerMove(event as MinimapPointerEventLike)],
      ['pointerup', (event) => void this.handlePointerUp(event as MinimapPointerEventLike)],
      ['pointerover', (event) => this.handlePointerOver(event as MinimapPointerEventLike)],
      ['pointerout', (event) => this.handlePointerOut(event as MinimapPointerEventLike)],
      ['wheel', (event) => void this.handleWheel(event as MinimapWheelEventLike)],
      ['keydown', (event) => void this.handleKeyDown(event as MinimapKeyboardEventLike)],
    ];

    for (const [eventType, listener] of entries) {
      this.listeners.set(eventType, listener);
      this.container.addEventListener?.(eventType, listener, eventType === 'wheel' ? { passive: false } : undefined);
    }
  }

  private computeState(
    overrides: Partial<
      Pick<MinimapState, 'visible' | 'viewportIndicatorHighlighted' | 'dragging' | 'cursor'>
    > = {},
  ): MinimapState {
    const width = Math.max(1, this.config.width ?? this.container.clientWidth ?? DEFAULT_CONFIG.width);
    const height = Math.max(1, this.config.height ?? this.container.clientHeight ?? DEFAULT_CONFIG.height);
    const visibleBounds = this.viewportController.getVisibleBounds();
    const viewportIndicator = this.toMinimapBounds(visibleBounds, width, height);
    const nodePreviews = Array.from(this.graph.nodes.values(), (node) => {
      if (node.coordinate.type === CoordinateSystemType.Screen) {
        const point = this.worldToMinimapPoint(
          { x: node.coordinate.x, y: node.coordinate.y },
          width,
          height,
        );

        return {
          id: node.id,
          x: point.x,
          y: point.y,
        };
      }

      const point = this.worldToMinimapPoint({ x: 0, y: 0 }, width, height);

      return {
        id: node.id,
        x: point.x,
        y: point.y,
      };
    });

    return {
      visible: overrides.visible ?? this.state?.visible ?? this.config.visible!,
      width,
      height,
      corner: this.config.corner!,
      graphBounds: createBoundingBox(this.graph.bounds),
      viewportIndicator,
      nodePreviews,
      edgeCount: this.graph.edgeGeometries.size || this.graph.edges.size,
      renderMode: 'low-detail',
      viewportIndicatorHighlighted:
        overrides.viewportIndicatorHighlighted ?? this.state?.viewportIndicatorHighlighted ?? false,
      dragging: overrides.dragging ?? this.state?.dragging ?? false,
      cursor: overrides.cursor ?? this.state?.cursor ?? 'default',
      styles: {
        ...DEFAULT_STYLE,
        ...this.config.style,
      },
      updatedAt: Date.now(),
    };
  }

  private resolvePoint(event: MinimapPointerEventLike): BoundingBoxPoint {
    const rect = this.container.getBoundingClientRect?.() ?? {
      left: 0,
      top: 0,
      width: this.state.width,
      height: this.state.height,
    };
    const relativeX = clampValue((event.clientX ?? rect.left) - rect.left, 0, Math.max(1, rect.width));
    const relativeY = clampValue((event.clientY ?? rect.top) - rect.top, 0, Math.max(1, rect.height));

    return {
      x: (relativeX / Math.max(1, rect.width)) * this.state.width,
      y: (relativeY / Math.max(1, rect.height)) * this.state.height,
    };
  }

  private worldToMinimapPoint(
    point: BoundingBoxPoint,
    width: number,
    height: number,
  ): BoundingBoxPoint {
    const bounds = createBoundingBox(this.graph.bounds);
    const spanX = Math.max(1, bounds.maxX - bounds.minX);
    const spanY = Math.max(1, bounds.maxY - bounds.minY);

    return {
      x: clampValue(((point.x - bounds.minX) / spanX) * width, 0, width),
      y: clampValue(((point.y - bounds.minY) / spanY) * height, 0, height),
    };
  }

  private minimapToWorldPoint(point: BoundingBoxPoint): BoundingBoxPoint {
    const bounds = createBoundingBox(this.graph.bounds);
    const spanX = Math.max(1, bounds.maxX - bounds.minX);
    const spanY = Math.max(1, bounds.maxY - bounds.minY);

    return {
      x: bounds.minX + (point.x / this.state.width) * spanX,
      y: bounds.minY + (point.y / this.state.height) * spanY,
    };
  }

  private minimapDeltaToWorldX(deltaX: number): number {
    const bounds = createBoundingBox(this.graph.bounds);
    const spanX = Math.max(1, bounds.maxX - bounds.minX);

    return (deltaX / this.state.width) * spanX;
  }

  private minimapDeltaToWorldY(deltaY: number): number {
    const bounds = createBoundingBox(this.graph.bounds);
    const spanY = Math.max(1, bounds.maxY - bounds.minY);

    return (deltaY / this.state.height) * spanY;
  }

  private toMinimapBounds(bounds: BoundingBox, width: number, height: number): BoundingBox {
    const topLeft = this.worldToMinimapPoint(
      { x: bounds.minX, y: bounds.minY },
      width,
      height,
    );
    const bottomRight = this.worldToMinimapPoint(
      { x: bounds.maxX, y: bounds.maxY },
      width,
      height,
    );

    return createBoundingBox({
      minX: topLeft.x,
      minY: topLeft.y,
      maxX: bottomRight.x,
      maxY: bottomRight.y,
    });
  }

  private currentVisibleCenter(): BoundingBoxPoint {
    const visibleBounds = this.viewportController.getVisibleBounds();

    return {
      x: (visibleBounds.minX + visibleBounds.maxX) / 2,
      y: (visibleBounds.minY + visibleBounds.maxY) / 2,
    };
  }

  private async centerViewportAt(
    point: BoundingBoxPoint,
    options: ViewportTransitionOptions = {},
  ): Promise<ViewportTransform> {
    const graphBounds = createBoundingBox(this.graph.bounds);
    const visibleBounds = this.viewportController.getVisibleBounds();
    const transform = this.viewportController.getTransform();
    const viewportWidth = (visibleBounds.maxX - visibleBounds.minX) * transform.scale;
    const viewportHeight = (visibleBounds.maxY - visibleBounds.minY) * transform.scale;
    const clampedPoint = {
      x: clampValue(point.x, graphBounds.minX, graphBounds.maxX),
      y: clampValue(point.y, graphBounds.minY, graphBounds.maxY),
    };

    return this.viewportController.panTo(
      viewportWidth / 2 - clampedPoint.x * transform.scale,
      viewportHeight / 2 - clampedPoint.y * transform.scale,
      options,
    );
  }

  private preventInteractionEvent(
    event: Pick<MinimapPointerEventLike, 'preventDefault' | 'stopPropagation'>,
  ): void {
    event.preventDefault?.();
    event.stopPropagation?.();
  }
}

function clampValue(value: number, min: number, max: number): number {
  if (min > max) {
    return value;
  }

  return Math.min(max, Math.max(min, value));
}

function cornerToInset(corner: MinimapCorner): string {
  switch (corner) {
    case 'top-left':
      return '8px auto auto 8px';
    case 'bottom-left':
      return 'auto auto 8px 8px';
    case 'bottom-right':
      return 'auto 8px 8px auto';
    case 'top-right':
    default:
      return '8px 8px auto auto';
  }
}
