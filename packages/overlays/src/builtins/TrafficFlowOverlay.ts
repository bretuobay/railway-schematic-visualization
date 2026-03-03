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
import { clamp, projectCoordinate, type OverlayCoordinate } from './helpers';

export interface TrafficFlowDataPoint {
  readonly id: string;
  readonly start: OverlayCoordinate;
  readonly end: OverlayCoordinate;
  readonly frequency: number;
  readonly direction: 'up' | 'down' | 'bidirectional';
  readonly color?: string;
}

export interface TrafficFlowConfiguration extends OverlayConfiguration {
  readonly minWidth?: number;
  readonly maxWidth?: number;
  readonly animationStyle?: 'continuous' | 'pulsing' | 'dashed' | 'none';
  readonly animationSpeed?: number;
}

const DEFAULT_TRAFFIC_FLOW_CONFIGURATION: TrafficFlowConfiguration = {
  visible: true,
  zIndex: 8,
  opacity: 1,
  interactive: false,
  animationEnabled: true,
  minWidth: 2,
  maxWidth: 10,
  animationStyle: 'continuous',
  animationSpeed: 1,
};

export class TrafficFlowOverlay extends BaseBuiltInOverlay<
  ReadonlyArray<TrafficFlowDataPoint>,
  TrafficFlowConfiguration
> {
  private readonly renderer = new SVGRenderer();
  private readonly animationController = new AnimationController();
  private renderedNodes: Array<SvgRenderNode> = [];
  private animationPhase = 1;

  public constructor(
    options?: OverlayFactoryOptions<
      ReadonlyArray<TrafficFlowDataPoint>,
      TrafficFlowConfiguration
    >,
  ) {
    super(
      'traffic-flow',
      DEFAULT_TRAFFIC_FLOW_CONFIGURATION,
      options?.data ?? [],
      options?.configuration,
    );
  }

  public override initialize(context: import('../types').OverlayContext): void {
    super.initialize(context);

    this.animationController.start({
      id: 'traffic-flow-phase',
      durationMs: 1000,
      loop: true,
      ...(this.configuration.animationSpeed !== undefined
        ? { speed: this.configuration.animationSpeed }
        : {}),
      onFrame: (progress) => {
        this.animationPhase = 0.5 + progress * 0.5;
      },
    });
  }

  public render(context: RenderContext) {
    const startedAt = Date.now();
    this.animationController.tick(context.timestamp);

    const maxFrequency = Math.max(...this.data.map((entry) => entry.frequency), 1);
    const elements: RenderElement[] = [];

    this.data.forEach((flow, index) => {
      const start = projectCoordinate(flow.start, this.context ?? {});
      const end = projectCoordinate(flow.end, this.context ?? {});
      const color = flow.color ?? ColorPalette.Category10[index % ColorPalette.Category10.length] ?? '#1f77b4';
      const width = this.scaleWidth(flow.frequency, maxFrequency);
      const offset = flow.direction === 'bidirectional' ? width : 0;

      if (flow.direction !== 'down') {
        elements.push(...this.renderArrow(`${flow.id}-forward`, start.x, start.y - offset, end.x, end.y - offset, color, width));
      }

      if (flow.direction !== 'up') {
        elements.push(...this.renderArrow(`${flow.id}-reverse`, end.x, end.y + offset, start.x, start.y + offset, color, width));
      }
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

  public override destroy(): void {
    this.animationController.stop();
    super.destroy();
  }

  public override configure(
    configuration: Partial<TrafficFlowConfiguration>,
  ): TrafficFlowConfiguration {
    this.configuration = mergeDefined(this.configuration, configuration);
    this.animationController.setSpeed(this.configuration.animationSpeed ?? 1);

    return this.configuration;
  }

  public getLegend(): OverlayLegend {
    const maxFrequency = Math.max(...this.data.map((entry) => entry.frequency), 1);

    return {
      title: 'Traffic Flow',
      type: 'continuous',
      min: 0,
      max: maxFrequency,
      items: [
        {
          label: 'Low Frequency',
          color: '#fdba74',
          value: 0,
        },
        {
          label: 'High Frequency',
          color: '#c2410c',
          value: maxFrequency,
        },
      ],
    };
  }

  public getRenderedNodes(): ReadonlyArray<SvgRenderNode> {
    return this.renderedNodes;
  }

  private scaleWidth(frequency: number, maxFrequency: number): number {
    const minWidth = this.configuration.minWidth ?? 2;
    const maxWidth = this.configuration.maxWidth ?? 10;

    return minWidth + ((clamp(frequency, 0, maxFrequency) / maxFrequency) * (maxWidth - minWidth));
  }

  private renderArrow(
    id: string,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    color: string,
    width: number,
  ): Array<RenderElement> {
    const opacity =
      this.configuration.animationStyle === 'pulsing'
        ? this.animationPhase
        : this.configuration.opacity ?? 1;
    const dashArray =
      this.configuration.animationStyle === 'dashed'
        ? [Math.max(4, width * 1.5), Math.max(2, width)]
        : undefined;

    return [
      {
        id,
        geometry: {
          type: 'line',
          points: [
            [startX, startY],
            [endX, endY],
          ],
        },
        style: {
          stroke: color,
          strokeWidth: width,
          opacity,
          ...(dashArray ? { dashArray } : {}),
        },
        zIndex: this.configuration.zIndex ?? 0,
      },
      {
        id: `${id}-head`,
        geometry: {
          type: 'point',
          x: endX,
          y: endY,
          radius: Math.max(3, width / 2),
        },
        style: {
          fill: color,
          opacity,
        },
        zIndex: (this.configuration.zIndex ?? 0) + 1,
      },
    ];
  }
}
