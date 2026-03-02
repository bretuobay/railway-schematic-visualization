import type {
  OverlayConfiguration,
  OverlayFactoryOptions,
  OverlayLegend,
  RenderContext,
} from '../types';
import type { RenderElement, SvgRenderNode } from '../rendering';
import { SVGRenderer } from '../rendering';
import { ColorPalette } from '../colors';

import { AnimationController } from './AnimationController';
import { BaseBuiltInOverlay, mergeDefined } from './BaseBuiltInOverlay';
import { projectCoordinate, type OverlayCoordinate } from './helpers';

export interface TimeSeriesDataPoint {
  readonly id: string;
  readonly timestamp: number;
  readonly metric: string;
  readonly position: OverlayCoordinate;
  readonly value: number;
  readonly color?: string;
}

export interface TimeSeriesConfiguration extends OverlayConfiguration {
  readonly playbackSpeed?: number;
  readonly preloadFrames?: number;
  readonly pointRadius?: number;
  readonly visibleMetrics?: ReadonlyArray<string>;
}

const DEFAULT_TIME_SERIES_CONFIGURATION: TimeSeriesConfiguration = {
  visible: true,
  zIndex: 12,
  opacity: 1,
  interactive: false,
  animationEnabled: true,
  playbackSpeed: 1,
  preloadFrames: 1,
  pointRadius: 4,
  visibleMetrics: [],
};

export class TimeSeriesOverlay extends BaseBuiltInOverlay<
  ReadonlyArray<TimeSeriesDataPoint>,
  TimeSeriesConfiguration
> {
  private readonly renderer = new SVGRenderer();
  private readonly animationController = new AnimationController();
  private readonly temporalIndex = new Map<number, ReadonlyArray<TimeSeriesDataPoint>>();
  private readonly frameCache = new Map<number, ReadonlyArray<RenderElement>>();
  private renderedNodes: Array<SvgRenderNode> = [];
  private sortedTimestamps: Array<number> = [];
  private visibleMetrics = new Set<string>();
  private currentTimestamp: number | undefined;
  private playbackAnimationId: string | undefined;

  public constructor(
    options?: OverlayFactoryOptions<
      ReadonlyArray<TimeSeriesDataPoint>,
      TimeSeriesConfiguration
    >,
  ) {
    super(
      'time-series',
      DEFAULT_TIME_SERIES_CONFIGURATION,
      options?.data ?? [],
      options?.configuration,
    );

    this.rebuildTemporalIndex();
  }

  public override update(data: ReadonlyArray<TimeSeriesDataPoint>): void {
    super.update([...data]);
    this.rebuildTemporalIndex();
  }

  public render(context: RenderContext) {
    const startedAt = Date.now();

    this.animationController.tick(context.timestamp);

    if (this.currentTimestamp === undefined && this.sortedTimestamps.length > 0) {
      this.currentTimestamp = this.sortedTimestamps[0];
    }

    const timestamp = this.currentTimestamp;
    const frame = timestamp === undefined ? [] : this.getFrame(timestamp);

    this.renderedNodes = this.renderer.render(
      {
        setNodes: (nodes) => {
          this.renderedNodes = [...nodes];
        },
        clear: () => {
          this.renderedNodes = [];
        },
      },
      frame,
    ) as SvgRenderNode[];

    if (timestamp !== undefined) {
      this.preloadNearbyFrames(timestamp);
    }

    return this.completeRender(startedAt, this.renderedNodes.length);
  }

  public override destroy(): void {
    this.animationController.stop();
    super.destroy();
  }

  public override configure(
    configuration: Partial<TimeSeriesConfiguration>,
  ): TimeSeriesConfiguration {
    this.configuration = mergeDefined(this.configuration, configuration);

    if (configuration.visibleMetrics) {
      this.visibleMetrics = new Set(configuration.visibleMetrics);
    }

    return this.configuration;
  }

  public getLegend(): OverlayLegend {
    const metrics = [...new Set(this.data.map((entry) => entry.metric))];

    return {
      title: 'Time Series',
      type: 'categorical',
      items: metrics.map((metric, index) => ({
        label: this.visibleMetrics.has(metric) ? metric : `${metric} (hidden)`,
        color: ColorPalette.Category10[index % ColorPalette.Category10.length] ?? '#1f77b4',
        shape: 'line',
      })),
    };
  }

  public getRenderedNodes(): ReadonlyArray<SvgRenderNode> {
    return this.renderedNodes;
  }

  public getTemporalIndexSize(): number {
    return this.temporalIndex.size;
  }

  public getCurrentTimestamp(): number | undefined {
    return this.currentTimestamp;
  }

  public getSliderPosition(): number {
    if (this.currentTimestamp === undefined || this.sortedTimestamps.length <= 1) {
      return 0;
    }

    const index = this.sortedTimestamps.indexOf(this.currentTimestamp);

    return index < 0 ? 0 : index / (this.sortedTimestamps.length - 1);
  }

  public getCacheSize(): number {
    return this.frameCache.size;
  }

  public getFormattedCurrentTime(): string | undefined {
    return this.currentTimestamp === undefined
      ? undefined
      : new Date(this.currentTimestamp).toISOString();
  }

  public play(): void {
    if (this.playbackAnimationId || this.sortedTimestamps.length === 0) {
      return;
    }

    const durationMs = Math.max(1, this.sortedTimestamps.length * 250);

    this.playbackAnimationId = this.animationController.start({
      durationMs,
      ...(this.configuration.playbackSpeed !== undefined
        ? { speed: this.configuration.playbackSpeed }
        : {}),
      onFrame: (progress) => {
        const index = Math.min(
          this.sortedTimestamps.length - 1,
          Math.floor(progress * this.sortedTimestamps.length),
        );

        this.currentTimestamp = this.sortedTimestamps[index];
      },
      onComplete: () => {
        this.playbackAnimationId = undefined;
      },
    });
  }

  public pause(): void {
    if (this.playbackAnimationId) {
      this.animationController.pause(this.playbackAnimationId);
    }
  }

  public stop(): void {
    if (this.playbackAnimationId) {
      this.animationController.stop(this.playbackAnimationId);
      this.playbackAnimationId = undefined;
    }

    this.currentTimestamp = this.sortedTimestamps[0];
  }

  public setPlaybackSpeed(speed: number): void {
    this.configuration = mergeDefined(this.configuration, { playbackSpeed: speed });

    if (this.playbackAnimationId) {
      this.animationController.setSpeed(speed, this.playbackAnimationId);
    }
  }

  public seekTo(timestamp: number): void {
    if (this.temporalIndex.has(timestamp)) {
      this.currentTimestamp = timestamp;
      return;
    }

    const nearest = this.sortedTimestamps.reduce<number | undefined>((closest, entry) => {
      if (closest === undefined) {
        return entry;
      }

      return Math.abs(entry - timestamp) < Math.abs(closest - timestamp)
        ? entry
        : closest;
    }, undefined);

    this.currentTimestamp = nearest;
  }

  public toggleMetric(metric: string): boolean {
    if (this.visibleMetrics.has(metric)) {
      this.visibleMetrics.delete(metric);
      return false;
    }

    this.visibleMetrics.add(metric);

    return true;
  }

  public setMetricVisibility(metric: string, visible: boolean): void {
    if (visible) {
      this.visibleMetrics.add(metric);
      return;
    }

    this.visibleMetrics.delete(metric);
  }

  public tick(timestamp = Date.now()): void {
    this.animationController.tick(timestamp);
  }

  private rebuildTemporalIndex(): void {
    this.temporalIndex.clear();
    this.frameCache.clear();

    for (const point of this.data) {
      const existing = this.temporalIndex.get(point.timestamp) ?? [];
      this.temporalIndex.set(point.timestamp, [...existing, point]);
      this.visibleMetrics.add(point.metric);
    }

    if ((this.configuration.visibleMetrics?.length ?? 0) > 0) {
      this.visibleMetrics = new Set(this.configuration.visibleMetrics);
    }

    this.sortedTimestamps = [...this.temporalIndex.keys()].sort((left, right) => left - right);
    this.currentTimestamp = this.sortedTimestamps[0];
  }

  private getFrame(timestamp: number): ReadonlyArray<RenderElement> {
    const cached = this.frameCache.get(timestamp);

    if (cached) {
      return cached;
    }

    const frame = (this.temporalIndex.get(timestamp) ?? [])
      .filter((entry) => this.visibleMetrics.has(entry.metric))
      .map((entry, index) => {
        const screen = projectCoordinate(entry.position, this.context ?? {});

        return {
          id: `${entry.id}-${timestamp}`,
          geometry: {
            type: 'point' as const,
            x: screen.x,
            y: screen.y,
            radius: this.configuration.pointRadius ?? 4,
            label: `${entry.metric}:${entry.value}`,
          },
          style: {
            fill: entry.color ?? ColorPalette.Category10[index % ColorPalette.Category10.length] ?? '#1f77b4',
            fontSize: 11,
          },
          zIndex: this.configuration.zIndex ?? 0,
        };
      });

    this.frameCache.set(timestamp, frame);

    return frame;
  }

  private preloadNearbyFrames(timestamp: number): void {
    const centerIndex = this.sortedTimestamps.indexOf(timestamp);
    const preloadFrames = this.configuration.preloadFrames ?? 1;

    for (let offset = 1; offset <= preloadFrames; offset += 1) {
      const candidate = this.sortedTimestamps[centerIndex + offset];

      if (candidate !== undefined) {
        this.getFrame(candidate);
      }
    }
  }
}
