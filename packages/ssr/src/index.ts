import {
  SVGRenderer as CoreSVGRenderer,
  type RailGraph,
  type StylingConfiguration,
} from '@rail-schematic-viz/core';

export interface HeadlessDocumentAdapter {
  createElement(tagName: string): unknown;
}

export interface SSREnvironmentOptions {
  readonly headlessDocument?: HeadlessDocumentAdapter;
  readonly minimumNodeMajor?: number;
  readonly strictNodeVersion?: boolean;
}

export interface SSREnvironmentInfo {
  readonly isNode: boolean;
  readonly nodeVersion?: string;
  readonly supportsDOM: boolean;
  readonly domImplementation: 'headless' | 'native' | 'none';
  readonly warnings: ReadonlyArray<string>;
}

export interface SSRRenderOptions {
  readonly width?: number;
  readonly height?: number;
  readonly title?: string;
  readonly description?: string;
  readonly className?: string;
  readonly role?: string;
  readonly layoutMode?: string;
  readonly styling?: Partial<StylingConfiguration>;
  readonly styleMarkup?: string;
  readonly overlayMarkup?: ReadonlyArray<string>;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface HeadlessExportRequest {
  readonly graph: RailGraph;
  readonly options?: SSRRenderOptions;
  readonly id?: string;
}

export interface HeadlessExportResult {
  readonly ok: boolean;
  readonly durationMs: number;
  readonly id?: string;
  readonly svg?: string;
  readonly error?: string;
}

export interface HeadlessExportBatchResult {
  readonly completedInMs: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly results: ReadonlyArray<HeadlessExportResult>;
}

export interface SSRRendererOptions {
  readonly environment?: SSREnvironmentOptions;
}

export interface SSRPackageMetadata {
  readonly packageName: '@rail-schematic-viz/ssr';
  readonly supportsHeadlessExport: true;
}

export const PACKAGE_METADATA = {
  packageName: '@rail-schematic-viz/ssr',
  supportsHeadlessExport: true,
} as const satisfies SSRPackageMetadata;

export const SSR_FRAMEWORK_EXAMPLES = {
  nextjs:
    'Use SSRRenderer in a Next.js route handler or server component to emit pre-rendered SVG markup.',
  nuxt:
    'Use SSRRenderer in a Nuxt server route or Nitro handler to return schematic SVG during SSR.',
} as const;

export function getPackageMetadata(): SSRPackageMetadata {
  return PACKAGE_METADATA;
}

export function detectSSREnvironment(
  options: SSREnvironmentOptions = {},
): SSREnvironmentInfo {
  const isNode = typeof process !== 'undefined' && Boolean(process.versions?.node);
  const nodeVersion = isNode ? process.versions.node : undefined;
  const nativeDocument = typeof document !== 'undefined';
  const supportsDOM = nativeDocument || options.headlessDocument !== undefined;
  const domImplementation = nativeDocument
    ? 'native'
    : (options.headlessDocument ? 'headless' : 'none');
  const minimumNodeMajor = options.minimumNodeMajor ?? 18;
  const warnings: string[] = [];

  if (isNode && nodeVersion) {
    const majorVersion = parseInt(nodeVersion.split('.')[0] ?? '0', 10);

    if (majorVersion < minimumNodeMajor) {
      const message = `Node.js ${minimumNodeMajor}+ is recommended for SSR. Detected ${nodeVersion}.`;

      if (options.strictNodeVersion) {
        throw new Error(message);
      }

      warnings.push(message);
    }
  }

  if (isNode && !supportsDOM) {
    warnings.push(
      'No DOM implementation detected. Falling back to string-based SVG serialization.',
    );
  }

  return {
    domImplementation,
    isNode,
    ...(nodeVersion ? { nodeVersion } : {}),
    supportsDOM,
    warnings,
  };
}

export function setupSSREnvironment(
  options: SSREnvironmentOptions = {},
): SSREnvironmentInfo {
  return detectSSREnvironment(options);
}

export class SSRRenderer {
  private readonly environment: SSREnvironmentInfo;
  private readonly renderer = new CoreSVGRenderer();

  public constructor(options: SSRRendererOptions = {}) {
    this.environment = setupSSREnvironment(options.environment);
  }

  public getEnvironment(): SSREnvironmentInfo {
    return {
      ...this.environment,
      warnings: [...this.environment.warnings],
    };
  }

  public render(
    graph: RailGraph,
    options: SSRRenderOptions = {},
  ): string {
    try {
      const svg = this.renderer.render(graph, options.styling);

      return decorateSVG(svg, options, this.environment);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      throw new Error(`SSR rendering failed: ${message}`);
    }
  }

  public async headlessExport(
    requests: ReadonlyArray<HeadlessExportRequest>,
  ): Promise<HeadlessExportBatchResult> {
    return runHeadlessExport(requests, (request) =>
      this.render(request.graph, request.options),
    );
  }
}

export async function headlessExport(
  requests: ReadonlyArray<HeadlessExportRequest>,
  options: SSRRendererOptions = {},
): Promise<HeadlessExportBatchResult> {
  const renderer = new SSRRenderer(options);

  return renderer.headlessExport(requests);
}

async function runHeadlessExport(
  requests: ReadonlyArray<HeadlessExportRequest>,
  render: (request: HeadlessExportRequest) => string,
): Promise<HeadlessExportBatchResult> {
  const batchStart = now();
  const results: HeadlessExportResult[] = [];

  for (const request of requests) {
    const start = now();

    try {
      const svg = render(request);

      results.push({
        durationMs: now() - start,
        ...(request.id ? { id: request.id } : {}),
        ok: true,
        svg,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      results.push({
        durationMs: now() - start,
        error: message,
        ...(request.id ? { id: request.id } : {}),
        ok: false,
      });
    }
  }

  const successCount = results.filter((result) => result.ok).length;

  return {
    completedInMs: now() - batchStart,
    failureCount: results.length - successCount,
    results,
    successCount,
  };
}

function decorateSVG(
  svg: string,
  options: SSRRenderOptions,
  environment: SSREnvironmentInfo,
): string {
  const openTagMatch = svg.match(/^<svg\b([^>]*)>/u);

  if (!openTagMatch) {
    throw new Error('Core renderer did not return a valid SVG root.');
  }

  const existingAttributes = openTagMatch[1] ?? '';
  const existingClass = existingAttributes.match(/\bclass="([^"]*)"/u)?.[1] ?? '';
  const mergedClass = [existingClass, options.className]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(' ');
  const attributeSegments: string[] = [
    existingAttributes.replace(/\sclass="[^"]*"/u, '').trim(),
    `data-ssr="true"`,
    `data-dom-implementation="${environment.domImplementation}"`,
  ];

  if (mergedClass) {
    attributeSegments.push(`class="${escapeAttribute(mergedClass)}"`);
  }

  if (options.width !== undefined) {
    attributeSegments.push(`width="${Math.max(1, Math.round(options.width))}"`);
  }

  if (options.height !== undefined) {
    attributeSegments.push(`height="${Math.max(1, Math.round(options.height))}"`);
  }

  if (options.role) {
    attributeSegments.push(`role="${escapeAttribute(options.role)}"`);
  }

  if (options.layoutMode) {
    attributeSegments.push(
      `data-layout-mode="${escapeAttribute(options.layoutMode)}"`,
    );
  }

  const rebuiltOpenTag = `<svg ${attributeSegments.filter(Boolean).join(' ').trim()}>`;
  const innerContent = svg
    .slice(openTagMatch[0].length)
    .replace(/<\/svg>\s*$/u, '');
  const prefix: string[] = [];

  if (options.title) {
    prefix.push(`<title>${escapeText(options.title)}</title>`);
  }

  if (options.description) {
    prefix.push(`<desc>${escapeText(options.description)}</desc>`);
  }

  if (options.metadata) {
    prefix.push(
      `<metadata>${escapeText(JSON.stringify(options.metadata))}</metadata>`,
    );
  }

  if (options.styleMarkup) {
    prefix.push(`<style>${options.styleMarkup}</style>`);
  }

  const overlays = options.overlayMarkup?.join('') ?? '';

  return `${rebuiltOpenTag}${prefix.join('')}${innerContent}${overlays}</svg>`;
}

function escapeText(value: string): string {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;');
}

function escapeAttribute(value: string): string {
  return escapeText(value).replace(/"/gu, '&quot;');
}

function now(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}
