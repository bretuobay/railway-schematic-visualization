import {
  CoordinateSystemType,
  GraphBuilder,
  JSONSerializer,
  RailGraph,
} from '@rail-schematic-viz/core';
import {
  RAIL_SCHEMATIC_ELEMENT_TAG,
  RailSchematicElement,
  registerRailSchematicElement,
} from './index';

function createTestGraph(ids: ReadonlyArray<string>): RailGraph {
  const builder = new GraphBuilder();

  ids.forEach((id, index) => {
    builder.addNode({
      coordinate: {
        type: CoordinateSystemType.Screen,
        x: 40 + index * 48,
        y: 60 + (index % 2) * 24,
      },
      id,
      name: id,
      type: 'station',
    });

    if (index === 0) {
      return;
    }

    const previous = ids[index - 1];

    if (!previous) {
      return;
    }

    builder.addEdge({
      geometry: { type: 'straight' },
      id: `edge-${previous}-${id}`,
      length: 48,
      source: previous,
      target: id,
    });
  });

  if (ids.length > 1) {
    builder.addLine({
      edges: ids.slice(1).map((id, index) => `edge-${ids[index]}-${id}`),
      id: 'line-main',
      name: 'Main Line',
    });
  }

  return builder.build();
}

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

class MockStyleElement {
  public textContent: string | null = null;

  public setAttribute(): void {}
}

class MockHostElement {
  public innerHTML = '';

  public setAttribute(): void {}
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

function installBrowserMocks() {
  const nodes = {
    preview: undefined as MockHostElement | undefined,
    style: undefined as MockStyleElement | undefined,
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
    restore() {
      globalThis.document = originalDocument;
      globalThis.Image = OriginalImage;
      globalThis.window = originalWindow;
    },
  };
}

async function flushMicrotasks(): Promise<void> {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
  }
}

describe('RailSchematicElement', () => {
  it('initializes, exports, and dispatches mapped custom events', async () => {
    const browser = installBrowserMocks();
    const selectionEvents: Array<unknown> = [];
    const viewportEvents: Array<unknown> = [];
    const element = new RailSchematicElement();

    element.addEventListener('rail-selection-change', (event) => {
      selectionEvents.push((event as CustomEvent).detail);
    });
    element.addEventListener('rail-viewport-change', (event) => {
      viewportEvents.push((event as CustomEvent).detail);
    });

    try {
      await element.updateConfig({
        data: createTestGraph(['line-a']),
        height: 240,
        width: 480,
      });
      await flushMicrotasks();

      await expect(element.exportSVG({ viewportMode: 'full' })).resolves.toContain('line-a');
      await expect(element.exportPNG({ viewportMode: 'full' })).resolves.toBe(
        'data:image/png;base64,mock-output',
      );

      element.selectElements(['line-a']);
      await element.pan(10, 20);

      expect(selectionEvents).toEqual([
        {
          type: 'selection-change',
          sourceEvent: 'selection-change',
          selection: ['line-a'],
        },
      ]);
      expect(viewportEvents).toEqual([
        expect.objectContaining({
          type: 'viewport-change',
          sourceEvent: 'viewport-change',
          viewport: expect.objectContaining({
            transform: {
              x: 10,
              y: 20,
              scale: 1,
            },
          }),
        }),
      ]);

      await element.print({ includeLegend: true });
      expect(browser.nodes.preview?.innerHTML).toContain('rail-schematic-print-preview');
    } finally {
      await element.destroy();
      browser.restore();
    }
  });

  it('registers the custom element without redefining existing entries', () => {
    const defined: Array<{ name: string; ctor: CustomElementConstructor }> = [];
    const registry = {
      define: (name: string, ctor: CustomElementConstructor) => {
        defined.push({ name, ctor });
      },
      get: (name: string) =>
        name === RAIL_SCHEMATIC_ELEMENT_TAG && defined.length > 0
          ? defined[0]?.ctor
          : undefined,
    };

    expect(registerRailSchematicElement(registry)).toBe(RailSchematicElement);
    expect(defined).toHaveLength(1);
    expect(defined[0]?.name).toBe(RAIL_SCHEMATIC_ELEMENT_TAG);

    expect(registerRailSchematicElement(registry)).toBe(RailSchematicElement);
    expect(defined).toHaveLength(1);
  });

  it('covers attribute updates and the full public control surface', async () => {
    const browser = installBrowserMocks();
    const selectionEvents: Array<unknown> = [];
    const clickEvents: Array<unknown> = [];
    const overlayEvents: Array<unknown> = [];
    const graph = createTestGraph(['station-a', 'station-b']);
    const element = new RailSchematicElement();

    element.addEventListener('rail-selection-change', (event) => {
      selectionEvents.push((event as CustomEvent).detail);
    });
    element.addEventListener('rail-click', (event) => {
      clickEvents.push((event as CustomEvent).detail);
    });
    element.addEventListener('rail-overlay-click', (event) => {
      overlayEvents.push((event as CustomEvent).detail);
    });

    try {
      element.attributeChangedCallback(
        'data',
        null,
        new JSONSerializer().serialize(graph),
      );
      element.attributeChangedCallback('layout-mode', null, 'dense');
      element.attributeChangedCallback('unknown', null, 'ignored');

      expect(element.data).toBeInstanceOf(RailGraph);

      await element.ready();
      await flushMicrotasks();

      await expect(element.exportSVG({ viewportMode: 'full' })).resolves.toContain(
        'data-layout-mode="dense"',
      );

      await element.zoom(1.25);
      await element.fitToView();
      await element.setViewport({
        scale: 1.5,
        x: 12,
        y: 16,
      });

      expect(element.addOverlay({ visible: true })).toBe('overlay-1');
      await element.setOverlays([
        {
          id: 'signals',
          visible: false,
        },
      ]);
      expect(element.toggleOverlay('signals')).toBe(true);
      expect(element.removeOverlay('missing')).toBe(false);
      expect(element.removeOverlay('signals')).toBe(true);
      expect(element.getOverlayManager().getAllOverlays()).toEqual([]);

      element.selectElements(['station-a']);
      element.clearSelection();

      const renderer = element.getRenderer();

      renderer.emit('element-click', {
        element: {
          id: 'station-a',
          properties: {},
        },
      });
      renderer.emit('overlay-click', {
        element: {
          id: 'signals',
        },
        overlayId: 'signals',
      });

      await element.setData(createTestGraph(['branch-a']));
      element.data = createTestGraph(['branch-b']);
      await flushMicrotasks();

      await expect(element.exportSVG({ viewportMode: 'full' })).resolves.toContain('branch-b');
      expect(selectionEvents).toContainEqual({
        type: 'selection-change',
        sourceEvent: 'selection-change',
        selection: ['station-a'],
      });
      expect(selectionEvents).toContainEqual({
        type: 'selection-change',
        sourceEvent: 'selection-change',
        selection: [],
      });
      expect(clickEvents).toContainEqual(
        expect.objectContaining({
          type: 'click',
          sourceEvent: 'element-click',
        }),
      );
      expect(overlayEvents).toContainEqual(
        expect.objectContaining({
          type: 'overlay-click',
          sourceEvent: 'overlay-click',
        }),
      );
      expect(element.getViewport().getTransform().scale).toBeGreaterThan(0);
      expect(element.getExportSystem()).toBeInstanceOf(Object);
      expect(element.toHandle()).toEqual({
        element,
        framework: 'web-component',
        tagName: RAIL_SCHEMATIC_ELEMENT_TAG,
      });

      element.disconnectedCallback();
      await flushMicrotasks();
      expect(() => element.getRenderer()).toThrow('RailSchematicElement is not initialized.');
    } finally {
      await element.destroy();
      browser.restore();
    }
  });

  it('rejects invalid data values that are not RailGraph instances', async () => {
    const element = new RailSchematicElement();

    await expect(
      element.updateConfig({
        data: [{ id: 'not-a-graph' }] as unknown as RailGraph,
      }),
    ).rejects.toThrow('Initialization failed.');
  });

  it('throws for uninitialized access and missing registries', () => {
    const element = new RailSchematicElement();
    const defined: Array<{ name: string; ctor: CustomElementConstructor }> = [];

    expect(() => element.exportSVG()).toThrow('RailSchematicElement is not initialized.');
    expect(() =>
      registerRailSchematicElement(null as unknown as typeof globalThis.customElements),
    ).toThrow('Custom element registry is not available.');
    expect(
      registerRailSchematicElement({
        define: (name, ctor) => {
          defined.push({ name, ctor });
        },
      }),
    ).toBe(RailSchematicElement);
    expect(defined).toEqual([
      {
        name: RAIL_SCHEMATIC_ELEMENT_TAG,
        ctor: RailSchematicElement as unknown as CustomElementConstructor,
      },
    ]);
  });
});
