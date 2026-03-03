export interface PerformanceMetrics {
  readonly frameTimeMs: number;
  readonly averageFrameTimeMs: number;
  readonly layoutTimeMs: number;
  readonly averageLayoutTimeMs: number;
  readonly renderedElements: number;
  readonly culledElements: number;
  readonly totalFrames: number;
  readonly totalLayouts: number;
  readonly droppedFrames: number;
  readonly monitoringOverheadRatio: number;
  readonly enabled: boolean;
  readonly lastUpdatedAt: number | null;
}

export interface PerformanceMonitorConfig {
  readonly enabled?: boolean;
  readonly frameTimeThresholdMs?: number;
  readonly layoutTimeThresholdMs?: number;
}

export interface PerformanceMeasureOptions {
  readonly renderedElements?: number;
  readonly culledElements?: number;
}

export type PerformanceEvent = 'metrics' | 'frame-threshold' | 'layout-threshold';

export interface PerformanceEventPayload {
  readonly event: PerformanceEvent;
  readonly metrics: PerformanceMetrics;
  readonly observedMs?: number;
  readonly thresholdMs?: number;
}

type PerformanceEventHandler = (payload: PerformanceEventPayload) => void;

const DEFAULT_CONFIG: Required<Pick<PerformanceMonitorConfig, 'enabled' | 'frameTimeThresholdMs' | 'layoutTimeThresholdMs'>> = {
  enabled: true,
  frameTimeThresholdMs: 16.67,
  layoutTimeThresholdMs: 1000,
};

const DEFAULT_METRICS: PerformanceMetrics = {
  frameTimeMs: 0,
  averageFrameTimeMs: 0,
  layoutTimeMs: 0,
  averageLayoutTimeMs: 0,
  renderedElements: 0,
  culledElements: 0,
  totalFrames: 0,
  totalLayouts: 0,
  droppedFrames: 0,
  monitoringOverheadRatio: 0,
  enabled: DEFAULT_CONFIG.enabled,
  lastUpdatedAt: null,
};

export class PerformanceMonitor {
  private readonly config: Required<PerformanceMonitorConfig>;
  private readonly handlers = new Map<PerformanceEvent, Set<PerformanceEventHandler>>();
  private metrics: PerformanceMetrics;
  private observedWorkMs = 0;
  private instrumentationOverheadMs = 0;

  public constructor(config: PerformanceMonitorConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
    this.metrics = {
      ...DEFAULT_METRICS,
      enabled: this.config.enabled,
    };
  }

  public on(event: PerformanceEvent, handler: PerformanceEventHandler): void {
    const handlers = this.handlers.get(event) ?? new Set<PerformanceEventHandler>();

    handlers.add(handler);
    this.handlers.set(event, handlers);
  }

  public off(event: PerformanceEvent, handler: PerformanceEventHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  public isEnabled(): boolean {
    return this.metrics.enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.metrics = {
      ...this.metrics,
      enabled,
      lastUpdatedAt: nowMs(),
    };
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public recordFrameTime(
    frameTimeMs: number,
    options: PerformanceMeasureOptions = {},
  ): PerformanceMetrics {
    if (!this.metrics.enabled) {
      return this.getMetrics();
    }

    const startedAt = nowMs();
    const resolvedFrameTime = normalizeDuration(frameTimeMs);
    const totalFrames = this.metrics.totalFrames + 1;
    const averageFrameTimeMs =
      ((this.metrics.averageFrameTimeMs * this.metrics.totalFrames) + resolvedFrameTime) / totalFrames;
    const droppedFrames =
      this.metrics.droppedFrames
      + (resolvedFrameTime > this.config.frameTimeThresholdMs ? 1 : 0);

    this.metrics = {
      ...this.metrics,
      frameTimeMs: resolvedFrameTime,
      averageFrameTimeMs,
      renderedElements: normalizeCount(options.renderedElements, this.metrics.renderedElements),
      culledElements: normalizeCount(options.culledElements, this.metrics.culledElements),
      totalFrames,
      droppedFrames,
      lastUpdatedAt: Date.now(),
    };
    this.captureOverhead(nowMs() - startedAt, resolvedFrameTime);
    this.emit('metrics', { event: 'metrics', metrics: this.getMetrics() });

    if (resolvedFrameTime > this.config.frameTimeThresholdMs) {
      this.emit('frame-threshold', {
        event: 'frame-threshold',
        metrics: this.getMetrics(),
        observedMs: resolvedFrameTime,
        thresholdMs: this.config.frameTimeThresholdMs,
      });
    }

    return this.getMetrics();
  }

  public recordLayoutTime(layoutTimeMs: number): PerformanceMetrics {
    if (!this.metrics.enabled) {
      return this.getMetrics();
    }

    const startedAt = nowMs();
    const resolvedLayoutTime = normalizeDuration(layoutTimeMs);
    const totalLayouts = this.metrics.totalLayouts + 1;
    const averageLayoutTimeMs =
      ((this.metrics.averageLayoutTimeMs * this.metrics.totalLayouts) + resolvedLayoutTime) / totalLayouts;

    this.metrics = {
      ...this.metrics,
      layoutTimeMs: resolvedLayoutTime,
      averageLayoutTimeMs,
      totalLayouts,
      lastUpdatedAt: Date.now(),
    };
    this.captureOverhead(nowMs() - startedAt, resolvedLayoutTime);
    this.emit('metrics', { event: 'metrics', metrics: this.getMetrics() });

    if (resolvedLayoutTime > this.config.layoutTimeThresholdMs) {
      this.emit('layout-threshold', {
        event: 'layout-threshold',
        metrics: this.getMetrics(),
        observedMs: resolvedLayoutTime,
        thresholdMs: this.config.layoutTimeThresholdMs,
      });
    }

    return this.getMetrics();
  }

  public recordRenderedElements(renderedElements: number): PerformanceMetrics {
    if (!this.metrics.enabled) {
      return this.getMetrics();
    }

    const startedAt = nowMs();

    this.metrics = {
      ...this.metrics,
      renderedElements: normalizeCount(renderedElements, this.metrics.renderedElements),
      lastUpdatedAt: Date.now(),
    };
    this.captureOverhead(nowMs() - startedAt, this.metrics.frameTimeMs);
    this.emit('metrics', { event: 'metrics', metrics: this.getMetrics() });

    return this.getMetrics();
  }

  public recordCulledElements(culledElements: number): PerformanceMetrics {
    if (!this.metrics.enabled) {
      return this.getMetrics();
    }

    const startedAt = nowMs();

    this.metrics = {
      ...this.metrics,
      culledElements: normalizeCount(culledElements, this.metrics.culledElements),
      lastUpdatedAt: Date.now(),
    };
    this.captureOverhead(nowMs() - startedAt, this.metrics.frameTimeMs);
    this.emit('metrics', { event: 'metrics', metrics: this.getMetrics() });

    return this.getMetrics();
  }

  public async measureFrame<T>(
    task: () => T | Promise<T>,
    options: PerformanceMeasureOptions = {},
  ): Promise<T> {
    const startedAt = nowMs();
    const result = await task();

    this.recordFrameTime(nowMs() - startedAt, options);

    return result;
  }

  public async measureLayout<T>(
    task: () => T | Promise<T>,
  ): Promise<T> {
    const startedAt = nowMs();
    const result = await task();

    this.recordLayoutTime(nowMs() - startedAt);

    return result;
  }

  private captureOverhead(overheadMs: number, observedMs: number): void {
    this.instrumentationOverheadMs += normalizeDuration(overheadMs);
    this.observedWorkMs += Math.max(0.0001, normalizeDuration(observedMs));
    this.metrics = {
      ...this.metrics,
      monitoringOverheadRatio: this.instrumentationOverheadMs / this.observedWorkMs,
    };
  }

  private emit(event: PerformanceEvent, payload: PerformanceEventPayload): void {
    for (const handler of this.handlers.get(event) ?? []) {
      handler(payload);
    }
  }
}

function normalizeDuration(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return value;
}

function normalizeCount(value: number | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.round(value);
}

function nowMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }

  return Date.now();
}
