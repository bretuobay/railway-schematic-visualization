import { PrintExporter } from './PrintExporter';

function createRenderer() {
  return {
    getSVGString: () =>
      '<svg viewBox="0 0 300 200"><rect id="track-1" x="0" y="0" width="50" height="20" /></svg>',
  };
}

function createViewport() {
  return {
    getVisibleBounds: () => ({
      minX: 0,
      minY: 0,
      maxX: 300,
      maxY: 200,
    }),
  };
}

function createOverlayManager() {
  return {
    getAllOverlays: () => [
      { id: 'traffic', visible: true },
      { id: 'signals', visible: true },
      { id: 'hidden', visible: false },
    ],
  };
}

describe('PrintExporter', () => {
  it('configures and mounts a print stylesheet', () => {
    const mountedStyles: string[] = [];
    const exporter = new PrintExporter(undefined, {
      mountStylesheet: (css) => {
        mountedStyles.push(css);
      },
      mountPreview: () => {},
      triggerPrint: () => {},
    });

    exporter.configurePrint({
      pageSize: 'Letter',
      orientation: 'landscape',
      margins: { top: 10, right: 12, bottom: 14, left: 16 },
      multiPage: true,
    });

    expect(mountedStyles).toHaveLength(1);
    expect(mountedStyles[0]).toContain('size: 216mm 279mm landscape;');
    expect(mountedStyles[0]).toContain('margin: 10mm 12mm 14mm 16mm;');
    expect(mountedStyles[0]).toContain('filter: grayscale(100%) contrast(1.25);');
    expect(mountedStyles[0]).toContain('break-after: page;');
  });

  it('renders preview markup with legend, scale bar, metadata, and multi-page layout', async () => {
    const mountedStyles: string[] = [];
    const mountedPreviews: string[] = [];
    const exporter = new PrintExporter(undefined, {
      mountStylesheet: (css) => {
        mountedStyles.push(css);
      },
      mountPreview: (markup) => {
        mountedPreviews.push(markup);
      },
      triggerPrint: () => {},
    });

    exporter.configurePrint({
      pageSize: 'A4',
      orientation: 'portrait',
      multiPage: true,
    });

    const result = await exporter.printPreview(
      createRenderer() as never,
      createViewport() as never,
      createOverlayManager() as never,
    );

    expect(result.layout.pages).toBeGreaterThan(1);
    expect(result.markup).toContain('class="print-legend"');
    expect(result.markup).toContain('traffic');
    expect(result.markup).toContain('signals');
    expect(result.markup).not.toContain('hidden');
    expect(result.markup).toContain('class="print-scale-bar"');
    expect(result.markup).toContain('class="print-metadata"');
    expect(result.markup).toContain('data-pages="');
    expect(mountedStyles).not.toHaveLength(0);
    expect(mountedPreviews).toEqual([result.markup]);
  });

  it('triggers the platform print action after preparing the preview', async () => {
    let printCalls = 0;
    const mountedPreviews: string[] = [];
    const exporter = new PrintExporter(undefined, {
      mountStylesheet: () => {},
      mountPreview: (markup) => {
        mountedPreviews.push(markup);
      },
      triggerPrint: () => {
        printCalls += 1;
      },
    });

    await exporter.print(
      createRenderer() as never,
      createViewport() as never,
      createOverlayManager() as never,
    );

    expect(mountedPreviews).toHaveLength(1);
    expect(printCalls).toBe(1);
  });
});
