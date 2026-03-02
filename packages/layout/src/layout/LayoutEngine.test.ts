import fc from 'fast-check';
import {
  CoordinateSystemType,
  GraphBuilder,
  type RailGraph,
} from '@rail-schematic-viz/core';
import { describe, expect, it, vi } from 'vitest';

import { LayoutEngine } from './LayoutEngine';
import { ProportionalLayout } from './ProportionalLayout';

function makeLinearGraph(edgeLengths: ReadonlyArray<number>): RailGraph {
  const builder = new GraphBuilder();

  edgeLengths.forEach((_, index) => {
    builder.addNode({
      id: `node-${index}`,
      name: `Node ${index}`,
      type: index === 0 ? 'station' : 'endpoint',
      coordinate: {
        type: CoordinateSystemType.Geographic,
        latitude: 5 + index * 0.001,
        longitude: 5 + index * 0.001,
      },
    });
  });

  builder.addNode({
    id: `node-${edgeLengths.length}`,
    name: `Node ${edgeLengths.length}`,
    type: 'endpoint',
    coordinate: {
      type: CoordinateSystemType.Geographic,
      latitude: 5 + edgeLengths.length * 0.001,
      longitude: 5 + edgeLengths.length * 0.001,
    },
  });

  edgeLengths.forEach((length, index) => {
    builder.addEdge({
      id: `edge-${index}`,
      source: `node-${index}`,
      target: `node-${index + 1}`,
      length,
      geometry: { type: 'straight' },
    });
  });

  return builder.build();
}

describe('LayoutEngine', () => {
  it('computes positions for all nodes and preserves topology', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 5 }),
        async (edgeLengths) => {
          const graph = makeLinearGraph(edgeLengths);
          const engine = new LayoutEngine(new ProportionalLayout({ scaleFactor: 2 }));
          const positioned = await engine.layout(graph);

          expect(positioned.nodes.size).toBe(graph.nodes.size);
          expect(positioned.edges.size).toBe(graph.edges.size);
          expect(positioned.coordinateSystem).toBe(CoordinateSystemType.Screen);
          expect(positioned.layoutMode).toBe('proportional');
        },
      ),
    );
  });

  it('emits lifecycle events, exports, imports, and switches strategies', async () => {
    const graph = makeLinearGraph([20, 40]);
    const engine = new LayoutEngine(new ProportionalLayout());
    const onStart = vi.fn();
    const onProgress = vi.fn();
    const onComplete = vi.fn();
    const onExport = vi.fn();
    const onImport = vi.fn();

    engine.on('layout-start', onStart);
    engine.on('layout-progress', onProgress);
    engine.on('layout-complete', onComplete);
    engine.on('layout-export', onExport);
    engine.on('layout-import', onImport);

    await engine.layout(graph);
    engine.setStrategy(new ProportionalLayout({ scaleFactor: 3 }));
    const exported = engine.exportLayout();
    const imported = engine.importLayout(graph, exported);

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onExport).toHaveBeenCalledTimes(1);
    expect(onImport).toHaveBeenCalledTimes(1);
    expect(exported.mode).toBe('proportional');
    expect(imported.nodes.size).toBe(graph.nodes.size);
  });

  it('rejects overlapping layouts', async () => {
    const graph = makeLinearGraph([1]);
    const engine = new LayoutEngine(new ProportionalLayout({ scaleFactor: 0 }), {
      overlapThreshold: 100,
    });

    await expect(engine.layout(graph)).rejects.toThrow('overlapping');
  });
});
