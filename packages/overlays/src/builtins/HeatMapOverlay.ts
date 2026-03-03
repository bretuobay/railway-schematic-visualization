import type {
  OverlayConfiguration,
  OverlayFactoryOptions,
  OverlayLegend,
  RenderContext,
} from '../types';
import { CanvasRenderer } from '../rendering';
import { ColorPalette, ColorScale, type ColorScaleFunction } from '../colors';
import { SpatialIndex, type IndexEntry } from '../spatial';

import { BaseBuiltInOverlay, mergeDefined } from './BaseBuiltInOverlay';
import {
  boundsAroundPoint,
  expandBounds,
  getOverlayDimensions,
  normalizeUnitInterval,
  projectCoordinate,
  type OverlayCoordinate,
} from './helpers';

export interface HeatMapDataPoint {
  readonly id: string;
  readonly position: OverlayCoordinate;
  readonly value: number;
  readonly radius?: number;
  readonly intensity?: number;
}

export interface HeatMapConfiguration extends OverlayConfiguration {
  readonly interpolationMode?: 'linear' | 'step' | 'smooth';
  readonly palette?: ReadonlyArray<string>;
  readonly minValue?: number;
  readonly maxValue?: number;
  readonly pointRadius?: number;
  readonly performanceMode?: 'quality' | 'balanced' | 'speed';
  readonly opacityScale?: number;
  readonly cullingBuffer?: number;
}

const DEFAULT_HEAT_MAP_CONFIGURATION: HeatMapConfiguration = {
  visible: true,
  zIndex: 0,
  opacity: 1,
  interactive: false,
  animationEnabled: false,
  interpolationMode: 'linear',
  palette: ColorPalette.Viridis,
  pointRadius: 16,
  performanceMode: 'balanced',
  opacityScale: 0.8,
  cullingBuffer: 24,
};

export class HeatMapOverlay extends BaseBuiltInOverlay<
  ReadonlyArray<HeatMapDataPoint>,
  HeatMapConfiguration
> {
  private readonly renderer = new CanvasRenderer({ useOffscreenCanvas: true });
  private readonly canvasTarget = {
    transferToOffscreen: () => ({}),
  };
  private readonly spatialIndex = new SpatialIndex<HeatMapDataPoint>();
  private readonly gradientCache = new Map<string, string>();
  private renderedElements: Array<import('../rendering').RenderElement> = [];
  private culledElementCount = 0;
  private lastCanvasSummary:
    | {
        readonly elementCount: number;
        readonly usedOffscreenCanvas: boolean;
      }
    | undefined;

  public constructor(
    options?: OverlayFactoryOptions<
      ReadonlyArray<HeatMapDataPoint>,
      HeatMapConfiguration
    >,
  ) {
    super(
      'heat-map',
      DEFAULT_HEAT_MAP_CONFIGURATION,
      options?.data ?? [],
      options?.configuration,
    );
  }

  public override update(data: ReadonlyArray<HeatMapDataPoint>): void {
    this.validateData(data);
    this.gradientCache.clear();
    this.spatialIndex.clear();
    super.update([...data]);
  }

  public render(context: RenderContext) {
    const startedAt = Date.now();
    const dimensions = getOverlayDimensions(this.context, context);
    const domain = this.resolveDomain();
    const colorScale = this.createColorScale(domain);
    const projected = this.data.map((point) => {
      const screen = projectCoordinate(point.position, this.context ?? {});
      const radius = this.resolveRadius(point);

      return {
        point,
        screen,
        radius,
        bounds: boundsAroundPoint(screen.x, screen.y, radius),
      };
    });

    this.spatialIndex.bulkLoad(
      projected.map((entry): IndexEntry<HeatMapDataPoint> => ({
        ...entry.bounds,
        value: entry.point,
      })),
    );

    const visiblePoints =
      context.viewportBounds
      ?? (this.context?.viewportController
        ? {
            minX: 0,
            minY: 0,
            maxX: dimensions.width,
            maxY: dimensions.height,
          }
        : undefined);
    const visibleSearchBounds = visiblePoints
      ? expandBounds(visiblePoints, this.configuration.cullingBuffer ?? 24)
      : undefined;
    const visibleIds = visibleSearchBounds
      ? new Set(this.spatialIndex.search(visibleSearchBounds).map((entry) => entry.value.id))
      : undefined;

    this.renderedElements = projected
      .filter((entry) => (visibleIds ? visibleIds.has(entry.point.id) : true))
      .flatMap((entry) => {
        const color = this.resolveGradient(entry.point, colorScale, domain);
        const base = {
          id: entry.point.id,
          geometry: {
            type: 'point' as const,
            x: entry.screen.x,
            y: entry.screen.y,
            radius: entry.radius,
          },
          style: {
            fill: color,
            opacity:
              Math.min(1, (entry.point.intensity ?? 1) * (this.configuration.opacityScale ?? 0.8)),
          },
          zIndex: this.configuration.zIndex ?? 0,
        };

        if (this.configuration.interpolationMode === 'smooth') {
          return [
            {
              ...base,
              id: `${entry.point.id}-blur`,
              geometry: {
                ...base.geometry,
                radius: entry.radius * 1.5,
              },
              style: {
                ...base.style,
                opacity: (base.style.opacity ?? 1) * 0.5,
              },
            },
            base,
          ];
        }

        if (this.configuration.interpolationMode === 'step') {
          return [
            {
              ...base,
              style: {
                ...base.style,
                opacity: 1,
              },
            },
          ];
        }

        return [base];
      });
    this.culledElementCount = projected.length - this.renderedElements.filter((element) => !element.id.endsWith('-blur')).length;

    this.lastCanvasSummary = this.renderer.render(this.canvasTarget, this.renderedElements);

    return this.completeRender(startedAt, this.renderedElements.length);
  }

  public override configure(
    configuration: Partial<HeatMapConfiguration>,
  ): HeatMapConfiguration {
    this.gradientCache.clear();
    this.configuration = mergeDefined(this.configuration, configuration);

    return this.configuration;
  }

  public getLegend(): OverlayLegend {
    const [minValue, maxValue] = this.resolveDomain();
    const palette = this.configuration.palette ?? ColorPalette.Viridis;

    return {
      title: 'Heat Map',
      type: 'continuous',
      min: minValue,
      max: maxValue,
      items: [
        { label: 'Low', color: palette[0] ?? '#000000', value: minValue },
        {
          label: 'High',
          color: palette[palette.length - 1] ?? '#ffffff',
          value: maxValue,
        },
      ],
    };
  }

  public getPerformanceMetrics() {
    return {
      ...super.getPerformanceMetrics(),
      culledElementCount: this.culledElementCount,
    };
  }

  public getRenderedElements(): ReadonlyArray<import('../rendering').RenderElement> {
    return this.renderedElements;
  }

  public getCacheSize(): number {
    return this.gradientCache.size;
  }

  public getCanvasSummary():
    | {
        readonly elementCount: number;
        readonly usedOffscreenCanvas: boolean;
      }
    | undefined {
    return this.lastCanvasSummary;
  }

  private validateData(data: ReadonlyArray<HeatMapDataPoint>): void {
    for (const point of data) {
      if (!Number.isFinite(point.value)) {
        throw new Error(`Invalid heat-map value for "${point.id}".`);
      }
    }
  }

  private resolveDomain(): readonly [number, number] {
    const values = this.data.map((point) => point.value);
    const minValue = this.configuration.minValue ?? Math.min(...values, 0);
    const maxValue = this.configuration.maxValue ?? Math.max(...values, 1);

    return [minValue, maxValue];
  }

  private createColorScale(domain: readonly [number, number]): ColorScaleFunction {
    const palette = this.configuration.palette ?? ColorPalette.Viridis;

    return ColorScale.linear(domain, [
      palette[0] ?? '#440154',
      palette[palette.length - 1] ?? '#fde725',
    ]);
  }

  private resolveGradient(
    point: HeatMapDataPoint,
    colorScale: ColorScaleFunction,
    domain: readonly [number, number],
  ): string {
    const normalizedValue = normalizeUnitInterval(point.value, domain[0], domain[1]);
    const cacheKey = [
      normalizedValue.toFixed(3),
      this.configuration.interpolationMode,
      this.configuration.performanceMode,
    ].join(':');
    const cached = this.gradientCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const color = colorScale(point.value);

    this.gradientCache.set(cacheKey, color);

    return color;
  }

  private resolveRadius(point: HeatMapDataPoint): number {
    const baseRadius = point.radius ?? this.configuration.pointRadius ?? 16;

    switch (this.configuration.performanceMode) {
      case 'speed':
        return Math.max(4, baseRadius * 0.75);
      case 'quality':
        return baseRadius * 1.25;
      case 'balanced':
      default:
        return baseRadius;
    }
  }
}
