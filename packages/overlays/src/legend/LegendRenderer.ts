import type { SvgRenderNode } from '../rendering';

import type {
  CategoricalLegendDescriptor,
  ContinuousLegendDescriptor,
  DiscreteLegendDescriptor,
  LegendConfiguration,
  LegendDescriptor,
} from './types';

const DEFAULT_CONFIG: Required<
  Pick<
    LegendConfiguration,
    'position' | 'collapsible' | 'collapsed' | 'width' | 'itemHeight' | 'padding' | 'surfaceWidth' | 'surfaceHeight'
  >
> = {
  position: 'top-right',
  collapsible: false,
  collapsed: false,
  width: 180,
  itemHeight: 20,
  padding: 12,
  surfaceWidth: 800,
  surfaceHeight: 600,
};

export class LegendRenderer {
  private nodes: Array<SvgRenderNode> = [];
  private collapsed = false;

  public render(
    descriptors: ReadonlyArray<LegendDescriptor>,
    configuration: LegendConfiguration = {},
  ): ReadonlyArray<SvgRenderNode> {
    const config = {
      ...DEFAULT_CONFIG,
      ...configuration,
    };

    this.collapsed = configuration.collapsed ?? this.collapsed ?? config.collapsed;

    const visibleDescriptors = descriptors.filter((descriptor) => descriptor.visible !== false);
    const origin = this.resolveOrigin(config);
    const nodes: SvgRenderNode[] = [];
    let cursorY = origin.y;

    if (config.collapsible) {
      nodes.push({
        id: 'legend-toggle',
        tag: 'text',
        attributes: {
          x: `${origin.x}`,
          y: `${cursorY}`,
          text: this.collapsed ? 'Show Legend' : 'Hide Legend',
        },
      });
      cursorY += config.itemHeight;
    }

    if (this.collapsed) {
      this.nodes = nodes;
      return this.nodes;
    }

    for (const descriptor of visibleDescriptors) {
      nodes.push({
        id: `${descriptor.id}-title`,
        tag: 'text',
        attributes: {
          x: `${origin.x}`,
          y: `${cursorY}`,
          text: descriptor.title,
        },
      });
      cursorY += config.itemHeight;

      const rendered =
        descriptor.type === 'continuous'
          ? this.renderContinuous(descriptor, origin.x, cursorY, config)
          : descriptor.type === 'discrete'
            ? this.renderDiscrete(descriptor, origin.x, cursorY, config)
            : this.renderCategorical(descriptor, origin.x, cursorY, config);

      nodes.push(...rendered);
      cursorY += rendered.filter((node) => node.tag === 'text').length * config.itemHeight + config.padding;
    }

    this.nodes = nodes;

    return this.nodes;
  }

  public renderContinuous(
    descriptor: ContinuousLegendDescriptor,
    x: number,
    y: number,
    configuration: LegendConfiguration = {},
  ): ReadonlyArray<SvgRenderNode> {
    const config = {
      ...DEFAULT_CONFIG,
      ...configuration,
    };
    const width = config.width;
    const height = config.itemHeight;
    const ticks = descriptor.ticks ?? [descriptor.min, descriptor.max];

    return [
      {
        id: `${descriptor.id}-bar`,
        tag: 'polygon',
        attributes: {
          points: `${x},${y} ${x + width},${y} ${x + width},${y + height} ${x},${y + height}`,
          fill: descriptor.startColor,
        },
      },
      {
        id: `${descriptor.id}-bar-end`,
        tag: 'polygon',
        attributes: {
          points: `${x + width / 2},${y} ${x + width},${y} ${x + width},${y + height} ${x + width / 2},${y + height}`,
          fill: descriptor.endColor,
        },
      },
      ...ticks.map((tick, index) => ({
        id: `${descriptor.id}-tick-${index}`,
        tag: 'text' as const,
        attributes: {
          x: `${x + (index === 0 ? 0 : width)}`,
          y: `${y + height + 12}`,
          text: `${tick}`,
        },
      })),
    ];
  }

  public renderDiscrete(
    descriptor: DiscreteLegendDescriptor,
    x: number,
    y: number,
    configuration: LegendConfiguration = {},
  ): ReadonlyArray<SvgRenderNode> {
    const config = {
      ...DEFAULT_CONFIG,
      ...configuration,
    };

    return descriptor.items.flatMap((item, index) => {
      const offsetY = y + index * config.itemHeight;

      return [
        {
          id: `${descriptor.id}-swatch-${index}`,
          tag: 'polygon' as const,
          attributes: {
            points: `${x},${offsetY} ${x + 12},${offsetY} ${x + 12},${offsetY + 12} ${x},${offsetY + 12}`,
            fill: item.color,
          },
        },
        {
          id: `${descriptor.id}-label-${index}`,
          tag: 'text' as const,
          attributes: {
            x: `${x + 18}`,
            y: `${offsetY + 10}`,
            text: item.label,
          },
        },
      ];
    });
  }

  public renderCategorical(
    descriptor: CategoricalLegendDescriptor,
    x: number,
    y: number,
    configuration: LegendConfiguration = {},
  ): ReadonlyArray<SvgRenderNode> {
    const config = {
      ...DEFAULT_CONFIG,
      ...configuration,
    };

    return descriptor.items.flatMap((item, index) => {
      const offsetY = y + index * config.itemHeight;
      const symbol =
        item.shape === 'line'
          ? {
              id: `${descriptor.id}-symbol-${index}`,
              tag: 'polyline' as const,
              attributes: {
                points: `${x},${offsetY + 6} ${x + 12},${offsetY + 6}`,
                stroke: item.color,
              },
            }
          : {
              id: `${descriptor.id}-symbol-${index}`,
              tag: 'circle' as const,
              attributes: {
                cx: `${x + 6}`,
                cy: `${offsetY + 6}`,
                r: '5',
                fill: item.color,
              },
            };

      return [
        symbol,
        {
          id: `${descriptor.id}-label-${index}`,
          tag: 'text' as const,
          attributes: {
            x: `${x + 18}`,
            y: `${offsetY + 10}`,
            text: item.label,
          },
        },
      ];
    });
  }

  public update(
    descriptors: ReadonlyArray<LegendDescriptor>,
    configuration: LegendConfiguration = {},
  ): ReadonlyArray<SvgRenderNode> {
    return this.render(descriptors, configuration);
  }

  public clear(): void {
    this.nodes = [];
  }

  public toggleCollapse(): boolean {
    this.collapsed = !this.collapsed;

    return this.collapsed;
  }

  public getNodes(): ReadonlyArray<SvgRenderNode> {
    return this.nodes;
  }

  private resolveOrigin(config: Required<typeof DEFAULT_CONFIG>): { readonly x: number; readonly y: number } {
    const margin = config.padding;
    const x = config.position.endsWith('right')
      ? config.surfaceWidth - config.width - margin
      : margin;
    const y = config.position.startsWith('bottom')
      ? config.surfaceHeight - margin - config.itemHeight
      : margin;

    return { x, y };
  }
}
