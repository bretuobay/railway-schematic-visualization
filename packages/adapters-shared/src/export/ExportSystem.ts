import { ExportError } from '../errors';
import type {
  ExportEvent,
  ExportEventHandler,
  ExportEventPayload,
  PNGExportConfig,
  PrintConfig,
  SVGExportConfig,
} from '../types';

import type {
  ExportOverlayManager,
  ExportRenderer,
  ExportViewport,
} from './contracts';
import { PNGExporter } from './PNGExporter';
import { PrintExporter } from './PrintExporter';
import { SVGExporter } from './SVGExporter';

type ExportEventMap = Map<ExportEvent, Set<ExportEventHandler>>;
export type { ExportOverlayManager, ExportRenderer, ExportViewport } from './contracts';

export class ExportSystem {
  private readonly handlers: ExportEventMap = new Map();
  private readonly svgExporter = new SVGExporter();
  private readonly pngExporter = new PNGExporter(this.svgExporter);
  private readonly printExporter = new PrintExporter(this.svgExporter);
  private readonly renderer: ExportRenderer;
  private readonly viewport: ExportViewport;
  private readonly overlayManager: ExportOverlayManager;
  private printConfig: PrintConfig = {};

  public constructor(
    renderer: ExportRenderer,
    viewport: ExportViewport,
    overlayManager: ExportOverlayManager,
  ) {
    this.renderer = renderer;
    this.viewport = viewport;
    this.overlayManager = overlayManager;
  }

  public async exportSVG(config: SVGExportConfig = {}): Promise<string> {
    this.emit({
      event: 'export-start',
      format: 'svg',
      stage: 'initializing',
      progress: 0,
      config,
    });

    try {
      this.emit({
        event: 'export-progress',
        format: 'svg',
        stage: 'serializing',
        progress: 0.5,
        config,
      });

      const output = await this.svgExporter.exportSVG(
        this.renderer,
        this.viewport,
        this.overlayManager,
        config,
      );

      this.emit({
        event: 'export-progress',
        format: 'svg',
        stage: 'finalizing',
        progress: 1,
        config,
      });
      this.emit({
        event: 'export-complete',
        format: 'svg',
        stage: 'complete',
        progress: 1,
        output,
        config,
      });

      return output;
    } catch (error) {
      const exportError =
        error instanceof Error
          ? error
          : new ExportError('SVG export failed unexpectedly.', {
              cause: error,
              stage: 'export-svg',
            });

      this.emit({
        event: 'export-error',
        format: 'svg',
        stage: 'failed',
        progress: 1,
        error: exportError,
        config,
      });

      throw exportError;
    }
  }

  public async exportPNG(config: PNGExportConfig = {}): Promise<string> {
    this.emit({
      event: 'export-start',
      format: 'png',
      stage: 'initializing',
      progress: 0,
      config,
    });

    try {
      this.emit({
        event: 'export-progress',
        format: 'png',
        stage: 'serializing',
        progress: 0.35,
        config,
      });

      const output = await this.pngExporter.exportPNG(
        this.renderer,
        this.viewport,
        this.overlayManager,
        config,
      );

      this.emit({
        event: 'export-progress',
        format: 'png',
        stage: 'rasterizing',
        progress: 1,
        config,
      });
      this.emit({
        event: 'export-complete',
        format: 'png',
        stage: 'complete',
        progress: 1,
        output,
        config,
      });

      return output;
    } catch (error) {
      const exportError =
        error instanceof Error
          ? error
          : new ExportError('PNG export failed unexpectedly.', {
              cause: error,
              stage: 'export-png',
            });

      this.emit({
        event: 'export-error',
        format: 'png',
        stage: 'failed',
        progress: 1,
        error: exportError,
        config,
      });

      throw exportError;
    }
  }

  public configurePrint(config: PrintConfig): void {
    this.printConfig = { ...config };
    this.printExporter.configurePrint(config);
  }

  public async printPreview(): Promise<string> {
    this.emit({
      event: 'export-start',
      format: 'print',
      stage: 'initializing',
      progress: 0,
      config: this.printConfig,
    });

    try {
      const result = await this.printExporter.printPreview(
        this.renderer,
        this.viewport,
        this.overlayManager,
      );

      this.emit({
        event: 'export-progress',
        format: 'print',
        stage: 'preview-ready',
        progress: 1,
        config: this.printConfig,
      });
      this.emit({
        event: 'export-complete',
        format: 'print',
        stage: 'complete',
        progress: 1,
        output: result.markup,
        config: this.printConfig,
      });

      return result.markup;
    } catch (error) {
      const exportError =
        error instanceof Error
          ? error
          : new ExportError('Print preview failed unexpectedly.', {
              cause: error,
              stage: 'print-preview',
            });

      this.emit({
        event: 'export-error',
        format: 'print',
        stage: 'failed',
        progress: 1,
        error: exportError,
        config: this.printConfig,
      });

      throw exportError;
    }
  }

  public async print(): Promise<void> {
    this.emit({
      event: 'export-start',
      format: 'print',
      stage: 'initializing',
      progress: 0,
      config: this.printConfig,
    });

    try {
      await this.printExporter.print(
        this.renderer,
        this.viewport,
        this.overlayManager,
      );

      this.emit({
        event: 'export-progress',
        format: 'print',
        stage: 'sent-to-browser',
        progress: 1,
        config: this.printConfig,
      });
      this.emit({
        event: 'export-complete',
        format: 'print',
        stage: 'complete',
        progress: 1,
        config: this.printConfig,
      });
    } catch (error) {
      const exportError =
        error instanceof Error
          ? error
          : new ExportError('Print export failed unexpectedly.', {
              cause: error,
              stage: 'print',
            });

      this.emit({
        event: 'export-error',
        format: 'print',
        stage: 'failed',
        progress: 1,
        error: exportError,
        config: this.printConfig,
      });

      throw exportError;
    }
  }

  public on(event: ExportEvent, handler: ExportEventHandler): void {
    const handlers = this.handlers.get(event) ?? new Set<ExportEventHandler>();

    handlers.add(handler);
    this.handlers.set(event, handlers);
  }

  public off(event: ExportEvent, handler: ExportEventHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  private emit(payload: ExportEventPayload): void {
    this.handlers.get(payload.event)?.forEach((handler) => handler(payload));
  }
}
