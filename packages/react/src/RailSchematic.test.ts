import {
  CoordinateSystemType,
  GraphBuilder,
  type RailGraph,
} from '@rail-schematic-viz/core';

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

describe('RailSchematic', () => {
  it('initializes and exposes imperative export methods', async () => {
    const browser = installBrowserMocks();
    const ref: { current: RailSchematicRef | null } = { current: null };

    try {
      const tree = RailSchematic({
        data: createTestGraph(['line-a', 'line-b']),
        height: 240,
        ref,
        testId: 'rail-test',
        width: 480,
      });

      await flushMicrotasks();

      expect(tree).toMatchObject({
        type: 'div',
        props: {
          'data-framework': 'react',
          'data-testid': 'rail-test',
        },
      });
      expect(ref.current?.framework).toBe('react');
      await expect(ref.current?.exportSVG({ viewportMode: 'full' })).resolves.toContain('line-a');
      await expect(ref.current?.exportPNG({ viewportMode: 'full' })).resolves.toBe(
        'data:image/png;base64,mock-output',
      );

      await ref.current?.print({ includeLegend: true });
      expect(browser.nodes.preview?.innerHTML).toContain('rail-schematic-print-preview');
    } finally {
      __unmount(RailSchematic as unknown as Function);
      browser.restore();
    }
  });

  it('maps selection and viewport changes to React-style handlers', async () => {
    const browser = installBrowserMocks();
    const ref: { current: RailSchematicRef | null } = { current: null };
    const selectionEvents: Array<unknown> = [];
    const viewportEvents: Array<unknown> = [];

    try {
      RailSchematic({
        data: createTestGraph(['station-a']),
        onSelectionChange: (payload) => {
          selectionEvents.push(payload);
        },
        onViewportChange: (payload) => {
          viewportEvents.push(payload);
        },
        ref,
      });

      await flushMicrotasks();

      ref.current?.selectElements(['station-a']);
      await ref.current?.pan(25, 40);

      expect(selectionEvents).toEqual([
        {
          type: 'selection-change',
          sourceEvent: 'selection-change',
          selection: ['station-a'],
        },
      ]);
      expect(viewportEvents).toEqual([
        expect.objectContaining({
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
      ]);
    } finally {
      __unmount(RailSchematic as unknown as Function);
      browser.restore();
    }
  });

  it('updates rendered data and releases resources on unmount', async () => {
    const browser = installBrowserMocks();
    const ref: { current: RailSchematicRef | null } = { current: null };

    try {
      RailSchematic({
        data: createTestGraph(['old-line']),
        ref,
      });

      await flushMicrotasks();
      await expect(ref.current?.exportSVG({ viewportMode: 'full' })).resolves.toContain('old-line');

      RailSchematic({
        data: createTestGraph(['new-line']),
        ref,
      });

      await flushMicrotasks();
      await expect(ref.current?.exportSVG({ viewportMode: 'full' })).resolves.toContain('new-line');

      __unmount(RailSchematic as unknown as Function);

      expect(() => ref.current?.exportSVG({ viewportMode: 'full' })).toThrow(
        'RailSchematic is not initialized.',
      );
    } finally {
      browser.restore();
    }
  });

  it('surfaces an initialization error when data is not a RailGraph instance', async () => {
    const browser = installBrowserMocks();
    const ref: { current: RailSchematicRef | null } = { current: null };

    try {
      RailSchematic({
        data: [{ id: 'not-a-graph' }] as unknown as RailGraph,
        ref,
      });

      await flushMicrotasks();

      expect(() => ref.current?.exportSVG({ viewportMode: 'full' })).toThrow(
        'Initialization failed.',
      );
    } finally {
      __unmount(RailSchematic as unknown as Function);
      browser.restore();
    }
  });
});
