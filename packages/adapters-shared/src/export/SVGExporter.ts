import { ExportError } from '../errors';
import { ADAPTERS_SHARED_METADATA } from '../metadata';
import type { SVGExportConfig } from '../types';
import type {
  ExportOverlayManager,
  ExportRenderer,
  ExportViewport,
} from './contracts';

interface ParsedSVGDocument {
  attributes: Map<string, string>;
  content: string;
}

interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface ResolvedSVGExportConfig {
  width?: string;
  height?: string;
  preserveAspectRatio: string;
  includeOverlays?: ReadonlyArray<string> | 'all';
  excludeOverlays: ReadonlyArray<string>;
  backgroundColor?: string;
  embedFonts: boolean;
  prettyPrint: boolean;
  viewportMode: 'current' | 'full' | 'selection';
  selectedElements: ReadonlyArray<string>;
}

const DEFAULT_PRESERVE_ASPECT_RATIO = 'xMidYMid meet';
const DEFAULT_VIEWBOX = '0 0 100 100';
const INLINE_EXPORT_STYLE = '.rail-schematic{shape-rendering:geometricPrecision;text-rendering:optimizeLegibility;}';
const FONT_EXPORT_STYLE = 'text,tspan{font-family:system-ui,sans-serif;}';
const ATTRIBUTES_TO_PARSE = new Set([
  'cx',
  'cy',
  'height',
  'id',
  'points',
  'r',
  'rx',
  'ry',
  'width',
  'x',
  'x1',
  'x2',
  'y',
  'y1',
  'y2',
  'data-overlay-id',
  'data-overlay',
]);

export class SVGExporter {
  public async exportSVG(
    renderer: ExportRenderer,
    viewport: ExportViewport,
    overlayManager: ExportOverlayManager,
    config: SVGExportConfig = {},
  ): Promise<string> {
    const svgMarkup = this.resolveSourceMarkup(renderer);
    const resolvedConfig = this.resolveConfig(config);
    let parsed = this.parseSVG(svgMarkup);

    if (resolvedConfig.viewportMode === 'selection') {
      parsed.content = this.filterToSelection(parsed.content, resolvedConfig.selectedElements);
    }

    parsed.content = this.filterOverlays(parsed.content, overlayManager, resolvedConfig);
    parsed = this.applyViewportTransform(parsed, viewport, resolvedConfig);
    parsed = this.applyRootAttributes(parsed, resolvedConfig);
    parsed.content = this.applyBackground(parsed, resolvedConfig.backgroundColor) + parsed.content;
    parsed.content = this.embedStyles(parsed.content);
    parsed.content = this.addMetadata(parsed.content);

    if (resolvedConfig.embedFonts) {
      parsed.content = await this.embedFonts(parsed.content);
    }

    const svgString = this.serializeToString(parsed, resolvedConfig.prettyPrint);

    this.validateSVG(svgString);

    return svgString;
  }

  private resolveSourceMarkup(renderer: ExportRenderer): string {
    const markupFromMethod = renderer.getSVGString?.();

    if (typeof markupFromMethod === 'string' && markupFromMethod.trim().length > 0) {
      return markupFromMethod;
    }

    if (typeof renderer.svgMarkup === 'string' && renderer.svgMarkup.trim().length > 0) {
      return renderer.svgMarkup;
    }

    const element = renderer.getSVGElement?.() ?? renderer.svgElement;

    if (element) {
      return this.serializeElement(this.cloneSVGTree(element));
    }

    throw new ExportError(
      'SVG export requires a renderer that exposes current SVG markup.',
      { stage: 'resolve-source' },
    );
  }

  private resolveConfig(config: SVGExportConfig): ResolvedSVGExportConfig {
    const width = this.normalizeLength(config.width);
    const height = this.normalizeLength(config.height);
    const backgroundColor =
      typeof config.backgroundColor === 'string' && config.backgroundColor.trim().length > 0
        ? config.backgroundColor.trim()
        : undefined;

    return {
      ...(width !== undefined ? { width } : {}),
      ...(height !== undefined ? { height } : {}),
      preserveAspectRatio:
        typeof config.preserveAspectRatio === 'string' && config.preserveAspectRatio.trim().length > 0
          ? config.preserveAspectRatio.trim()
          : DEFAULT_PRESERVE_ASPECT_RATIO,
      ...(config.includeOverlays !== undefined
        ? { includeOverlays: config.includeOverlays }
        : {}),
      excludeOverlays: config.excludeOverlays ?? [],
      ...(backgroundColor !== undefined ? { backgroundColor } : {}),
      embedFonts: config.embedFonts ?? false,
      prettyPrint: config.prettyPrint ?? false,
      viewportMode: config.viewportMode ?? 'current',
      selectedElements: config.selectedElements ?? [],
    };
  }

  private normalizeLength(length?: number | string): string | undefined {
    if (typeof length === 'number') {
      return Number.isFinite(length) && length > 0 ? `${length}` : undefined;
    }

    if (typeof length === 'string') {
      const trimmed = length.trim();

      return trimmed.length > 0 ? trimmed : undefined;
    }

    return undefined;
  }

  private cloneSVGTree(svgElement: SVGSVGElement): SVGSVGElement {
    return svgElement.cloneNode(true) as SVGSVGElement;
  }

  private serializeElement(svgElement: SVGSVGElement): string {
    if (typeof XMLSerializer !== 'undefined') {
      return new XMLSerializer().serializeToString(svgElement);
    }

    const elementWithMarkup = svgElement as SVGSVGElement & { outerHTML?: string };

    if (typeof elementWithMarkup.outerHTML === 'string') {
      return elementWithMarkup.outerHTML;
    }

    throw new ExportError(
      'Unable to serialize the current SVG element in this environment.',
      { stage: 'serialize-element' },
    );
  }

  private parseSVG(svgMarkup: string): ParsedSVGDocument {
    const match = svgMarkup.match(/<svg\b([^>]*)>([\s\S]*?)<\/svg>/i);

    if (!match) {
      throw new ExportError('Renderer did not provide a valid SVG root element.', {
        stage: 'parse-svg',
      });
    }

    return {
      attributes: this.parseAttributes(match[1] ?? ''),
      content: match[2] ?? '',
    };
  }

  private parseAttributes(source: string): Map<string, string> {
    const attributes = new Map<string, string>();
    const attributeExpression = /([:\w-]+)\s*=\s*(['"])(.*?)\2/g;

    for (const match of source.matchAll(attributeExpression)) {
      const name = match[1];
      const value = match[3] ?? '';

      if (name) {
        attributes.set(name, value);
      }
    }

    return attributes;
  }

  private parseElementAttributes(source: string): Map<string, string> {
    const attributes = new Map<string, string>();
    const attributeExpression = /([:\w-]+)\s*=\s*(['"])(.*?)\2/g;

    for (const match of source.matchAll(attributeExpression)) {
      const name = match[1];

      if (!name || !ATTRIBUTES_TO_PARSE.has(name)) {
        continue;
      }

      attributes.set(name, match[3] ?? '');
    }

    return attributes;
  }

  private filterToSelection(content: string, selectedElements: ReadonlyArray<string>): string {
    if (selectedElements.length === 0) {
      return content;
    }

    const allowed = new Set(selectedElements);
    let filteredContent = content;

    for (const elementId of this.findReferencedElementIds(content)) {
      if (allowed.has(elementId)) {
        continue;
      }

      filteredContent = this.removeElementMarkup(filteredContent, elementId);
    }

    return filteredContent;
  }

  private filterOverlays(
    content: string,
    overlayManager: ExportOverlayManager,
    config: ResolvedSVGExportConfig,
  ): string {
    const visibleOverlayIds = new Set(
      overlayManager
        .getAllOverlays()
        .filter((overlay) => overlay.visible)
        .map((overlay) => overlay.id),
    );
    const referencedOverlayIds = this.findReferencedOverlayIds(content);
    const candidateIds = new Set<string>([
      ...visibleOverlayIds,
      ...referencedOverlayIds,
      ...(config.excludeOverlays ?? []),
      ...(Array.isArray(config.includeOverlays) ? config.includeOverlays : []),
    ]);
    let allowedOverlayIds: Set<string> | undefined;

    if (config.includeOverlays === 'all') {
      allowedOverlayIds = visibleOverlayIds.size > 0 ? new Set(visibleOverlayIds) : undefined;
    } else if (Array.isArray(config.includeOverlays)) {
      const requested = new Set(config.includeOverlays);

      allowedOverlayIds =
        visibleOverlayIds.size > 0
          ? new Set(Array.from(visibleOverlayIds).filter((id) => requested.has(id)))
          : requested;
    } else if (visibleOverlayIds.size > 0) {
      allowedOverlayIds = new Set(visibleOverlayIds);
    }

    for (const excludedOverlayId of config.excludeOverlays) {
      allowedOverlayIds?.delete(excludedOverlayId);
    }

    let filteredContent = content;

    for (const overlayId of candidateIds) {
      if (!overlayId) {
        continue;
      }

      const shouldKeep =
        allowedOverlayIds === undefined
          ? !config.excludeOverlays.includes(overlayId)
          : allowedOverlayIds.has(overlayId);

      if (shouldKeep) {
        continue;
      }

      filteredContent = this.removeOverlayMarkup(filteredContent, overlayId);
    }

    return filteredContent;
  }

  private findReferencedOverlayIds(content: string): ReadonlyArray<string> {
    const overlayIds = new Set<string>();
    const overlayExpression = /\s(?:data-overlay-id|data-overlay)=(['"])(.*?)\1/g;

    for (const match of content.matchAll(overlayExpression)) {
      const overlayId = match[2];

      if (overlayId) {
        overlayIds.add(overlayId);
      }
    }

    return Array.from(overlayIds);
  }

  private findReferencedElementIds(content: string): ReadonlyArray<string> {
    const elementIds = new Set<string>();
    const idExpression = /\sid=(['"])(.*?)\1/g;

    for (const match of content.matchAll(idExpression)) {
      const elementId = match[2];

      if (elementId) {
        elementIds.add(elementId);
      }
    }

    return Array.from(elementIds);
  }

  private removeOverlayMarkup(content: string, overlayId: string): string {
    const escapedId = this.escapeRegularExpression(overlayId);
    const pairedExpression = new RegExp(
      `<([A-Za-z][\\w:-]*)([^>]*\\s(?:data-overlay-id|data-overlay)=(['"])${escapedId}\\3[^>]*)>[\\s\\S]*?<\\/\\1>`,
      'g',
    );
    const selfClosingExpression = new RegExp(
      `<([A-Za-z][\\w:-]*)([^>]*\\s(?:data-overlay-id|data-overlay)=(['"])${escapedId}\\3[^>]*)\\/>`,
      'g',
    );

    return content
      .replace(pairedExpression, '')
      .replace(selfClosingExpression, '');
  }

  private removeElementMarkup(content: string, elementId: string): string {
    const escapedId = this.escapeRegularExpression(elementId);
    const pairedExpression = new RegExp(
      `<([A-Za-z][\\w:-]*)([^>]*\\sid=(['"])${escapedId}\\3[^>]*)>[\\s\\S]*?<\\/\\1>`,
      'g',
    );
    const selfClosingExpression = new RegExp(
      `<([A-Za-z][\\w:-]*)([^>]*\\sid=(['"])${escapedId}\\3[^>]*)\\/>`,
      'g',
    );

    return content
      .replace(pairedExpression, '')
      .replace(selfClosingExpression, '');
  }

  private applyViewportTransform(
    parsed: ParsedSVGDocument,
    viewport: ExportViewport,
    config: ResolvedSVGExportConfig,
  ): ParsedSVGDocument {
    const nextAttributes = new Map(parsed.attributes);
    const existingViewBox = this.parseViewBox(nextAttributes.get('viewBox') ?? DEFAULT_VIEWBOX);
    let nextViewBox = existingViewBox;

    if (config.viewportMode === 'current') {
      const visibleBounds = viewport.getVisibleBounds();

      nextViewBox = {
        minX: visibleBounds.minX,
        minY: visibleBounds.minY,
        maxX: visibleBounds.maxX,
        maxY: visibleBounds.maxY,
      };
    } else if (config.viewportMode === 'selection' && config.selectedElements.length > 0) {
      const selectionBounds = this.computeSelectionBounds(parsed.content, config.selectedElements);

      if (selectionBounds) {
        nextViewBox = selectionBounds;
      }
    }

    nextAttributes.set('viewBox', this.serializeViewBox(nextViewBox));

    return {
      attributes: nextAttributes,
      content: parsed.content,
    };
  }

  private parseViewBox(viewBoxValue: string): BoundingBox {
    const values = viewBoxValue
      .trim()
      .split(/\s+/)
      .map((part) => Number(part));

    if (values.length !== 4 || values.some((part) => !Number.isFinite(part))) {
      return { minX: 0, minY: 0, maxX: 100, maxY: 100 };
    }

    const minX = values[0] ?? 0;
    const minY = values[1] ?? 0;
    const width = values[2] ?? 100;
    const height = values[3] ?? 100;

    return {
      minX,
      minY,
      maxX: minX + width,
      maxY: minY + height,
    };
  }

  private serializeViewBox(bounds: BoundingBox): string {
    const width = Math.max(bounds.maxX - bounds.minX, 1);
    const height = Math.max(bounds.maxY - bounds.minY, 1);

    return `${this.round(bounds.minX)} ${this.round(bounds.minY)} ${this.round(width)} ${this.round(height)}`;
  }

  private computeSelectionBounds(
    content: string,
    selectedElements: ReadonlyArray<string>,
  ): BoundingBox | undefined {
    let combinedBounds: BoundingBox | undefined;

    for (const elementId of selectedElements) {
      const attrs = this.findElementAttributesById(content, elementId);

      if (!attrs) {
        continue;
      }

      const nextBounds = this.boundsFromAttributes(attrs);

      if (!nextBounds) {
        continue;
      }

      combinedBounds =
        combinedBounds === undefined
          ? nextBounds
          : {
              minX: Math.min(combinedBounds.minX, nextBounds.minX),
              minY: Math.min(combinedBounds.minY, nextBounds.minY),
              maxX: Math.max(combinedBounds.maxX, nextBounds.maxX),
              maxY: Math.max(combinedBounds.maxY, nextBounds.maxY),
            };
    }

    return combinedBounds;
  }

  private findElementAttributesById(content: string, elementId: string): Map<string, string> | undefined {
    const escapedId = this.escapeRegularExpression(elementId);
    const expression = new RegExp(
      `<([A-Za-z][\\w:-]*)([^>]*\\sid=(['"])${escapedId}\\3[^>]*)\\/?>(?:[\\s\\S]*?<\\/\\1>)?`,
      'i',
    );
    const match = content.match(expression);

    if (!match) {
      return undefined;
    }

    return this.parseElementAttributes(match[2] ?? '');
  }

  private boundsFromAttributes(attributes: Map<string, string>): BoundingBox | undefined {
    const x = this.readNumber(attributes, 'x');
    const y = this.readNumber(attributes, 'y');
    const width = this.readNumber(attributes, 'width');
    const height = this.readNumber(attributes, 'height');

    if (x !== undefined && y !== undefined && width !== undefined && height !== undefined) {
      return {
        minX: x,
        minY: y,
        maxX: x + width,
        maxY: y + height,
      };
    }

    const cx = this.readNumber(attributes, 'cx');
    const cy = this.readNumber(attributes, 'cy');
    const r = this.readNumber(attributes, 'r');

    if (cx !== undefined && cy !== undefined && r !== undefined) {
      return {
        minX: cx - r,
        minY: cy - r,
        maxX: cx + r,
        maxY: cy + r,
      };
    }

    const rx = this.readNumber(attributes, 'rx');
    const ry = this.readNumber(attributes, 'ry');

    if (cx !== undefined && cy !== undefined && rx !== undefined && ry !== undefined) {
      return {
        minX: cx - rx,
        minY: cy - ry,
        maxX: cx + rx,
        maxY: cy + ry,
      };
    }

    const x1 = this.readNumber(attributes, 'x1');
    const x2 = this.readNumber(attributes, 'x2');
    const y1 = this.readNumber(attributes, 'y1');
    const y2 = this.readNumber(attributes, 'y2');

    if (x1 !== undefined && x2 !== undefined && y1 !== undefined && y2 !== undefined) {
      return {
        minX: Math.min(x1, x2),
        minY: Math.min(y1, y2),
        maxX: Math.max(x1, x2),
        maxY: Math.max(y1, y2),
      };
    }

    const points = attributes.get('points');

    if (points) {
      const coordinates = points
        .trim()
        .split(/\s+/)
        .map((pair) => pair.split(',').map((value) => Number(value)))
        .filter(
          (pair): pair is [number, number] =>
            pair.length === 2
            && Number.isFinite(pair[0])
            && Number.isFinite(pair[1]),
        );

      if (coordinates.length > 0) {
        const xs = coordinates.map(([value]) => value);
        const ys = coordinates.map(([, value]) => value);

        return {
          minX: Math.min(...xs),
          minY: Math.min(...ys),
          maxX: Math.max(...xs),
          maxY: Math.max(...ys),
        };
      }
    }

    return undefined;
  }

  private readNumber(attributes: Map<string, string>, name: string): number | undefined {
    const rawValue = attributes.get(name);

    if (rawValue === undefined) {
      return undefined;
    }

    const numericValue = Number(rawValue);

    return Number.isFinite(numericValue) ? numericValue : undefined;
  }

  private applyRootAttributes(
    parsed: ParsedSVGDocument,
    config: ResolvedSVGExportConfig,
  ): ParsedSVGDocument {
    const nextAttributes = new Map(parsed.attributes);

    nextAttributes.set('xmlns', nextAttributes.get('xmlns') ?? 'http://www.w3.org/2000/svg');
    nextAttributes.set('preserveAspectRatio', config.preserveAspectRatio);

    if (config.width !== undefined) {
      nextAttributes.set('width', config.width);
    }

    if (config.height !== undefined) {
      nextAttributes.set('height', config.height);
    }

    return {
      attributes: nextAttributes,
      content: parsed.content,
    };
  }

  private applyBackground(parsed: ParsedSVGDocument, backgroundColor?: string): string {
    if (backgroundColor === undefined) {
      return '';
    }

    const bounds = this.parseViewBox(parsed.attributes.get('viewBox') ?? DEFAULT_VIEWBOX);
    const width = Math.max(bounds.maxX - bounds.minX, 1);
    const height = Math.max(bounds.maxY - bounds.minY, 1);

    return `<rect data-export-background="true" x="${this.round(bounds.minX)}" y="${this.round(bounds.minY)}" width="${this.round(width)}" height="${this.round(height)}" fill="${this.escapeAttribute(backgroundColor)}" />`;
  }

  private embedStyles(content: string): string {
    if (content.includes('data-export-style="true"')) {
      return content;
    }

    const embeddedStyle = `<style data-export-style="true">${INLINE_EXPORT_STYLE}</style>`;

    return embeddedStyle + content;
  }

  private addMetadata(content: string): string {
    if (content.includes('data-export-metadata="true"')) {
      return content;
    }

    const metadata = JSON.stringify({
      exportedAt: new Date().toISOString(),
      packageName: ADAPTERS_SHARED_METADATA.packageName,
      version: ADAPTERS_SHARED_METADATA.version,
    });

    return `<metadata data-export-metadata="true">${metadata}</metadata>` + content;
  }

  private async embedFonts(content: string): Promise<string> {
    if (content.includes('data-export-fonts="true"')) {
      return content;
    }

    return `<style data-export-fonts="true">${FONT_EXPORT_STYLE}</style>` + content;
  }

  private serializeToString(parsed: ParsedSVGDocument, prettyPrint: boolean): string {
    const attributeString = Array.from(parsed.attributes.entries())
      .map(([name, value]) => `${name}="${this.escapeAttribute(value)}"`)
      .join(' ');
    const openTag = attributeString.length > 0 ? `<svg ${attributeString}>` : '<svg>';
    const serialized = `${openTag}${parsed.content}</svg>`;

    if (!prettyPrint) {
      return serialized
        .replace(/>\s+</g, '><')
        .replace(/\s{2,}/g, ' ')
        .trim();
    }

    return serialized
      .replace(/></g, '>\n<')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }

  private validateSVG(svgString: string): void {
    const trimmed = svgString.trim();

    if (!trimmed.startsWith('<svg') || !trimmed.endsWith('</svg>')) {
      throw new ExportError('Serialized export is not a valid SVG document.', {
        stage: 'validate-svg',
      });
    }

    if (!/\sxmlns=/.test(trimmed)) {
      throw new ExportError('Serialized export is missing the SVG namespace.', {
        stage: 'validate-svg',
      });
    }
  }

  private escapeRegularExpression(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private escapeAttribute(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private round(value: number): string {
    const rounded = Math.round(value * 1000) / 1000;

    return `${rounded}`;
  }
}
