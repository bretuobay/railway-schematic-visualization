import {
  CoordinateSystemType,
  GraphBuilder,
  type RailGraph,
} from '@rail-schematic-viz/core';
import {
  createRailSchematicVue,
  useRailSchematic,
  type RailSchematicVueInstance,
  type UseRailSchematicComposable,
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
  const originalDocument = globalThis.document;
  const OriginalImage = globalThis.Image;
  const originalWindow = globalThis.window;

  globalThis.document = {
    head: {
      appendChild: () => {},
    },
    body: {
      appendChild: () => {},
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
    querySelector: () => null,
  } as never;
  globalThis.Image = MockImage as never;
  globalThis.window = {
    print: () => {},
  } as never;

  return {
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

describe('useRailSchematic', () => {
  it('exposes delegated controls and live snapshots', async () => {
    const browser = installBrowserMocks();
    let instance: RailSchematicVueInstance | undefined;
    let api: UseRailSchematicComposable | undefined;

    try {
      instance = createRailSchematicVue({
        data: createTestGraph(['line-a']),
      });
      await instance.ready();
      await flushMicrotasks();

      const componentRef = {
        current: instance,
      };

      api = useRailSchematic(componentRef);

      expect(api.selection.selected).toEqual([]);

      api.selection.select(['line-a']);
      await api.viewport.pan(15, 30);
      expect(api.viewport.position).toEqual({ x: 15, y: 30 });

      await api.viewport.zoom(1.5);
      await api.viewport.fitToView();

      expect(api.selection.selected).toEqual(['line-a']);
      expect(api.viewport.scale).toBeGreaterThan(0);
      expect(api.overlays.add({ visible: true })).toBe('overlay-1');
      expect(api.overlays.list()).toEqual([{ id: 'overlay-1', visible: true }]);
      expect(api.overlays.toggle('overlay-1')).toBe(false);
      expect(api.overlays.remove('overlay-1')).toBe(true);
      expect(api.overlays.remove('overlay-1')).toBe(false);
      await expect(api.export.toPNG({ viewportMode: 'full' })).resolves.toBe(
        'data:image/png;base64,mock-output',
      );
      await api.export.print({
        includeLegend: true,
      });
      await expect(api.export.toSVG({ viewportMode: 'full' })).resolves.toContain('line-a');
      api.selection.clear();
      expect(api.selection.selected).toEqual([]);
    } finally {
      api?.dispose();
      await instance?.destroy();
      browser.restore();
    }
  });

  it('returns safe fallbacks when the component ref is empty', async () => {
    const api = useRailSchematic({
      current: null,
    });

    expect(api.viewport.position).toEqual({ x: 0, y: 0 });
    expect(api.viewport.scale).toBe(1);
    await expect(api.viewport.pan(1, 2)).resolves.toBeUndefined();
    await expect(api.viewport.zoom(2)).resolves.toBeUndefined();
    await expect(api.viewport.fitToView()).resolves.toBeUndefined();
    expect(api.overlays.add({ visible: true })).toBe('');
    expect(api.overlays.remove('missing')).toBe(false);
    expect(api.overlays.toggle('missing')).toBe(false);
    expect(api.overlays.list()).toEqual([]);
    api.selection.select(['ghost']);
    expect(api.selection.selected).toEqual(['ghost']);
    api.selection.clear();
    expect(api.selection.selected).toEqual([]);
    await expect(api.export.toSVG()).resolves.toBe('');
    await expect(api.export.toPNG()).resolves.toBe('');
    await expect(api.export.print()).resolves.toBeUndefined();
    expect(() => api.dispose()).not.toThrow();
  });
});
