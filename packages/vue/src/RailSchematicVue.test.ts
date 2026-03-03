import {
  CoordinateSystemType,
  GraphBuilder,
  type RailGraph,
} from '@rail-schematic-viz/core';
import {
  createRailSchematicVue,
  type RailSchematicVueInstance,
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

describe('createRailSchematicVue', () => {
  it('initializes exports and supports updates', async () => {
    const browser = installBrowserMocks();
    let instance: RailSchematicVueInstance | undefined;

    try {
      instance = createRailSchematicVue({
        data: createTestGraph(['line-a', 'line-b']),
        dataTestId: 'vue-test',
        height: 240,
        width: 480,
      });
      await instance.ready();
      await flushMicrotasks();

      expect(instance.element).toMatchObject({
        type: 'div',
        props: {
          'data-framework': 'vue',
          'data-testid': 'vue-test',
        },
      });
      await expect(instance.exportSVG({ viewportMode: 'full' })).resolves.toContain('line-a');
      await expect(instance.exportPNG({ viewportMode: 'full' })).resolves.toBe(
        'data:image/png;base64,mock-output',
      );

      await instance.print({ includeLegend: true });
      expect(browser.nodes.preview?.innerHTML).toContain('rail-schematic-print-preview');

      await instance.update({
        data: createTestGraph(['new-line']),
        dataTestId: 'vue-test-updated',
      });
      await expect(instance.exportSVG({ viewportMode: 'full' })).resolves.toContain('new-line');
    } finally {
      await instance?.destroy();
      browser.restore();
    }
  });

  it('covers the public lifecycle, viewport, overlay, and selection APIs', async () => {
    const browser = installBrowserMocks();
    let instance: RailSchematicVueInstance | undefined;

    try {
      instance = createRailSchematicVue({
        data: createTestGraph(['station-a', 'station-b']),
        overlays: [
          {
            id: 'signals',
            visible: false,
          },
        ],
      });
      await instance.ready();
      await flushMicrotasks();

      const createdOverlayId = instance.addOverlay({
        visible: true,
      });

      expect(createdOverlayId).toBe('overlay-1');
      expect(instance.getOverlayManager().getAllOverlays()).toEqual([
        {
          id: 'signals',
          visible: false,
        },
        {
          id: 'overlay-1',
          visible: true,
        },
      ]);
      expect(instance.toggleOverlay('signals')).toBe(true);
      expect(instance.toggleOverlay('missing')).toBe(false);
      expect(instance.removeOverlay('missing')).toBe(false);
      expect(instance.removeOverlay(createdOverlayId)).toBe(true);

      await instance.zoom(1.4);
      await instance.fitToView();

      const viewportTransform = instance.getViewport().getTransform();

      expect(viewportTransform.scale).toBeGreaterThan(0);

      instance.selectElements(['station-b']);
      await expect(instance.exportSVG({ viewportMode: 'full' })).resolves.toContain(
        'data-selection="station-b"',
      );

      instance.clearSelection();
      await expect(instance.exportSVG({ viewportMode: 'full' })).resolves.toContain(
        'data-selection=""',
      );
      expect(instance.getRenderer().getSVGString()).toContain('station-a');
      expect(instance.getExportSystem()).toBeInstanceOf(Object);
    } finally {
      await instance?.destroy();
      browser.restore();
    }
  });

  it('maps selection and viewport changes through Vue event names', async () => {
    const browser = installBrowserMocks();
    const events: Array<{ name: string; payload: unknown }> = [];
    let instance: RailSchematicVueInstance | undefined;

    try {
      instance = createRailSchematicVue({
        data: createTestGraph(['station-a']),
        onEvent: (name, payload) => {
          events.push({ name, payload });
        },
      });
      await instance.ready();
      await flushMicrotasks();

      instance.selectElements(['station-a']);
      await instance.pan(25, 40);

      expect(events).toEqual([
        {
          name: 'selection-change',
          payload: {
            type: 'selection-change',
            sourceEvent: 'selection-change',
            selection: ['station-a'],
          },
        },
        {
          name: 'viewport-change',
          payload: expect.objectContaining({
            type: 'viewport-change',
            sourceEvent: 'viewport-change',
            viewport: expect.objectContaining({
              transform: {
                x: 25,
                y: 40,
                scale: 1,
              },
            }),
          }),
        },
      ]);
    } finally {
      await instance?.destroy();
      browser.restore();
    }
  });

  it('rejects initialization when data is not a RailGraph instance', async () => {
    const browser = installBrowserMocks();
    const instance = createRailSchematicVue({
      data: [{ id: 'not-a-graph' }] as unknown as RailGraph,
    });

    try {
      await expect(instance.ready()).rejects.toThrow('Initialization failed.');
    } finally {
      await instance.destroy();
      browser.restore();
    }
  });

  it('surfaces initialization failures through the imperative API', async () => {
    const browser = installBrowserMocks();
    const instance = createRailSchematicVue({
      data: [{ id: 'not-a-graph' }] as unknown as RailGraph,
    });

    try {
      await expect(instance.ready()).rejects.toThrow('Initialization failed.');
      await expect(instance.update({ data: createTestGraph(['station-a']) })).rejects.toThrow(
        'Initialization failed.',
      );
      expect(() => instance.addOverlay({ visible: true })).toThrow('RailSchematicVue is not initialized.');
    } finally {
      await instance.destroy();
      browser.restore();
    }
  });
});
