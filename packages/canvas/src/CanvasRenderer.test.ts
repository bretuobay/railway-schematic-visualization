import { CoordinateSystemType, GraphBuilder } from '@rail-schematic-viz/core';

import { CanvasRenderer, HybridRenderer } from './index';

class MockCanvasContext {
  public readonly calls: string[] = [];

  public clearRect(): void {
    this.calls.push('clearRect');
  }

  public beginPath(): void {
    this.calls.push('beginPath');
  }

  public moveTo(): void {
    this.calls.push('moveTo');
  }

  public lineTo(): void {
    this.calls.push('lineTo');
  }

  public arc(): void {
    this.calls.push('arc');
  }

  public fill(): void {
    this.calls.push('fill');
  }

  public stroke(): void {
    this.calls.push('stroke');
  }

  public closePath(): void {
    this.calls.push('closePath');
  }

  public setStrokeStyle(): void {
    this.calls.push('setStrokeStyle');
  }

  public setFillStyle(): void {
    this.calls.push('setFillStyle');
  }

  public setLineWidth(): void {
    this.calls.push('setLineWidth');
  }

  public toDataURL(): string {
    return 'data:image/png;base64,mock-context';
  }
}

function createScreenGraph() {
  const builder = new GraphBuilder();

  builder.addNode({
    coordinate: {
      type: CoordinateSystemType.Screen,
      x: 0,
      y: 0,
    },
    id: 'a',
    name: 'A',
    type: 'station',
  });
  builder.addNode({
    coordinate: {
      type: CoordinateSystemType.Screen,
      x: 100,
      y: 0,
    },
    id: 'b',
    name: 'B',
    type: 'signal',
  });
  builder.addEdge({
    geometry: {
      type: 'straight',
    },
    id: 'edge-1',
    length: 100,
    source: 'a',
    target: 'b',
  });
  builder.addLine({
    edges: ['edge-1'],
    id: 'line-1',
    name: 'Line 1',
  });

  return builder.build();
}

describe('CanvasRenderer', () => {
  it('renders graph primitives and heatmap points into a canvas snapshot', () => {
    const renderer = new CanvasRenderer();
    const context = new MockCanvasContext();
    const snapshot = renderer.render(createScreenGraph(), {
      context,
      heatmapPoints: [
        {
          id: 'heat-1',
          value: 0.9,
          x: 50,
          y: 10,
        },
      ],
      width: 800,
    });

    expect(snapshot.edgeCount).toBe(1);
    expect(snapshot.nodeCount).toBe(2);
    expect(snapshot.heatmapCount).toBe(1);
    expect(snapshot.width).toBe(800);
    expect(snapshot.commands.map((command) => command.kind)).toContain('edge');
    expect(snapshot.commands.map((command) => command.kind)).toContain('node');
    expect(snapshot.commands.map((command) => command.kind)).toContain('heatmap');
    expect(context.calls).toContain('clearRect');
    expect(context.calls).toContain('lineTo');
    expect(context.calls).toContain('arc');
  });

  it('supports hit testing across nodes, edges, and heatmap points', () => {
    const renderer = new CanvasRenderer();

    renderer.render(createScreenGraph(), {
      heatmapPoints: [
        {
          id: 'heat-1',
          radius: 12,
          value: 1,
          x: 40,
          y: 5,
        },
      ],
    });

    expect(renderer.hitTest({ x: 40, y: 5 })).toEqual(
      expect.objectContaining({
        id: 'heat-1',
        kind: 'heatmap',
      }),
    );
    expect(renderer.hitTest({ x: 0, y: 0 })).toEqual(
      expect.objectContaining({
        id: 'a',
        kind: 'node',
      }),
    );
    expect(renderer.hitTest({ x: 60, y: 0 })).toEqual(
      expect.objectContaining({
        id: 'edge-1',
        kind: 'edge',
      }),
    );
  });

  it('clears the current canvas state and exports PNG/SVG output', () => {
    const renderer = new CanvasRenderer();
    const context = new MockCanvasContext();

    renderer.render(createScreenGraph(), {
      context,
    });

    const cleared = renderer.clear(400, 200, context);

    expect(cleared.edgeCount).toBe(0);
    expect(cleared.nodeCount).toBe(0);
    expect(renderer.exportAsPNG(context)).toBe('data:image/png;base64,mock-context');
    expect(renderer.exportAsSVG(createScreenGraph())).toContain('<svg');
  });

  it('falls back to serialized PNG export when no native data URL is available', () => {
    const renderer = new CanvasRenderer();

    renderer.render(createScreenGraph());

    expect(renderer.exportAsPNG()).toContain('data:image/png;base64,');
  });
});

describe('HybridRenderer', () => {
  it('combines SVG and canvas layers and supports incremental canvas updates', () => {
    const renderer = new HybridRenderer();
    const graph = createScreenGraph();
    const initial = renderer.render(graph, {
      heatmapPoints: [
        {
          id: 'heat-1',
          value: 0.5,
          x: 10,
          y: 10,
        },
      ],
    });
    const updated = renderer.updateCanvasLayers([
      {
        id: 'heat-2',
        value: 0.8,
        x: 20,
        y: 20,
      },
      {
        id: 'heat-3',
        value: 0.4,
        x: 30,
        y: 30,
      },
    ]);

    expect(initial.svgLayer).toContain('<svg');
    expect(initial.canvasLayer.heatmapCount).toBe(1);
    expect(initial.usedCanvasForDenseLayers).toBe(true);
    expect(updated.heatmapCount).toBe(2);
    expect(renderer.hitTest({ x: 20, y: 20 })).toEqual(
      expect.objectContaining({
        id: 'heat-2',
        kind: 'heatmap',
      }),
    );
    expect(renderer.exportCanvasAsPNG()).toContain('data:image/png;base64,');
    expect(renderer.exportSVG()).toContain('<svg');
  });

  it('can render canvas-only layers when interactive SVG is disabled', () => {
    const renderer = new HybridRenderer();
    const result = renderer.render(createScreenGraph(), {
      renderInteractiveAsSVG: false,
    });

    expect(result.svgLayer).toBeUndefined();
    expect(result.canvasLayer.edgeCount).toBe(1);
  });
});
