import type {
  OverlayConfiguration,
  OverlayContext,
  OverlayDimensions,
  OverlayPerformanceMetrics,
  OverlayRenderResult,
  RailOverlay,
  RenderContext,
} from '../types';

export function mergeDefined<T extends object>(
  base: T,
  next?: Partial<T>,
): T {
  if (!next) {
    return { ...base };
  }

  const merged = { ...base } as Record<string, unknown>;

  for (const [key, value] of Object.entries(next)) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }

  return merged as T;
}

export abstract class BaseBuiltInOverlay<
  TData,
  TConfig extends OverlayConfiguration,
> implements RailOverlay<TData, TConfig>
{
  protected context: OverlayContext | undefined;
  protected configuration: TConfig;
  protected data: TData;
  protected dimensions: OverlayDimensions | undefined;
  private renderCount = 0;
  private totalRenderDurationMs = 0;
  private lastRenderDurationMs = 0;
  private lastElementCount = 0;

  protected constructor(
    public readonly type: string,
    defaults: TConfig,
    data: TData,
    configuration?: Partial<TConfig>,
  ) {
    this.configuration = mergeDefined(defaults, configuration);
    this.data = data;
  }

  public initialize(context: OverlayContext): void {
    this.context = context;
    this.dimensions = context.dimensions;
  }

  public update(data: TData): void {
    this.data = data;
  }

  public resize(dimensions: OverlayDimensions): void {
    this.dimensions = dimensions;
  }

  public destroy(): void {
    this.context = undefined;
  }

  public configure(configuration: Partial<TConfig>): TConfig {
    this.configuration = mergeDefined(this.configuration, configuration);

    return this.configuration;
  }

  public getConfiguration(): Readonly<TConfig> {
    return this.configuration;
  }

  public getPerformanceMetrics(): OverlayPerformanceMetrics {
    return {
      renderCount: this.renderCount,
      lastRenderDurationMs: this.lastRenderDurationMs,
      averageRenderDurationMs:
        this.renderCount === 0 ? 0 : this.totalRenderDurationMs / this.renderCount,
      lastElementCount: this.lastElementCount,
    };
  }

  protected completeRender(startedAt: number, elementCount: number): OverlayRenderResult {
    const durationMs = Math.max(0, Date.now() - startedAt);

    this.renderCount += 1;
    this.totalRenderDurationMs += durationMs;
    this.lastRenderDurationMs = durationMs;
    this.lastElementCount = elementCount;

    return {
      elementCount,
      durationMs,
    };
  }

  public abstract render(
    context: RenderContext,
  ): OverlayRenderResult | Promise<OverlayRenderResult>;
}
