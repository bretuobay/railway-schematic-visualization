import { forwardRef } from 'react';
import {
  CoordinateSystemType,
  GraphBuilder,
  type RailGraph,
} from '@rail-schematic-viz/core';

import { __unmount } from './test/react-runtime';
import {
  RailSchematic,
  type RailSchematicRef,
  useRailSchematic,
  type UseRailSchematicResult,
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

const HookHarness = forwardRef<
  null,
  {
    readonly componentRef: { readonly current: RailSchematicRef | null };
    readonly apiRef: { current: UseRailSchematicResult | null };
  }
>(function HookHarnessComponent(props) {
  props.apiRef.current = useRailSchematic(props.componentRef);

  return null;
});

describe('useRailSchematic', () => {
  it('exposes delegated controls and live viewport/selection snapshots', async () => {
    const browser = installBrowserMocks();
    const componentRef: { current: RailSchematicRef | null } = { current: null };
    const apiRef: { current: UseRailSchematicResult | null } = { current: null };

    try {
      RailSchematic({
        data: createTestGraph(['line-a']),
        ref: componentRef,
      });
      await flushMicrotasks();

      HookHarness({
        apiRef,
        componentRef,
      });

      expect(apiRef.current).not.toBeNull();
      expect(apiRef.current?.selection.selected).toEqual([]);

      apiRef.current?.selection.select(['line-a']);
      await apiRef.current?.viewport.pan(15, 30);

      expect(apiRef.current?.selection.selected).toEqual(['line-a']);
      expect(apiRef.current?.viewport.position).toEqual({ x: 15, y: 30 });
      expect(apiRef.current?.viewport.scale).toBe(1);
      expect(apiRef.current?.overlays.add({ visible: true })).toBe('overlay-1');
      expect(apiRef.current?.overlays.list()).toEqual([
        { id: 'overlay-1', visible: true },
      ]);
      await expect(apiRef.current?.export.toSVG({ viewportMode: 'full' })).resolves.toContain('line-a');
    } finally {
      __unmount(HookHarness as unknown as Function);
      __unmount(RailSchematic as unknown as Function);
      browser.restore();
    }
  });
});
