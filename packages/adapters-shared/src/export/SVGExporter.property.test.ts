import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { SVGExporter } from './SVGExporter';

interface Bounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

interface OverlayDescriptor {
  readonly id: string;
  readonly visible: boolean;
}

function createRenderer(markup: string) {
  return {
    getSVGString: () => markup,
  };
}

function createViewport(bounds: Bounds) {
  return {
    getVisibleBounds: () => bounds,
  };
}

function createOverlayManager(overlays: ReadonlyArray<OverlayDescriptor>) {
  return {
    getAllOverlays: () => overlays,
  };
}

function extractRootAttributes(svg: string): string {
  const match = svg.match(/<svg\b([^>]*)>/);

  expect(match?.[1]).toBeDefined();

  return match?.[1] ?? '';
}

function extractAttribute(svg: string, name: string): string | undefined {
  const match = extractRootAttributes(svg).match(new RegExp(`\\s${name}=(['"])(.*?)\\1`));

  return match?.[2];
}

function extractViewBox(svg: string): [number, number, number, number] {
  const viewBox = extractAttribute(svg, 'viewBox');

  expect(viewBox).toBeDefined();

  return (viewBox ?? '')
    .split(/\s+/)
    .map((part) => Number(part)) as [number, number, number, number];
}

function extractMetadata(svg: string): { packageName: string; version: string; exportedAt: string } {
  const match = svg.match(/<metadata data-export-metadata="true">([\s\S]*?)<\/metadata>/);

  expect(match?.[1]).toBeDefined();

  return JSON.parse(match?.[1] ?? '{}') as {
    packageName: string;
    version: string;
    exportedAt: string;
  };
}

function extractIds(svg: string): string[] {
  return Array.from(svg.matchAll(/\sid=(['"])(.*?)\1/g), (match) => match[2] ?? '');
}

function countOccurrences(svg: string, marker: string): number {
  return svg.split(marker).length - 1;
}

function makeRectMarkup(id: string, x: number, y: number, width: number, height: number): string {
  return `<rect id="${id}" x="${x}" y="${y}" width="${width}" height="${height}" />`;
}

function makeIdListArbitrary(prefix: string, minLength: number, maxLength: number) {
  return fc
    .uniqueArray(fc.integer({ min: 0, max: 9999 }), { minLength, maxLength })
    .map((values) => values.map((value) => `${prefix}${value.toString(36)}`));
}

const exporter = new SVGExporter();

describe('SVGExporter properties', () => {
  it('captures the current viewport in current mode', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: -500, max: 500 }),
        fc.integer({ min: -500, max: 500 }),
        fc.integer({ min: 1, max: 1200 }),
        fc.integer({ min: 1, max: 1200 }),
        async (minX, minY, width, height) => {
          const svg = await exporter.exportSVG(
            createRenderer('<svg viewBox="0 0 999 999"><rect id="track-1" x="0" y="0" width="10" height="10" /></svg>') as never,
            createViewport({
              minX,
              minY,
              maxX: minX + width,
              maxY: minY + height,
            }) as never,
            createOverlayManager([]) as never,
          );

          expect(extractViewBox(svg)).toEqual([minX, minY, width, height]);
        },
      ),
    );
  });

  it('preserves all track elements in full exports', async () => {
    await fc.assert(
      fc.asyncProperty(
        makeIdListArbitrary('track-', 1, 6).chain((ids) =>
          fc.tuple(
            fc.constant(ids),
            fc.array(fc.integer({ min: 0, max: 500 }), { minLength: ids.length, maxLength: ids.length }),
            fc.array(fc.integer({ min: 0, max: 500 }), { minLength: ids.length, maxLength: ids.length }),
            fc.array(fc.integer({ min: 1, max: 100 }), { minLength: ids.length, maxLength: ids.length }),
            fc.array(fc.integer({ min: 1, max: 100 }), { minLength: ids.length, maxLength: ids.length }),
          ),
        ),
        async ([ids, xs, ys, widths, heights]) => {
          const elements = ids.map((id, index) => ({
            id,
            x: xs[index] ?? 0,
            y: ys[index] ?? 0,
            width: widths[index] ?? 1,
            height: heights[index] ?? 1,
          }));
          const markup = elements
            .map((element) => makeRectMarkup(element.id, element.x, element.y, element.width, element.height))
            .join('');
          const svg = await exporter.exportSVG(
            createRenderer(`<svg viewBox="0 0 600 600">${markup}</svg>`) as never,
            createViewport({ minX: 0, minY: 0, maxX: 100, maxY: 100 }) as never,
            createOverlayManager([]) as never,
            { viewportMode: 'full' },
          );

          expect(extractIds(svg).filter((id) => id.startsWith('track-')).sort()).toEqual(
            elements.map((element) => element.id).sort(),
          );
        },
      ),
    );
  });

  it('applies valid width and height dimensions and drops invalid numeric values', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.option(fc.integer({ min: -100, max: 800 }), { nil: undefined }),
        fc.option(fc.integer({ min: -100, max: 800 }), { nil: undefined }),
        async (width, height) => {
          const config = {
            ...(width !== undefined ? { width } : {}),
            ...(height !== undefined ? { height } : {}),
            viewportMode: 'full' as const,
          };
          const svg = await exporter.exportSVG(
            createRenderer('<svg viewBox="0 0 300 400"><rect id="track-1" x="0" y="0" width="10" height="10" /></svg>') as never,
            createViewport({ minX: 0, minY: 0, maxX: 100, maxY: 100 }) as never,
            createOverlayManager([]) as never,
            config,
          );

          const widthAttribute = extractAttribute(svg, 'width');
          const heightAttribute = extractAttribute(svg, 'height');

          expect(widthAttribute).toBe(width !== undefined && width > 0 ? `${width}` : undefined);
          expect(heightAttribute).toBe(height !== undefined && height > 0 ? `${height}` : undefined);
        },
      ),
    );
  });

  it('exports only selected elements in selection mode', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 1, max: 30 }),
        fc.integer({ min: 1, max: 30 }),
        fc.integer({ min: 120, max: 240 }),
        fc.integer({ min: 120, max: 240 }),
        async (x1, y1, width1, height1, x2, y2) => {
          const markup = [
            makeRectMarkup('selected-track', x1, y1, width1, height1),
            makeRectMarkup('other-track', x2, y2, 20, 20),
          ].join('');
          const svg = await exporter.exportSVG(
            createRenderer(`<svg viewBox="0 0 300 300">${markup}</svg>`) as never,
            createViewport({ minX: 0, minY: 0, maxX: 100, maxY: 100 }) as never,
            createOverlayManager([]) as never,
            { viewportMode: 'selection', selectedElements: ['selected-track'] },
          );

          expect(svg).toContain('id="selected-track"');
          expect(svg).not.toContain('id="other-track"');
          expect(extractViewBox(svg)).toEqual([x1, y1, width1, height1]);
        },
      ),
    );
  });

  it('always returns SVG root markup with the SVG namespace', async () => {
    await fc.assert(
      fc.asyncProperty(
        makeIdListArbitrary('track-', 1, 4).chain((ids) =>
          fc.tuple(
            fc.constant(ids),
            fc.array(fc.integer({ min: 0, max: 400 }), { minLength: ids.length, maxLength: ids.length }),
            fc.array(fc.integer({ min: 0, max: 400 }), { minLength: ids.length, maxLength: ids.length }),
          ),
        ),
        async ([ids, xs, ys]) => {
          const markup = ids
            .map(
              (id, index) =>
                `<circle id="${id}" cx="${xs[index] ?? 0}" cy="${ys[index] ?? 0}" r="5" />`,
            )
            .join('');
          const svg = await exporter.exportSVG(
            createRenderer(`<svg viewBox="0 0 500 500">${markup}</svg>`) as never,
            createViewport({ minX: 5, minY: 10, maxX: 105, maxY: 210 }) as never,
            createOverlayManager([]) as never,
          );

          expect(svg.startsWith('<svg')).toBe(true);
          expect(svg.endsWith('</svg>')).toBe(true);
          expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
        },
      ),
    );
  });

  it('embeds exactly one export style block', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(),
        async (prettyPrint) => {
          const svg = await exporter.exportSVG(
            createRenderer('<svg viewBox="0 0 100 100"><rect id="track-1" x="0" y="0" width="10" height="10" /></svg>') as never,
            createViewport({ minX: 0, minY: 0, maxX: 100, maxY: 100 }) as never,
            createOverlayManager([]) as never,
            { prettyPrint },
          );

          expect(countOccurrences(svg, 'data-export-style="true"')).toBe(1);
        },
      ),
    );
  });

  it('always includes metadata with package identity and an ISO timestamp', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(),
        async (embedFonts) => {
          const svg = await exporter.exportSVG(
            createRenderer('<svg viewBox="0 0 100 100"><rect id="track-1" x="0" y="0" width="10" height="10" /></svg>') as never,
            createViewport({ minX: 0, minY: 0, maxX: 100, maxY: 100 }) as never,
            createOverlayManager([]) as never,
            { embedFonts },
          );
          const metadata = extractMetadata(svg);

          expect(metadata.packageName).toBe('@rail-schematic-viz/adapters-shared');
          expect(metadata.version).toBe('0.1.0');
          expect(Number.isNaN(Date.parse(metadata.exportedAt))).toBe(false);
        },
      ),
    );
  });

  it('round-trips by preserving all original element ids in full mode', async () => {
    await fc.assert(
      fc.asyncProperty(
        makeIdListArbitrary('node-', 1, 5),
        async (ids) => {
          const markup = ids
            .map((id, index) => `<circle id="${id}" cx="${index * 15}" cy="${index * 15}" r="4" />`)
            .join('');
          const svg = await exporter.exportSVG(
            createRenderer(`<svg viewBox="0 0 100 100">${markup}</svg>`) as never,
            createViewport({ minX: 0, minY: 0, maxX: 100, maxY: 100 }) as never,
            createOverlayManager([]) as never,
            { viewportMode: 'full' },
          );

          expect(extractIds(svg).filter((id) => id.startsWith('node-')).sort()).toEqual([...ids].sort());
        },
      ),
    );
  });

  it('applies configuration flags for preserveAspectRatio, background, fonts, and pretty printing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('none', 'xMinYMin meet', 'xMaxYMax slice'),
        fc.constantFrom('#ffffff', '#101820', 'rgba(12,34,56,0.3)'),
        async (preserveAspectRatio, backgroundColor) => {
          const svg = await exporter.exportSVG(
            createRenderer('<svg viewBox="0 0 100 100"><rect id="track-1" x="0" y="0" width="10" height="10" /></svg>') as never,
            createViewport({ minX: 0, minY: 0, maxX: 100, maxY: 100 }) as never,
            createOverlayManager([]) as never,
            {
              preserveAspectRatio,
              backgroundColor,
              embedFonts: true,
              prettyPrint: true,
              viewportMode: 'full',
            },
          );

          expect(svg).toContain(`preserveAspectRatio="${preserveAspectRatio}"`);
          expect(svg).toContain(`fill="${backgroundColor.replace(/"/g, '&quot;')}"`);
          expect(svg).toContain('data-export-fonts="true"');
          expect(svg).toContain('\n');
        },
      ),
    );
  });

  it('keeps only overlays allowed by include/exclude rules', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(),
        async (hideTraffic) => {
          const svg = await exporter.exportSVG(
            createRenderer(
              '<svg viewBox="0 0 100 100"><g data-overlay-id="traffic"><rect x="0" y="0" width="10" height="10" /></g><g data-overlay-id="signals"><rect x="20" y="0" width="10" height="10" /></g></svg>',
            ) as never,
            createViewport({ minX: 0, minY: 0, maxX: 100, maxY: 100 }) as never,
            createOverlayManager([
              { id: 'traffic', visible: !hideTraffic },
              { id: 'signals', visible: true },
            ]) as never,
            {
              includeOverlays: hideTraffic ? ['signals'] : 'all',
              excludeOverlays: hideTraffic ? ['traffic'] : [],
              viewportMode: 'full',
            },
          );

          expect(svg).toContain('data-overlay-id="signals"');
          expect(svg.includes('data-overlay-id="traffic"')).toBe(!hideTraffic);
        },
      ),
    );
  });

  it('falls back to defaults for invalid dimensions and empty preserveAspectRatio', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(0, -1, -50),
        fc.constantFrom(0, -1, -50),
        async (width, height) => {
          const svg = await exporter.exportSVG(
            createRenderer('<svg viewBox="0 0 100 100"><rect id="track-1" x="0" y="0" width="10" height="10" /></svg>') as never,
            createViewport({ minX: 5, minY: 10, maxX: 55, maxY: 60 }) as never,
            createOverlayManager([]) as never,
            {
              width,
              height,
              preserveAspectRatio: '   ',
            },
          );

          expect(extractAttribute(svg, 'width')).toBeUndefined();
          expect(extractAttribute(svg, 'height')).toBeUndefined();
          expect(extractAttribute(svg, 'preserveAspectRatio')).toBe('xMidYMid meet');
          expect(extractViewBox(svg)).toEqual([5, 10, 50, 50]);
        },
      ),
    );
  });
});
