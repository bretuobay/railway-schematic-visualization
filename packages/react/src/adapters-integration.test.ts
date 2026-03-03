import {
  CoordinateSystemType,
  GraphBuilder,
  type RailGraph,
} from '@rail-schematic-viz/core';
import { createRailSchematicVue } from '../../vue/src/index';
import { RailSchematicElement } from '../../web-component/src/index';

import { __unmount } from './test/react-runtime';
import {
  RailSchematic,
  type RailSchematicRef,
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

describe('adapter integration', () => {
  it('keeps shared export and selection behavior aligned across adapters', async () => {
    const browser = installBrowserMocks();
    const reactRef: { current: RailSchematicRef | null } = {
      current: null,
    };
    const reactSelections: Array<unknown> = [];
    const vueSelections: Array<unknown> = [];
    const webSelections: Array<unknown> = [];
    const graph = createTestGraph(['shared-line']);
    let vueInstance:
      | ReturnType<typeof createRailSchematicVue>
      | undefined;
    let webInstance:
      | RailSchematicElement
      | undefined;

    try {
      RailSchematic({
        data: graph,
        onSelectionChange: (payload) => {
          reactSelections.push(payload);
        },
        overlays: [{ id: 'legend', visible: true }],
        ref: reactRef,
      });

      vueInstance = createRailSchematicVue({
        data: graph,
        onEvent: (name, payload) => {
          if (name === 'selection-change') {
            vueSelections.push(payload);
          }
        },
        overlays: [{ id: 'legend', visible: true }],
      });
      webInstance = new RailSchematicElement();
      webInstance.addEventListener('rail-selection-change', (event) => {
        webSelections.push((event as CustomEvent).detail);
      });

      await flushMicrotasks();
      await vueInstance.ready();
      await webInstance.updateConfig({
        data: graph,
        overlays: [{ id: 'legend', visible: true }],
      });

      reactRef.current?.selectElements(['shared-line']);
      vueInstance.selectElements(['shared-line']);
      webInstance.selectElements(['shared-line']);

      const [reactSvg, vueSvg, webSvg] = await Promise.all([
        reactRef.current?.exportSVG({ viewportMode: 'full' }) ?? Promise.resolve(''),
        vueInstance.exportSVG({ viewportMode: 'full' }),
        webInstance.exportSVG({ viewportMode: 'full' }),
      ]);

      expect(reactSvg).toContain('shared-line');
      expect(vueSvg).toContain('shared-line');
      expect(webSvg).toContain('shared-line');
      expect(reactSvg).toContain('data-overlay-id="legend"');
      expect(vueSvg).toContain('data-overlay-id="legend"');
      expect(webSvg).toContain('data-overlay-id="legend"');

      await expect(
        Promise.all([
          reactRef.current?.exportPNG({ viewportMode: 'full' }) ?? Promise.resolve(''),
          vueInstance.exportPNG({ viewportMode: 'full' }),
          webInstance.exportPNG({ viewportMode: 'full' }),
        ]),
      ).resolves.toEqual([
        'data:image/png;base64,mock-output',
        'data:image/png;base64,mock-output',
        'data:image/png;base64,mock-output',
      ]);

      expect(reactSelections).toEqual([
        {
          type: 'selection-change',
          sourceEvent: 'selection-change',
          selection: ['shared-line'],
        },
      ]);
      expect(vueSelections).toEqual([
        {
          type: 'selection-change',
          sourceEvent: 'selection-change',
          selection: ['shared-line'],
        },
      ]);
      expect(webSelections).toEqual([
        {
          type: 'selection-change',
          sourceEvent: 'selection-change',
          selection: ['shared-line'],
        },
      ]);

      await reactRef.current?.print({ includeLegend: true });
      await vueInstance.print({ includeLegend: true });
      await webInstance.print({ includeLegend: true });

      expect(browser.nodes.preview?.innerHTML).toContain('rail-schematic-print-preview');
    } finally {
      await vueInstance?.destroy();
      await webInstance?.destroy();
      __unmount(RailSchematic as unknown as Function);
      browser.restore();
    }
  });
});
