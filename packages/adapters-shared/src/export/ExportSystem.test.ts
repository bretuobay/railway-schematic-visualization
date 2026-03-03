import { ExportSystem } from './ExportSystem';

function createRenderer() {
  return {
    getSVGString: () =>
      '<svg viewBox="0 0 100 100"><rect id="track-1" x="0" y="0" width="10" height="10" /></svg>',
  };
}

function createViewport() {
  return {
    getVisibleBounds: () => ({
      minX: 0,
      minY: 0,
      maxX: 100,
      maxY: 100,
    }),
  };
}

function createOverlayManager() {
  return {
    getAllOverlays: () => [],
  };
}

describe('ExportSystem', () => {
  class MockCanvasContext {
    public fillStyle = '';
    public imageSmoothingEnabled = false;

    public fillRect(): void {}

    public drawImage(): void {}
  }

  class MockCanvas {
    public readonly context = new MockCanvasContext();

    public constructor(
      public width: number,
      public height: number,
    ) {}

    public getContext(): MockCanvasContext {
      return this.context;
    }

    public toDataURL(type?: string): string {
      return `data:${type ?? 'image/png'};base64,mock-output`;
    }
  }

  class MockImage {
    public onload: (() => void) | null = null;
    public onerror: ((error?: unknown) => void) | null = null;

    public get src(): string {
      return '';
    }

    public set src(_value: string) {
      this.onload?.();
    }
  }

  class MockStyleElement {
    public textContent: string | null = null;
    private readonly attributes = new Map<string, string>();

    public setAttribute(name: string, value: string): void {
      this.attributes.set(name, value);
    }
  }

  class MockHostElement {
    public innerHTML = '';
    private readonly attributes = new Map<string, string>();

    public setAttribute(name: string, value: string): void {
      this.attributes.set(name, value);
    }
  }

  function installMockBrowserEnvironment() {
    const nodes = {
      style: undefined as MockStyleElement | undefined,
      preview: undefined as MockHostElement | undefined,
    };
    const originalDocument = globalThis.document;
    const OriginalImage = globalThis.Image;
    const originalWindow = globalThis.window;

    globalThis.document = {
      head: {
        appendChild: (node: unknown) => {
          nodes.style = node as MockStyleElement;
        },
      },
      body: {
        appendChild: (node: unknown) => {
          nodes.preview = node as MockHostElement;
        },
      },
      createElement: (tag: string) => {
        if (tag === 'canvas') {
          return new MockCanvas(100, 100);
        }

        if (tag === 'style') {
          return new MockStyleElement();
        }

        return new MockHostElement();
      },
      querySelector: (selector: string) => {
        if (selector === 'style[data-rail-schematic-print-style="true"]') {
          return nodes.style;
        }

        if (selector === '[data-rail-schematic-print-preview-host="true"]') {
          return nodes.preview;
        }

        return null;
      },
    } as never;
    globalThis.Image = MockImage as never;
    globalThis.window = {
      print: () => {},
    } as never;

    return {
      nodes,
      restore: () => {
        globalThis.document = originalDocument;
        globalThis.Image = OriginalImage;
        globalThis.window = originalWindow;
      },
    };
  }

  it('emits start, progress, and complete events for SVG export', async () => {
    const exportSystem = new ExportSystem(
      createRenderer() as never,
      createViewport() as never,
      createOverlayManager() as never,
    );
    const events: string[] = [];

    exportSystem.on('export-start', (payload) => {
      events.push(`${payload.event}:${payload.stage}`);
    });
    exportSystem.on('export-progress', (payload) => {
      events.push(`${payload.event}:${payload.stage}`);
    });
    exportSystem.on('export-complete', (payload) => {
      events.push(`${payload.event}:${payload.stage}`);
    });

    const svg = await exportSystem.exportSVG({ viewportMode: 'full' });

    expect(svg).toContain('<svg ');
    expect(events).toEqual([
      'export-start:initializing',
      'export-progress:serializing',
      'export-progress:finalizing',
      'export-complete:complete',
    ]);
  });

  it('emits start, progress, and complete events for PNG export', async () => {
    const environment = installMockBrowserEnvironment();
    const exportSystem = new ExportSystem(
      createRenderer() as never,
      createViewport() as never,
      createOverlayManager() as never,
    );
    const events: string[] = [];

    exportSystem.on('export-start', (payload) => {
      events.push(`${payload.event}:${payload.stage}`);
    });
    exportSystem.on('export-progress', (payload) => {
      events.push(`${payload.event}:${payload.stage}`);
    });
    exportSystem.on('export-complete', (payload) => {
      events.push(`${payload.event}:${payload.stage}`);
    });

    try {
      const output = await exportSystem.exportPNG({ viewportMode: 'full' });

      expect(output).toBe('data:image/png;base64,mock-output');
      expect(events).toEqual([
        'export-start:initializing',
        'export-progress:serializing',
        'export-progress:rasterizing',
        'export-complete:complete',
      ]);
    } finally {
      environment.restore();
    }
  });

  it('configures print, returns preview markup, and emits print events', async () => {
    const previewMarkup = await (async () => {
      const environment = installMockBrowserEnvironment();
      const exportSystem = new ExportSystem(
        createRenderer() as never,
        createViewport() as never,
        {
          getAllOverlays: () => [{ id: 'traffic', visible: true }],
        } as never,
      );
      const events: string[] = [];

      exportSystem.on('export-start', (payload) => {
        if (payload.format === 'print') {
          events.push(`${payload.event}:${payload.stage}`);
        }
      });
      exportSystem.on('export-progress', (payload) => {
        if (payload.format === 'print') {
          events.push(`${payload.event}:${payload.stage}`);
        }
      });
      exportSystem.on('export-complete', (payload) => {
        if (payload.format === 'print') {
          events.push(`${payload.event}:${payload.stage}`);
        }
      });

      try {
        exportSystem.configurePrint({ includeLegend: true, multiPage: true });
        const markup = await exportSystem.printPreview();

        expect(markup).toContain('rail-schematic-print-preview');
        expect(markup).toContain('traffic');
        expect(environment.nodes.style?.textContent).toContain('@page');
        expect(environment.nodes.preview?.innerHTML).toBe(markup);
        expect(events).toEqual([
          'export-start:initializing',
          'export-progress:preview-ready',
          'export-complete:complete',
        ]);

        return markup;
      } finally {
        environment.restore();
      }
    })();

    expect(previewMarkup).toContain('print-metadata');
  });

  it('runs the full export system flow as a single unit', async () => {
    const environment = installMockBrowserEnvironment();
    let browserPrintCalls = 0;

    globalThis.window = {
      print: () => {
        browserPrintCalls += 1;
      },
    } as never;

    const exportSystem = new ExportSystem(
      createRenderer() as never,
      createViewport() as never,
      {
        getAllOverlays: () => [{ id: 'traffic', visible: true }],
      } as never,
    );
    const eventsByFormat = {
      svg: [] as string[],
      png: [] as string[],
      print: [] as string[],
    };

    exportSystem.on('export-start', (payload) => {
      eventsByFormat[payload.format].push(`${payload.event}:${payload.stage}`);
    });
    exportSystem.on('export-progress', (payload) => {
      eventsByFormat[payload.format].push(`${payload.event}:${payload.stage}`);
    });
    exportSystem.on('export-complete', (payload) => {
      eventsByFormat[payload.format].push(`${payload.event}:${payload.stage}`);
    });

    try {
      exportSystem.configurePrint({
        pageSize: 'Letter',
        orientation: 'landscape',
        includeLegend: true,
        includeScaleBar: true,
        includeMetadata: true,
        multiPage: true,
      });

      const svg = await exportSystem.exportSVG({ viewportMode: 'full' });
      const png = await exportSystem.exportPNG({ viewportMode: 'full', format: 'webp' });
      const preview = await exportSystem.printPreview();
      await exportSystem.print();

      expect(svg).toContain('<svg ');
      expect(svg).toContain('data-export-metadata="true"');
      expect(png).toBe('data:image/webp;base64,mock-output');
      expect(preview).toContain('rail-schematic-print-preview');
      expect(preview).toContain('traffic');
      expect(environment.nodes.style?.textContent).toContain('size: 216mm 279mm landscape;');
      expect(environment.nodes.preview?.innerHTML).toContain('print-scale-bar');
      expect(browserPrintCalls).toBe(1);

      expect(eventsByFormat.svg).toEqual([
        'export-start:initializing',
        'export-progress:serializing',
        'export-progress:finalizing',
        'export-complete:complete',
      ]);
      expect(eventsByFormat.png).toEqual([
        'export-start:initializing',
        'export-progress:serializing',
        'export-progress:rasterizing',
        'export-complete:complete',
      ]);
      expect(eventsByFormat.print).toEqual([
        'export-start:initializing',
        'export-progress:preview-ready',
        'export-complete:complete',
        'export-start:initializing',
        'export-progress:sent-to-browser',
        'export-complete:complete',
      ]);
    } finally {
      environment.restore();
    }
  });
});
