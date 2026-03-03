import { SVGExporter } from './SVGExporter';

function createViewportStub() {
  return {
    getVisibleBounds: () => ({
      minX: 10,
      minY: 20,
      maxX: 110,
      maxY: 220,
    }),
  };
}

function createOverlayManagerStub(overlays: ReadonlyArray<{ id: string; visible: boolean }> = []) {
  return {
    getAllOverlays: () => overlays,
  };
}

describe('SVGExporter', () => {
  it('exports current viewport, embeds metadata, styles, and optional fonts', async () => {
    const exporter = new SVGExporter();
    const svg = await exporter.exportSVG(
      {
        getSVGString: () =>
          '<svg viewBox="0 0 300 400"><rect id="track-1" x="0" y="0" width="300" height="40" /></svg>',
      } as never,
      createViewportStub() as never,
      createOverlayManagerStub() as never,
      {
        backgroundColor: '#ffffff',
        embedFonts: true,
        height: 200,
        prettyPrint: true,
        width: '320px',
      },
    );

    expect(svg).toContain('<svg ');
    expect(svg).toContain('viewBox="10 20 100 200"');
    expect(svg).toContain('width="320px"');
    expect(svg).toContain('height="200"');
    expect(svg).toContain('preserveAspectRatio="xMidYMid meet"');
    expect(svg).toContain('data-export-background="true"');
    expect(svg).toContain('data-export-style="true"');
    expect(svg).toContain('data-export-fonts="true"');
    expect(svg).toContain('data-export-metadata="true"');
    expect(svg).toContain('\n');
  });

  it('preserves the full schematic viewBox when viewportMode is full', async () => {
    const exporter = new SVGExporter();
    const svg = await exporter.exportSVG(
      {
        getSVGString: () =>
          '<svg viewBox="0 0 300 400"><rect id="track-1" x="0" y="0" width="300" height="40" /></svg>',
      } as never,
      createViewportStub() as never,
      createOverlayManagerStub() as never,
      {
        viewportMode: 'full',
      },
    );

    expect(svg).toContain('viewBox="0 0 300 400"');
  });

  it('filters to selected elements and computes a selection viewBox', async () => {
    const exporter = new SVGExporter();
    const svg = await exporter.exportSVG(
      {
        getSVGString: () =>
          '<svg viewBox="0 0 300 400"><rect id="track-1" x="5" y="10" width="15" height="20" /><circle id="track-2" cx="90" cy="95" r="10" /></svg>',
      } as never,
      createViewportStub() as never,
      createOverlayManagerStub() as never,
      {
        viewportMode: 'selection',
        selectedElements: ['track-2'],
      },
    );

    expect(svg).toContain('viewBox="80 85 20 20"');
    expect(svg).toContain('id="track-2"');
    expect(svg).not.toContain('id="track-1"');
  });

  it('filters overlay markup based on include and exclude settings', async () => {
    const exporter = new SVGExporter();
    const svg = await exporter.exportSVG(
      {
        getSVGString: () =>
          '<svg viewBox="0 0 300 400"><g data-overlay-id="traffic"><rect x="0" y="0" width="10" height="10" /></g><g data-overlay-id="heat"><rect x="20" y="0" width="10" height="10" /></g></svg>',
      } as never,
      createViewportStub() as never,
      createOverlayManagerStub([
        { id: 'traffic', visible: true },
        { id: 'heat', visible: true },
      ]) as never,
      {
        includeOverlays: ['traffic'],
        excludeOverlays: ['heat'],
        viewportMode: 'full',
      },
    );

    expect(svg).toContain('data-overlay-id="traffic"');
    expect(svg).not.toContain('data-overlay-id="heat"');
  });

  it('rejects renderers that do not expose current SVG markup', async () => {
    const exporter = new SVGExporter();

    await expect(
      exporter.exportSVG(
        {} as never,
        createViewportStub() as never,
        createOverlayManagerStub() as never,
      ),
    ).rejects.toThrow('SVG export requires a renderer that exposes current SVG markup.');
  });
});
