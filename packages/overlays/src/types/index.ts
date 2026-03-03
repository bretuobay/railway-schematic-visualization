import type { CoordinateBridge, RailGraph } from '@rail-schematic-viz/core';
import type { EventManager, ViewportController } from '@rail-schematic-viz/layout';

export interface OverlayBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface OverlayDimensions {
  readonly width: number;
  readonly height: number;
}

export interface OverlayTransform {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

export interface OverlayLegendItem {
  readonly label: string;
  readonly color: string;
  readonly shape?: 'line' | 'marker' | 'area' | 'swatch';
  readonly value?: number;
}

export interface OverlayLegend {
  readonly id?: string;
  readonly title: string;
  readonly type: 'continuous' | 'categorical';
  readonly items: ReadonlyArray<OverlayLegendItem>;
  readonly min?: number;
  readonly max?: number;
  readonly unit?: string;
}

export interface OverlayPerformanceMetrics {
  readonly renderCount: number;
  readonly lastRenderDurationMs: number;
  readonly averageRenderDurationMs: number;
  readonly lastElementCount: number;
  readonly culledElementCount?: number;
}

export interface OverlayConfiguration {
  readonly id?: string;
  readonly visible?: boolean;
  readonly zIndex?: number;
  readonly opacity?: number;
  readonly interactive?: boolean;
  readonly animationEnabled?: boolean;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface OverlayContext {
  readonly graph?: RailGraph;
  readonly coordinateBridge?: CoordinateBridge;
  readonly viewportController?: ViewportController;
  readonly eventManager?: EventManager;
  readonly dimensions?: OverlayDimensions;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface RenderContext {
  readonly dimensions: OverlayDimensions;
  readonly timestamp?: number;
  readonly viewportBounds?: OverlayBounds;
  readonly transform?: OverlayTransform;
  readonly surface?: 'svg' | 'canvas' | 'hybrid';
}

export interface OverlayRenderResult {
  readonly elementCount: number;
  readonly durationMs: number;
}

export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export interface RailOverlay<
  TData = unknown,
  TConfig extends OverlayConfiguration = OverlayConfiguration,
> {
  readonly type: string;
  initialize(context: OverlayContext): void | Promise<void>;
  render(context: RenderContext): OverlayRenderResult | Promise<OverlayRenderResult>;
  update(data: TData, context?: RenderContext): void | Promise<void>;
  resize(dimensions: OverlayDimensions): void | Promise<void>;
  destroy(): void | Promise<void>;
  getLegend?(): OverlayLegend | undefined;
  getPerformanceMetrics?(): OverlayPerformanceMetrics;
  configure?(configuration: Partial<TConfig>): TConfig | Promise<TConfig>;
  getConfiguration?(): Readonly<TConfig>;
}

export interface OverlayFactoryOptions<
  TData = unknown,
  TConfig extends OverlayConfiguration = OverlayConfiguration,
> {
  readonly configuration?: Partial<TConfig>;
  readonly data?: TData;
}

export type OverlayFactory<
  TData = unknown,
  TConfig extends OverlayConfiguration = OverlayConfiguration,
> = (options?: OverlayFactoryOptions<TData, TConfig>) => RailOverlay<TData, TConfig>;

export function isRailOverlay(value: unknown): value is RailOverlay {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<RailOverlay>;

  return (
    typeof candidate.type === 'string' &&
    typeof candidate.initialize === 'function' &&
    typeof candidate.render === 'function' &&
    typeof candidate.update === 'function' &&
    typeof candidate.resize === 'function' &&
    typeof candidate.destroy === 'function'
  );
}
