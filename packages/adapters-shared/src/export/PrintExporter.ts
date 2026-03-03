import { ADAPTERS_SHARED_METADATA } from '../metadata';
import type { PrintConfig, SVGExportConfig } from '../types';

import type {
  ExportOverlayManager,
  ExportRenderer,
  ExportViewport,
} from './contracts';
import { SVGExporter } from './SVGExporter';

interface BoundingBox {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

interface ResolvedPrintConfig {
  readonly pageSize: {
    readonly width: number;
    readonly height: number;
    readonly cssValue: string;
  };
  readonly orientation: 'portrait' | 'landscape';
  readonly margins: {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
  };
  readonly includeLegend: boolean;
  readonly includeScaleBar: boolean;
  readonly includeMetadata: boolean;
  readonly multiPage: boolean;
}

export interface PageLayout {
  readonly pages: number;
  readonly pageWidth: number;
  readonly pageHeight: number;
  readonly contentBounds: ReadonlyArray<BoundingBox>;
}

export interface PrintPreviewResult {
  readonly markup: string;
  readonly stylesheet: string;
  readonly layout: PageLayout;
}

interface PrintPlatform {
  mountStylesheet(css: string): void;
  mountPreview(markup: string): void;
  triggerPrint(): void;
}

const DEFAULT_MARGINS = {
  top: 12,
  right: 12,
  bottom: 12,
  left: 12,
} as const;

const PAGE_SIZES = {
  A4: { width: 210, height: 297 },
  Letter: { width: 216, height: 279 },
  Legal: { width: 216, height: 356 },
} as const;

export class PrintExporter {
  private readonly svgExporter: SVGExporter;
  private readonly platform: PrintPlatform;
  private config: ResolvedPrintConfig;

  public constructor(
    svgExporter: SVGExporter = new SVGExporter(),
    platform?: Partial<PrintPlatform>,
  ) {
    this.svgExporter = svgExporter;
    this.platform = {
      mountStylesheet: (css) => this.mountStylesheet(css),
      mountPreview: (markup) => this.mountPreview(markup),
      triggerPrint: () => this.triggerPrint(),
      ...platform,
    };
    this.config = this.resolveConfig();
  }

  public configurePrint(config: PrintConfig = {}): void {
    this.config = this.resolveConfig(config);
    this.platform.mountStylesheet(this.generatePrintStylesheet(this.config));
  }

  public async printPreview(
    renderer: ExportRenderer,
    viewport: ExportViewport,
    overlayManager: ExportOverlayManager,
  ): Promise<PrintPreviewResult> {
    const result = await this.renderPrintPreview(renderer, viewport, overlayManager);

    this.platform.mountStylesheet(result.stylesheet);
    this.platform.mountPreview(result.markup);

    return result;
  }

  public async print(
    renderer: ExportRenderer,
    viewport: ExportViewport,
    overlayManager: ExportOverlayManager,
  ): Promise<PrintPreviewResult> {
    const result = await this.printPreview(renderer, viewport, overlayManager);

    this.platform.triggerPrint();

    return result;
  }

  private async renderPrintPreview(
    renderer: ExportRenderer,
    viewport: ExportViewport,
    overlayManager: ExportOverlayManager,
  ): Promise<PrintPreviewResult> {
    const bounds = viewport.getVisibleBounds();
    const layout = this.calculatePageLayout(bounds, this.config);
    const stylesheet = this.generatePrintStylesheet(this.config);
    const svg = await this.svgExporter.exportSVG(
      renderer,
      viewport,
      overlayManager,
      this.createSVGConfig(bounds),
    );
    const legendMarkup = this.config.includeLegend
      ? this.renderLegend(overlayManager.getAllOverlays())
      : '';
    const scaleBarMarkup = this.config.includeScaleBar
      ? this.renderScaleBar(bounds)
      : '';
    const metadataMarkup = this.config.includeMetadata
      ? this.renderMetadata(layout)
      : '';
    const pageMarkup = layout.contentBounds
      .map(
        (_segment, index) => `<article class="print-page" data-page-index="${index + 1}">
  <div class="print-diagram">${svg}</div>
</article>`,
      )
      .join('');
    const markup = `<section class="rail-schematic-print-preview" data-pages="${layout.pages}" data-orientation="${this.config.orientation}">
  ${pageMarkup}
  ${legendMarkup}
  ${scaleBarMarkup}
  ${metadataMarkup}
</section>`;

    return {
      markup,
      stylesheet,
      layout,
    };
  }

  private createSVGConfig(bounds: BoundingBox): SVGExportConfig {
    return {
      viewportMode: 'current',
      width: Math.max(1, Math.round(bounds.maxX - bounds.minX)),
      height: Math.max(1, Math.round(bounds.maxY - bounds.minY)),
      prettyPrint: true,
    };
  }

  private resolveConfig(config: PrintConfig = {}): ResolvedPrintConfig {
    const resolvedPageSize =
      typeof config.pageSize === 'string' || config.pageSize === undefined
        ? PAGE_SIZES[config.pageSize ?? 'A4']
        : {
            width:
              Number.isFinite(config.pageSize.width) && config.pageSize.width > 0
                ? config.pageSize.width
                : PAGE_SIZES.A4.width,
            height:
              Number.isFinite(config.pageSize.height) && config.pageSize.height > 0
                ? config.pageSize.height
                : PAGE_SIZES.A4.height,
          };
    const margins = {
      top:
        Number.isFinite(config.margins?.top) && (config.margins?.top ?? 0) >= 0
          ? (config.margins?.top ?? DEFAULT_MARGINS.top)
          : DEFAULT_MARGINS.top,
      right:
        Number.isFinite(config.margins?.right) && (config.margins?.right ?? 0) >= 0
          ? (config.margins?.right ?? DEFAULT_MARGINS.right)
          : DEFAULT_MARGINS.right,
      bottom:
        Number.isFinite(config.margins?.bottom) && (config.margins?.bottom ?? 0) >= 0
          ? (config.margins?.bottom ?? DEFAULT_MARGINS.bottom)
          : DEFAULT_MARGINS.bottom,
      left:
        Number.isFinite(config.margins?.left) && (config.margins?.left ?? 0) >= 0
          ? (config.margins?.left ?? DEFAULT_MARGINS.left)
          : DEFAULT_MARGINS.left,
    };

    return {
      pageSize: {
        ...resolvedPageSize,
        cssValue:
          typeof config.pageSize === 'object' && config.pageSize !== undefined
            ? `${resolvedPageSize.width}mm ${resolvedPageSize.height}mm`
            : `${resolvedPageSize.width}mm ${resolvedPageSize.height}mm`,
      },
      orientation: config.orientation ?? 'portrait',
      margins,
      includeLegend: config.includeLegend ?? true,
      includeScaleBar: config.includeScaleBar ?? true,
      includeMetadata: config.includeMetadata ?? true,
      multiPage: config.multiPage ?? false,
    };
  }

  private generatePrintStylesheet(config: ResolvedPrintConfig): string {
    const marginValue = `${config.margins.top}mm ${config.margins.right}mm ${config.margins.bottom}mm ${config.margins.left}mm`;

    return `@page {
  size: ${config.pageSize.cssValue} ${config.orientation};
  margin: ${marginValue};
}
@media print {
  .rail-schematic-print-preview {
    color: #000;
    background: #fff;
    font-family: system-ui, sans-serif;
  }
  .rail-schematic-print-preview svg {
    width: 100%;
    height: auto;
    max-width: 100%;
    filter: grayscale(100%) contrast(1.25);
  }
  .rail-schematic-print-preview .print-page {
    break-inside: avoid;
    ${config.multiPage ? 'break-after: page;' : ''}
  }
  .rail-schematic-print-preview .print-legend,
  .rail-schematic-print-preview .print-scale-bar,
  .rail-schematic-print-preview .print-metadata {
    color: #000;
    border-color: #000;
  }
}`;
  }

  private calculatePageLayout(
    bounds: BoundingBox,
    config: ResolvedPrintConfig,
  ): PageLayout {
    const contentWidth = Math.max(1, config.pageSize.width - config.margins.left - config.margins.right);
    const contentHeight = Math.max(1, config.pageSize.height - config.margins.top - config.margins.bottom);
    const totalWidth = Math.max(1, bounds.maxX - bounds.minX);
    const totalHeight = Math.max(1, bounds.maxY - bounds.minY);
    const horizontalPages = config.multiPage ? Math.max(1, Math.ceil(totalWidth / contentWidth)) : 1;
    const verticalPages = config.multiPage ? Math.max(1, Math.ceil(totalHeight / contentHeight)) : 1;
    const contentBounds: BoundingBox[] = [];

    for (let row = 0; row < verticalPages; row += 1) {
      for (let column = 0; column < horizontalPages; column += 1) {
        const minX = bounds.minX + column * contentWidth;
        const minY = bounds.minY + row * contentHeight;

        contentBounds.push({
          minX,
          minY,
          maxX: Math.min(minX + contentWidth, bounds.maxX),
          maxY: Math.min(minY + contentHeight, bounds.maxY),
        });
      }
    }

    return {
      pages: contentBounds.length,
      pageWidth: contentWidth,
      pageHeight: contentHeight,
      contentBounds,
    };
  }

  private renderLegend(
    overlays: ReadonlyArray<{
      readonly id: string;
      readonly visible: boolean;
    }>,
  ): string {
    const visibleOverlays = overlays.filter((overlay) => overlay.visible);

    if (visibleOverlays.length === 0) {
      return '';
    }

    const items = visibleOverlays
      .map((overlay) => `<li class="print-legend-item">${this.escapeHTML(overlay.id)}</li>`)
      .join('');

    return `<aside class="print-legend">
  <h2>Visible Overlays</h2>
  <ul>${items}</ul>
</aside>`;
  }

  private renderScaleBar(bounds: BoundingBox): string {
    const visibleWidth = Math.max(1, bounds.maxX - bounds.minX);
    const scaleLength = this.roundScaleLength(visibleWidth / 5);

    return `<div class="print-scale-bar" data-scale-length="${scaleLength}">
  <span class="print-scale-bar-line"></span>
  <span class="print-scale-bar-label">${scaleLength} units</span>
</div>`;
  }

  private roundScaleLength(value: number): number {
    if (value <= 1) {
      return 1;
    }

    const magnitude = 10 ** Math.floor(Math.log10(value));
    const normalized = value / magnitude;

    if (normalized >= 5) {
      return 5 * magnitude;
    }

    if (normalized >= 2) {
      return 2 * magnitude;
    }

    return magnitude;
  }

  private renderMetadata(layout: PageLayout): string {
    return `<footer class="print-metadata">
  <span>Exported ${new Date().toISOString()}</span>
  <span>${this.escapeHTML(ADAPTERS_SHARED_METADATA.packageName)}</span>
  <span>${layout.pages} page(s)</span>
</footer>`;
  }

  private escapeHTML(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private mountStylesheet(css: string): void {
    if (typeof document === 'undefined') {
      return;
    }

    let styleElement = document.querySelector(
      'style[data-rail-schematic-print-style="true"]',
    ) as HTMLStyleElement | null;

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.setAttribute('data-rail-schematic-print-style', 'true');
      (document.head ?? document.body)?.appendChild(styleElement);
    }

    styleElement.textContent = css;
  }

  private mountPreview(markup: string): void {
    if (typeof document === 'undefined') {
      return;
    }

    let previewElement = document.querySelector(
      '[data-rail-schematic-print-preview-host="true"]',
    ) as HTMLElement | null;

    if (!previewElement) {
      previewElement = document.createElement('section');
      previewElement.setAttribute('data-rail-schematic-print-preview-host', 'true');
      document.body?.appendChild(previewElement);
    }

    previewElement.innerHTML = markup;
  }

  private triggerPrint(): void {
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
  }
}
