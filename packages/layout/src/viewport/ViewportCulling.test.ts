import { performance } from 'node:perf_hooks';

import {
  CoordinateSystemType,
  GraphBuilder,
  asEdgeId,
  asNodeId,
  type NodeId,
  type ScreenCoordinate,
} from '@rail-schematic-viz/core';
import { describe, expect, it, vi } from 'vitest';

import { buildPositionedGraph } from '../layout';

import { ViewportController } from './ViewportController';
import { MockViewportHost } from './ViewportController.test-helpers';
import { ViewportCulling } from './ViewportCulling';

function makeLinearPositionedGraph(nodeCount: number, spacing = 10) {
  const builder = new GraphBuilder();
  const positions = new Map<NodeId, ScreenCoordinate>();
  const geometries = new Map();

  for (let index = 0; index < nodeCount; index += 1) {
    const x = index * spacing;
    const nodeId = `node-${index}`;
    const brandedNodeId = asNodeId(nodeId);

    builder.addNode({
      id: nodeId,
      name: `Node ${index}`,
      type: index === nodeCount - 1 ? 'endpoint' : 'station',
      coordinate: { type: CoordinateSystemType.Screen, x, y: 0 },
    });
    positions.set(brandedNodeId, {
      type: CoordinateSystemType.Screen,
      x,
      y: 0,
    });

    if (index === 0) {
      continue;
    }

    const edgeId = `edge-${index - 1}`;

    builder.addEdge({
      id: edgeId,
      source: `node-${index - 1}`,
      target: nodeId,
      length: spacing,
      geometry: { type: 'straight' },
    });
    geometries.set(asEdgeId(edgeId), [
      {
        type: CoordinateSystemType.Screen,
        x: (index - 1) * spacing,
        y: 0,
      },
      {
        type: CoordinateSystemType.Screen,
        x,
        y: 0,
      },
    ] as const);
  }

  return buildPositionedGraph(builder.build(), positions, geometries, 'manual');
}

describe('ViewportCulling', () => {
  it('keeps culling disabled at the threshold and enabled above it', () => {
    const thresholdGraph = makeLinearPositionedGraph(500);
    const aboveThresholdGraph = makeLinearPositionedGraph(501);
    const culling = new ViewportCulling({ activationThreshold: 1000, bufferMargin: 0 });

    culling.buildIndex(thresholdGraph);
    expect(
      culling.queryVisible({
        minX: 0,
        minY: -1,
        maxX: 5000,
        maxY: 1,
      }).enabled,
    ).toBe(false);

    culling.buildIndex(aboveThresholdGraph);
    expect(
      culling.queryVisible({
        minX: 0,
        minY: -1,
        maxX: 5000,
        maxY: 1,
      }).enabled,
    ).toBe(true);
  });

  it('returns visible nodes and edges intersecting the viewport', () => {
    const graph = makeLinearPositionedGraph(8, 10);
    const culling = new ViewportCulling({ activationThreshold: 1, bufferMargin: 0 });

    culling.buildIndex(graph);

    const result = culling.queryVisible({
      minX: 15,
      minY: -1,
      maxX: 35,
      maxY: 1,
    });

    expect(result.nodes).toEqual(
      new Set([asNodeId('node-2'), asNodeId('node-3')]),
    );
    expect(result.edges).toEqual(
      new Set([asEdgeId('edge-1'), asEdgeId('edge-2'), asEdgeId('edge-3')]),
    );
  });

  it('applies the configured buffer margin to visibility queries', () => {
    const graph = makeLinearPositionedGraph(6, 20);
    const culling = new ViewportCulling({ activationThreshold: 1, bufferMargin: 12 });

    culling.buildIndex(graph);

    const withoutNodeInside = culling.queryVisible({
      minX: 28,
      minY: -1,
      maxX: 28,
      maxY: 1,
    });

    expect(withoutNodeInside.nodes.has(asNodeId('node-1'))).toBe(true);
  });

  it('builds one spatial index entry per node and edge with geometry', () => {
    const graph = makeLinearPositionedGraph(10, 10);
    const culling = new ViewportCulling();

    culling.buildIndex(graph);

    expect(culling.getIndexSize()).toBe(graph.nodes.size + graph.edges.size);
  });

  it('updates the current result when bound to viewport changes', async () => {
    const controller = new ViewportController(new MockViewportHost(800, 600), {
      minScale: 0.01,
      maxScale: 100,
    });
    const culling = new ViewportCulling({
      activationThreshold: 1,
      bufferMargin: 0,
      controller,
    });
    const onChange = vi.fn();

    culling.on('culling-change', onChange);
    culling.buildIndex(makeLinearPositionedGraph(2000, 1));

    await controller.panTo(-150, 0);

    expect(onChange).toHaveBeenCalled();
    expect(culling.getLastResult().enabled).toBe(true);

    culling.destroy();
  });

  it('queries visible elements within 16ms for medium-large indexed graphs', () => {
    const graph = makeLinearPositionedGraph(2500, 2);
    const culling = new ViewportCulling({ activationThreshold: 1, bufferMargin: 8 });

    culling.buildIndex(graph);

    const startedAt = performance.now();

    culling.queryVisible({
      minX: 1200,
      minY: -5,
      maxX: 1800,
      maxY: 5,
    });

    expect(performance.now() - startedAt).toBeLessThan(16);
  });

  it('maintains a sub-16ms query budget with roughly 5000 indexed elements', () => {
    const graph = makeLinearPositionedGraph(2501, 2);
    const culling = new ViewportCulling({ activationThreshold: 1, bufferMargin: 16 });

    culling.buildIndex(graph);

    const startedAt = performance.now();
    const result = culling.queryVisible({
      minX: 2000,
      minY: -10,
      maxX: 2600,
      maxY: 10,
    });
    const elapsed = performance.now() - startedAt;

    expect(graph.nodes.size + graph.edges.size).toBeGreaterThanOrEqual(5000);
    expect(result.enabled).toBe(true);
    expect(elapsed).toBeLessThan(16);
  });
});
