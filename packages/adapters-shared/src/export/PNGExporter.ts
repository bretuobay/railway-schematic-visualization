import { ExportError } from '../errors';
import type { PNGExportConfig, SVGExportConfig } from '../types';

import type {
  ExportOverlayManager,
  ExportRenderer,
  ExportViewport,
} from './contracts';
import { SVGExporter } from './SVGExporter';

interface CanvasContextLike {
  fillStyle: string | CanvasGradient | CanvasPattern;
  imageSmoothingEnabled?: boolean;
  fillRect(x: number, y: number, width: number, height: number): void;
  drawImage(
    image: unknown,
    dx: number,
    dy: number,
    dWidth: number,
    dHeight: number,
  ): void;
}

interface CanvasLike {
  width: number;
  height: number;
  getContext(type: '2d'): CanvasContextLike | null;
  toDataURL(type?: string, quality?: number): string;
}

interface ImageLike {
  onload: (() => void) | null;
  onerror: ((error?: unknown) => void) | null;
  src: string;
}

interface PNGExportPlatform {
  createCanvas(width: number, height: number): CanvasLike;
  createImage(): ImageLike;
}

interface ResolvedPNGConfig {
  logicalWidth?: number;
  logicalHeight?: number;
  scale: number;
  format: 'png' | 'jpeg' | 'webp';
  quality: number;
  backgroundColor?: string;
  includeOverlays?: ReadonlyArray<string> | 'all';
  excludeOverlays: ReadonlyArray<string>;
  viewportMode: 'current' | 'full' | 'selection';
  selectedElements: ReadonlyArray<string>;
}

interface Dimensions {
  width: number;
  height: number;
}

const DEFAULT_PNG_QUALITY = 0.92;
const MAX_CANVAS_WIDTH = 8192;
const MAX_CANVAS_HEIGHT = 8192;
const MAX_CANVAS_AREA = 67_108_864;

export class PNGExporter {
  private readonly svgExporter: SVGExporter;
  private readonly platform: PNGExportPlatform;

  public constructor(
    svgExporter: SVGExporter = new SVGExporter(),
    platform: Partial<PNGExportPlatform> = {},
  ) {
    this.svgExporter = svgExporter;
    this.platform = {
      createCanvas: (width, height) => this.createCanvas(width, height),
      createImage: () => this.createImage(),
      ...platform,
    };
  }

  public async exportPNG(
    renderer: ExportRenderer,
    viewport: ExportViewport,
    overlayManager: ExportOverlayManager,
    config: PNGExportConfig = {},
  ): Promise<string> {
    const resolvedConfig = this.resolveConfig(config);
    const baseSVGConfig = this.createSVGExportConfig(resolvedConfig);
    const baseSVG = await this.svgExporter.exportSVG(
      renderer,
      viewport,
      overlayManager,
      baseSVGConfig,
    );
    const logicalDimensions = this.resolveLogicalDimensions(baseSVG, resolvedConfig);
    const rasterDimensions = {
      width: Math.max(1, Math.round(logicalDimensions.width * resolvedConfig.scale)),
      height: Math.max(1, Math.round(logicalDimensions.height * resolvedConfig.scale)),
    };

    this.checkCanvasSizeLimits(rasterDimensions.width, rasterDimensions.height);

    const svgString =
      resolvedConfig.logicalWidth !== undefined || resolvedConfig.logicalHeight !== undefined
        ? await this.svgExporter.exportSVG(
            renderer,
            viewport,
            overlayManager,
            this.createSVGExportConfig(resolvedConfig, logicalDimensions),
          )
        : baseSVG;
    const canvas = this.platform.createCanvas(rasterDimensions.width, rasterDimensions.height);
    const image = this.platform.createImage();

    await this.loadImage(image, this.svgToDataURL(svgString));
    this.drawToCanvas(canvas, image, rasterDimensions, resolvedConfig);

    return this.canvasToDataURL(canvas, resolvedConfig.format, resolvedConfig.quality);
  }

  private resolveConfig(config: PNGExportConfig): ResolvedPNGConfig {
    const scale =
      typeof config.scale === 'number' && Number.isFinite(config.scale) && config.scale > 0
        ? config.scale
        : 1;
    const logicalWidth =
      typeof config.width === 'number' && Number.isFinite(config.width) && config.width > 0
        ? config.width
        : undefined;
    const logicalHeight =
      typeof config.height === 'number' && Number.isFinite(config.height) && config.height > 0
        ? config.height
        : undefined;
    const backgroundColor =
      typeof config.backgroundColor === 'string' && config.backgroundColor.trim().length > 0
        ? config.backgroundColor.trim()
        : undefined;

    return {
      ...(logicalWidth !== undefined ? { logicalWidth } : {}),
      ...(logicalHeight !== undefined ? { logicalHeight } : {}),
      scale,
      format: config.format ?? 'png',
      quality:
        typeof config.quality === 'number' && Number.isFinite(config.quality)
          ? Math.min(1, Math.max(0, config.quality))
          : DEFAULT_PNG_QUALITY,
      ...(backgroundColor !== undefined ? { backgroundColor } : {}),
      ...(config.includeOverlays !== undefined
        ? { includeOverlays: config.includeOverlays }
        : {}),
      excludeOverlays: config.excludeOverlays ?? [],
      viewportMode: config.viewportMode ?? 'current',
      selectedElements: config.selectedElements ?? [],
    };
  }

  private createSVGExportConfig(
    config: ResolvedPNGConfig,
    dimensions?: Dimensions,
  ): SVGExportConfig {
    return {
      ...(dimensions !== undefined ? { width: dimensions.width, height: dimensions.height } : {}),
      ...(config.includeOverlays !== undefined
        ? { includeOverlays: config.includeOverlays }
        : {}),
      ...(config.excludeOverlays.length > 0
        ? { excludeOverlays: config.excludeOverlays }
        : {}),
      viewportMode: config.viewportMode,
      ...(config.selectedElements.length > 0
        ? { selectedElements: config.selectedElements }
        : {}),
    };
  }

  private resolveLogicalDimensions(svgString: string, config: ResolvedPNGConfig): Dimensions {
    const intrinsicDimensions = this.readIntrinsicDimensions(svgString);
    const aspectRatio =
      intrinsicDimensions.width > 0 && intrinsicDimensions.height > 0
        ? intrinsicDimensions.width / intrinsicDimensions.height
        : 1;

    if (config.logicalWidth !== undefined && config.logicalHeight !== undefined) {
      return {
        width: config.logicalWidth,
        height: config.logicalHeight,
      };
    }

    if (config.logicalWidth !== undefined) {
      return {
        width: config.logicalWidth,
        height: Math.max(1, Math.round(config.logicalWidth / aspectRatio)),
      };
    }

    if (config.logicalHeight !== undefined) {
      return {
        width: Math.max(1, Math.round(config.logicalHeight * aspectRatio)),
        height: config.logicalHeight,
      };
    }

    return intrinsicDimensions;
  }

  private readIntrinsicDimensions(svgString: string): Dimensions {
    const width = this.readNumericRootAttribute(svgString, 'width');
    const height = this.readNumericRootAttribute(svgString, 'height');

    if (width !== undefined && height !== undefined) {
      return {
        width: Math.max(1, width),
        height: Math.max(1, height),
      };
    }

    const viewBox = this.readRootAttribute(svgString, 'viewBox');

    if (viewBox) {
      const parts = viewBox
        .trim()
        .split(/\s+/)
        .map((part) => Number(part));

      if (parts.length === 4 && parts.every((part) => Number.isFinite(part))) {
        return {
          width: Math.max(1, parts[2] ?? 1),
          height: Math.max(1, parts[3] ?? 1),
        };
      }
    }

    return { width: 100, height: 100 };
  }

  private readRootAttribute(svgString: string, attribute: string): string | undefined {
    const rootMatch = svgString.match(/<svg\b([^>]*)>/);
    const attributes = rootMatch?.[1];

    if (!attributes) {
      return undefined;
    }

    const match = attributes.match(new RegExp(`\\s${attribute}=(['"])(.*?)\\1`));

    return match?.[2];
  }

  private readNumericRootAttribute(svgString: string, attribute: string): number | undefined {
    const value = this.readRootAttribute(svgString, attribute);

    if (value === undefined) {
      return undefined;
    }

    const numericValue = Number.parseFloat(value);

    return Number.isFinite(numericValue) ? numericValue : undefined;
  }

  private createCanvas(width: number, height: number): CanvasLike {
    if (typeof document === 'undefined') {
      throw new ExportError('PNG export requires a Canvas implementation.', {
        stage: 'create-canvas',
      });
    }

    const canvas = document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;

    return canvas as unknown as CanvasLike;
  }

  private createImage(): ImageLike {
    if (typeof Image === 'undefined') {
      throw new ExportError('PNG export requires an Image implementation.', {
        stage: 'create-image',
      });
    }

    const image = new Image();

    image.onload = null;
    image.onerror = null;

    return image as unknown as ImageLike;
  }

  private svgToDataURL(svgString: string): string {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
  }

  private async loadImage(image: ImageLike, source: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = (error) => {
        reject(
          new ExportError('PNG export failed while loading the SVG into an image.', {
            stage: 'load-image',
            cause: error,
          }),
        );
      };
      image.src = source;
    });
  }

  private drawToCanvas(
    canvas: CanvasLike,
    image: ImageLike,
    dimensions: Dimensions,
    config: ResolvedPNGConfig,
  ): void {
    const context = canvas.getContext('2d');

    if (!context) {
      throw new ExportError('PNG export could not acquire a 2D canvas context.', {
        stage: 'draw-canvas',
      });
    }

    if (config.backgroundColor !== undefined) {
      context.fillStyle = config.backgroundColor;
      context.fillRect(0, 0, dimensions.width, dimensions.height);
    }

    if ('imageSmoothingEnabled' in context) {
      context.imageSmoothingEnabled = true;
    }

    context.drawImage(image, 0, 0, dimensions.width, dimensions.height);
  }

  private canvasToDataURL(
    canvas: CanvasLike,
    format: ResolvedPNGConfig['format'],
    quality: number,
  ): string {
    const mimeType = this.toMimeType(format);

    return canvas.toDataURL(mimeType, format === 'png' ? undefined : quality);
  }

  private toMimeType(format: ResolvedPNGConfig['format']): string {
    switch (format) {
      case 'jpeg':
        return 'image/jpeg';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/png';
    }
  }

  private checkCanvasSizeLimits(width: number, height: number): void {
    if (
      width > MAX_CANVAS_WIDTH
      || height > MAX_CANVAS_HEIGHT
      || width * height > MAX_CANVAS_AREA
    ) {
      throw new ExportError('PNG export exceeds safe canvas size limits.', {
        stage: 'check-canvas-size',
        width,
        height,
        maxWidth: MAX_CANVAS_WIDTH,
        maxHeight: MAX_CANVAS_HEIGHT,
        maxArea: MAX_CANVAS_AREA,
      });
    }
  }
}
