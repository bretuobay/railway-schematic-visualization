import { UpdatePattern, sortByRenderOrder } from './UpdatePattern';
import type {
  RenderElement,
  RenderStrategy,
  SvgRenderNode,
  SvgTargetLike,
} from './types';

function formatStyle(element: RenderElement): Record<string, string> {
  const attributes: Record<string, string> = {};

  if (element.style?.fill) {
    attributes.fill = element.style.fill;
  }

  if (element.style?.stroke) {
    attributes.stroke = element.style.stroke;
  }

  if (element.style?.strokeWidth !== undefined) {
    attributes['stroke-width'] = `${element.style.strokeWidth}`;
  }

  if (element.style?.opacity !== undefined) {
    attributes.opacity = `${element.style.opacity}`;
  }

  if (element.style?.dashArray && element.style.dashArray.length > 0) {
    attributes['stroke-dasharray'] = element.style.dashArray.join(' ');
  }

  return attributes;
}

function toPath(commands: RenderElement['geometry'] extends infer T ? T : never): string {
  if (!commands || typeof commands !== 'object' || !('commands' in commands)) {
    return '';
  }

  return commands.commands
    .map((entry) => `${entry.command} ${entry.values.join(' ')}`.trim())
    .join(' ');
}

export class SVGRenderer
  implements RenderStrategy<SvgTargetLike, ReadonlyArray<SvgRenderNode>>
{
  private readonly updatePattern = new UpdatePattern<RenderElement>();

  public render(
    target: SvgTargetLike,
    elements: ReadonlyArray<RenderElement>,
  ): ReadonlyArray<SvgRenderNode> {
    return this.update(target, elements);
  }

  public update(
    target: SvgTargetLike,
    elements: ReadonlyArray<RenderElement>,
  ): ReadonlyArray<SvgRenderNode> {
    const orderedElements = sortByRenderOrder(elements);

    this.updatePattern.apply(orderedElements);

    const nodes = orderedElements.flatMap((element) => this.createNodes(element));

    target.setNodes?.(nodes);

    return nodes;
  }

  public clear(target: SvgTargetLike): void {
    this.updatePattern.reset();
    target.clear?.();
  }

  private createNodes(element: RenderElement): Array<SvgRenderNode> {
    const style = formatStyle(element);

    switch (element.geometry.type) {
      case 'point': {
        const pointNode: SvgRenderNode = {
          id: element.id,
          tag: 'circle',
          attributes: {
            ...style,
            cx: `${element.geometry.x}`,
            cy: `${element.geometry.y}`,
            r: `${element.geometry.radius ?? 4}`,
          },
        };

        if (!element.geometry.label) {
          return [pointNode];
        }

        return [
          pointNode,
          {
            id: `${element.id}-label`,
            tag: 'text',
            attributes: {
              ...style,
              x: `${element.geometry.x + (element.geometry.radius ?? 4) + 4}`,
              y: `${element.geometry.y}`,
              'font-size': `${element.style?.fontSize ?? 12}`,
              text: element.geometry.label,
            },
          },
        ];
      }
      case 'line':
        return [
          {
            id: element.id,
            tag: 'polyline',
            attributes: {
              ...style,
              points: element.geometry.points.map((point) => point.join(',')).join(' '),
            },
          },
        ];
      case 'polygon':
        return [
          {
            id: element.id,
            tag: 'polygon',
            attributes: {
              ...style,
              points: element.geometry.points.map((point) => point.join(',')).join(' '),
            },
          },
        ];
      case 'path':
        return [
          {
            id: element.id,
            tag: 'path',
            attributes: {
              ...style,
              d: toPath(element.geometry),
            },
          },
        ];
    }
  }
}
