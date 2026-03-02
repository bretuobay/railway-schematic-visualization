import type {
  OverlayConfiguration,
  OverlayFactoryOptions,
  OverlayLegend,
  RenderContext,
} from '../types';
import type { RenderElement, SvgRenderNode } from '../rendering';
import { SVGRenderer } from '../rendering';
import { ColorPalette } from '../colors';

import { BaseBuiltInOverlay, mergeDefined } from './BaseBuiltInOverlay';
import {
  expandBounds,
  intersectsBounds,
  midpoint,
  projectCoordinate,
  type OverlayCoordinate,
} from './helpers';

export interface RangeBandSegment {
  readonly start: OverlayCoordinate;
  readonly end: OverlayCoordinate;
}

export interface RangeBandDataPoint {
  readonly id: string;
  readonly start: OverlayCoordinate;
  readonly end: OverlayCoordinate;
  readonly segments?: ReadonlyArray<RangeBandSegment>;
  readonly label?: string;
  readonly color?: string;
  readonly blendMode?: 'normal' | 'multiply' | 'screen';
}

export interface RangeBandConfiguration extends OverlayConfiguration {
  readonly bandWidth?: number;
  readonly stackingMode?: 'overlay' | 'stacked';
  readonly stackOffset?: number;
  readonly labelPosition?: 'above' | 'below' | 'inline';
  readonly cullingBuffer?: number;
}

const DEFAULT_RANGE_BAND_CONFIGURATION: RangeBandConfiguration = {
  visible: true,
  zIndex: 5,
  opacity: 0.7,
  interactive: true,
  animationEnabled: false,
  bandWidth: 10,
  stackingMode: 'overlay',
  stackOffset: 12,
  labelPosition: 'above',
  cullingBuffer: 24,
};

export class RangeBandOverlay extends BaseBuiltInOverlay<
  ReadonlyArray<RangeBandDataPoint>,
  RangeBandConfiguration
> {
  private readonly renderer = new SVGRenderer();
  private renderedNodes: Array<SvgRenderNode> = [];
  private culledElementCount = 0;
  private hoverableBands = new Map<
    string,
    {
      readonly label: string | undefined;
      readonly blendMode: 'normal' | 'multiply' | 'screen';
    }
  >();

  public constructor(
    options?: OverlayFactoryOptions<
      ReadonlyArray<RangeBandDataPoint>,
      RangeBandConfiguration
    >,
  ) {
    super(
      'range-band',
      DEFAULT_RANGE_BAND_CONFIGURATION,
      options?.data ?? [],
      options?.configuration,
    );
  }

  public render(_context: RenderContext) {
    const startedAt = Date.now();
    const bandWidth = this.configuration.bandWidth ?? 10;
    const stackOffset = this.configuration.stackOffset ?? 12;
    const elements: RenderElement[] = [];
    const viewportBounds = _context.viewportBounds
      ? expandBounds(_context.viewportBounds, this.configuration.cullingBuffer ?? 24)
      : undefined;

    this.hoverableBands.clear();
    this.culledElementCount = 0;

    this.data.forEach((band, index) => {
      const color = band.color ?? ColorPalette.Category10[index % ColorPalette.Category10.length] ?? '#1f77b4';
      const bandOffset =
        this.configuration.stackingMode === 'stacked'
          ? index * stackOffset
          : 0;
      const segments = band.segments ?? [{ start: band.start, end: band.end }];
      const projectedSegments = segments.map((segment) => ({
        start: projectCoordinate(segment.start, this.context ?? {}),
        end: projectCoordinate(segment.end, this.context ?? {}),
      }));
      const isVisible =
        !viewportBounds
        || projectedSegments.some((segment) =>
          intersectsBounds(
            {
              minX: Math.min(segment.start.x, segment.end.x),
              minY: Math.min(segment.start.y, segment.end.y) - bandWidth,
              maxX: Math.max(segment.start.x, segment.end.x),
              maxY: Math.max(segment.start.y, segment.end.y) + bandWidth,
            },
            viewportBounds,
          ),
        );

      if (!isVisible) {
        this.culledElementCount += 1;
        return;
      }

      projectedSegments.forEach((segment, segmentIndex) => {
        const start = segment.start;
        const end = segment.end;
        const adjustedStart = { ...start, y: start.y - bandOffset };
        const adjustedEnd = { ...end, y: end.y - bandOffset };
        const halfWidth = bandWidth / 2;
        const polygonPoints: ReadonlyArray<readonly [number, number]> = [
          [adjustedStart.x, adjustedStart.y - halfWidth],
          [adjustedEnd.x, adjustedEnd.y - halfWidth],
          [adjustedEnd.x, adjustedEnd.y + halfWidth],
          [adjustedStart.x, adjustedStart.y + halfWidth],
        ];

        elements.push({
          id: `${band.id}-segment-${segmentIndex}`,
          geometry: {
            type: 'polygon',
            points: polygonPoints,
          },
          style: {
            fill: color,
            opacity: this.resolveBlendOpacity(band.blendMode ?? 'normal'),
          },
          zIndex: (this.configuration.zIndex ?? 0) + index,
        });
      });

      if (band.label) {
        const start = projectCoordinate(band.start, this.context ?? {});
        const end = projectCoordinate(band.end, this.context ?? {});
        const middle = midpoint(start, end);
        const labelY =
          this.configuration.labelPosition === 'below'
            ? middle.y + bandWidth + 8
            : this.configuration.labelPosition === 'inline'
              ? middle.y
              : middle.y - bandWidth - 8;

        elements.push({
          id: `${band.id}-label`,
          geometry: {
            type: 'point',
            x: middle.x,
            y: labelY - bandOffset,
            radius: 0,
            label: band.label,
          },
          style: {
            fill: color,
            fontSize: 12,
          },
          zIndex: (this.configuration.zIndex ?? 0) + index + 1,
        });
      }

      this.hoverableBands.set(band.id, {
        label: band.label,
        blendMode: band.blendMode ?? 'normal',
      });
    });

    this.renderedNodes = this.renderer.render(
      {
        setNodes: (nodes) => {
          this.renderedNodes = [...nodes];
        },
        clear: () => {
          this.renderedNodes = [];
        },
      },
      elements,
    ) as SvgRenderNode[];

    return this.completeRender(startedAt, this.renderedNodes.length);
  }

  public override configure(
    configuration: Partial<RangeBandConfiguration>,
  ): RangeBandConfiguration {
    this.configuration = mergeDefined(this.configuration, configuration);

    return this.configuration;
  }

  public getLegend(): OverlayLegend {
    return {
      title: 'Range Bands',
      type: 'categorical',
      items: [
        { label: 'Range', color: '#0ea5e9', shape: 'area' },
        { label: 'Overlapping Range', color: '#0369a1', shape: 'area' },
      ],
    };
  }

  public override getPerformanceMetrics() {
    return {
      ...super.getPerformanceMetrics(),
      culledElementCount: this.culledElementCount,
    };
  }

  public getRenderedNodes(): ReadonlyArray<SvgRenderNode> {
    return this.renderedNodes;
  }

  public handleBandHover(id: string): void {
    const band = this.hoverableBands.get(id);

    if (!band || !this.context?.eventManager) {
      return;
    }

    this.context.eventManager.emit('element-hover', {
      element: {
        id,
        type: 'range-band',
        properties: {
          label: band.label,
          blendMode: band.blendMode,
        },
        isOverlay: true,
      },
    });
  }

  private resolveBlendOpacity(
    blendMode: 'normal' | 'multiply' | 'screen',
  ): number {
    switch (blendMode) {
      case 'multiply':
        return 0.55;
      case 'screen':
        return 0.4;
      case 'normal':
      default:
        return this.configuration.opacity ?? 0.7;
    }
  }
}
