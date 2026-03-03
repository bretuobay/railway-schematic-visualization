import { PNGExporter } from './PNGExporter';

class MockCanvasContext {
  public fillStyle = '';
  public imageSmoothingEnabled = false;
  public readonly fillRectCalls: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }> = [];
  public readonly drawImageCalls: Array<{
    dx: number;
    dy: number;
    dWidth: number;
    dHeight: number;
  }> = [];

  public fillRect(x: number, y: number, width: number, height: number): void {
    this.fillRectCalls.push({ x, y, width, height });
  }

  public drawImage(
    _image: unknown,
    dx: number,
    dy: number,
    dWidth: number,
    dHeight: number,
  ): void {
    this.drawImageCalls.push({ dx, dy, dWidth, dHeight });
  }
}

class MockCanvas {
  public readonly context = new MockCanvasContext();
  public readonly toDataURLCalls: Array<{
    type?: string;
    quality?: number;
  }> = [];

  public constructor(
    public width: number,
    public height: number,
  ) {}

  public getContext(): MockCanvasContext {
    return this.context;
  }

  public toDataURL(type?: string, quality?: number): string {
    this.toDataURLCalls.push({
      ...(type !== undefined ? { type } : {}),
      ...(quality !== undefined ? { quality } : {}),
    });

    return `data:${type ?? 'image/png'};base64,mock-output`;
  }
}

class MockImage {
  public onload: (() => void) | null = null;
  public onerror: ((error?: unknown) => void) | null = null;
  private currentSource = '';

  public get src(): string {
    return this.currentSource;
  }

  public set src(value: string) {
    this.currentSource = value;
    this.onload?.();
  }
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
    getAllOverlays: () => [],
  };
}

describe('PNGExporter', () => {
  it('exports a PNG data URL using the rasterized SVG output', async () => {
    const canvases: MockCanvas[] = [];
    const images: MockImage[] = [];
    const exporter = new PNGExporter(undefined, {
      createCanvas: (width, height) => {
        const canvas = new MockCanvas(width, height);

        canvases.push(canvas);

        return canvas;
      },
      createImage: () => {
        const image = new MockImage();

        images.push(image);

        return image;
      },
    });

    const output = await exporter.exportPNG(
      {
        getSVGString: () =>
          '<svg viewBox="0 0 300 200"><rect id="track-1" x="0" y="0" width="30" height="20" /></svg>',
      } as never,
      createViewport() as never,
      createOverlayManager() as never,
      {
        viewportMode: 'full',
      },
    );

    expect(output).toBe('data:image/png;base64,mock-output');
    expect(canvases).toHaveLength(1);
    expect(canvases[0]?.width).toBe(300);
    expect(canvases[0]?.height).toBe(200);
    expect(canvases[0]?.context.drawImageCalls).toEqual([
      { dx: 0, dy: 0, dWidth: 300, dHeight: 200 },
    ]);
    expect(images[0]?.src.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
  });

  it('applies scale, background color, output format, and quality options', async () => {
    const canvases: MockCanvas[] = [];
    const exporter = new PNGExporter(undefined, {
      createCanvas: (width, height) => {
        const canvas = new MockCanvas(width, height);

        canvases.push(canvas);

        return canvas;
      },
      createImage: () => new MockImage(),
    });

    const output = await exporter.exportPNG(
      {
        getSVGString: () =>
          '<svg viewBox="0 0 100 50"><rect id="track-1" x="0" y="0" width="10" height="10" /></svg>',
      } as never,
      createViewport() as never,
      createOverlayManager() as never,
      {
        width: 120,
        scale: 2,
        format: 'jpeg',
        quality: 0.7,
        backgroundColor: '#ffffff',
        viewportMode: 'full',
      },
    );

    expect(output).toBe('data:image/jpeg;base64,mock-output');
    expect(canvases[0]?.width).toBe(240);
    expect(canvases[0]?.height).toBe(120);
    expect(canvases[0]?.context.fillStyle).toBe('#ffffff');
    expect(canvases[0]?.context.fillRectCalls).toEqual([
      { x: 0, y: 0, width: 240, height: 120 },
    ]);
    expect(canvases[0]?.toDataURLCalls).toEqual([
      { type: 'image/jpeg', quality: 0.7 },
    ]);
  });

  it('rejects oversized canvas exports before rasterization', async () => {
    const exporter = new PNGExporter(undefined, {
      createCanvas: (width, height) => new MockCanvas(width, height),
      createImage: () => new MockImage(),
    });

    await expect(
      exporter.exportPNG(
        {
          getSVGString: () =>
            '<svg viewBox="0 0 5000 5000"><rect id="track-1" x="0" y="0" width="10" height="10" /></svg>',
        } as never,
        createViewport() as never,
        createOverlayManager() as never,
        {
          scale: 2,
          viewportMode: 'full',
        },
      ),
    ).rejects.toThrow('PNG export exceeds safe canvas size limits.');
  });
});
