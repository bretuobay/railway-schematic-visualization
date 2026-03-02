import { sortByRenderOrder } from './UpdatePattern';
import type {
  CanvasLike,
  RenderElement,
  RenderStrategy,
} from './types';

export interface CanvasRendererOptions {
  readonly width?: number;
  readonly height?: number;
  readonly useOffscreenCanvas?: boolean;
}

function applyStyle(target: CanvasLike, element: RenderElement): void {
  if (element.style?.fill !== undefined) {
    target.fillStyle = element.style.fill;
  }

  if (element.style?.stroke !== undefined) {
    target.strokeStyle = element.style.stroke;
  }

  if (element.style?.strokeWidth !== undefined) {
    target.lineWidth = element.style.strokeWidth;
  }

  target.globalAlpha = element.style?.opacity ?? 1;
  target.setLineDash?.(element.style?.dashArray ?? []);
}

export class CanvasRenderer
  implements RenderStrategy<CanvasLike, { readonly elementCount: number; readonly usedOffscreenCanvas: boolean }>
{
  private readonly options: CanvasRendererOptions;

  public constructor(options: CanvasRendererOptions = {}) {
    this.options = options;
  }

  public render(
    target: CanvasLike,
    elements: ReadonlyArray<RenderElement>,
  ): { readonly elementCount: number; readonly usedOffscreenCanvas: boolean } {
    return this.update(target, elements);
  }

  public update(
    target: CanvasLike,
    elements: ReadonlyArray<RenderElement>,
  ): { readonly elementCount: number; readonly usedOffscreenCanvas: boolean } {
    const renderTarget =
      this.options.useOffscreenCanvas && typeof target.transferToOffscreen === 'function'
        ? target.transferToOffscreen()
        : target;

    for (const element of sortByRenderOrder(elements)) {
      this.drawElement(renderTarget, element);
    }

    return {
      elementCount: elements.length,
      usedOffscreenCanvas: renderTarget !== target,
    };
  }

  public clear(target: CanvasLike): void {
    target.clearRect?.(
      0,
      0,
      this.options.width ?? 0,
      this.options.height ?? 0,
    );
  }

  private drawElement(target: CanvasLike, element: RenderElement): void {
    applyStyle(target, element);
    target.beginPath?.();

    switch (element.geometry.type) {
      case 'point':
        target.arc?.(
          element.geometry.x,
          element.geometry.y,
          element.geometry.radius ?? 4,
          0,
          Math.PI * 2,
        );
        target.fill?.();

        if (element.geometry.label) {
          target.fillText?.(
            element.geometry.label,
            element.geometry.x + (element.geometry.radius ?? 4) + 4,
            element.geometry.y,
          );
        }

        break;
      case 'line':
        this.drawPolyline(target, element.geometry.points, false);
        target.stroke?.();
        break;
      case 'polygon':
        this.drawPolyline(target, element.geometry.points, true);
        target.fill?.();
        target.stroke?.();
        break;
      case 'path':
        for (const command of element.geometry.commands) {
          switch (command.command) {
            case 'M':
              target.moveTo?.(command.values[0] ?? 0, command.values[1] ?? 0);
              break;
            case 'L':
              target.lineTo?.(command.values[0] ?? 0, command.values[1] ?? 0);
              break;
            case 'Q':
              target.quadraticCurveTo?.(
                command.values[0] ?? 0,
                command.values[1] ?? 0,
                command.values[2] ?? 0,
                command.values[3] ?? 0,
              );
              break;
            case 'C':
              target.bezierCurveTo?.(
                command.values[0] ?? 0,
                command.values[1] ?? 0,
                command.values[2] ?? 0,
                command.values[3] ?? 0,
                command.values[4] ?? 0,
                command.values[5] ?? 0,
              );
              break;
            case 'Z':
              target.closePath?.();
              break;
          }
        }

        target.stroke?.();
        break;
    }
  }

  private drawPolyline(
    target: CanvasLike,
    points: ReadonlyArray<readonly [number, number]>,
    close: boolean,
  ): void {
    points.forEach((point, index) => {
      if (index === 0) {
        target.moveTo?.(point[0], point[1]);
        return;
      }

      target.lineTo?.(point[0], point[1]);
    });

    if (close) {
      target.closePath?.();
    }
  }
}
