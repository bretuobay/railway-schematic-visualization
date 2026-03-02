import {
  CoordinateBridge,
  CoordinateSystemType,
  GraphBuilder,
} from '@rail-schematic-viz/core';
import { EventManager, ViewportController } from '@rail-schematic-viz/layout';
import { describe, expect, it, vi } from 'vitest';

import { AnnotationOverlay, HeatMapOverlay, RangeBandOverlay } from './builtins';
import type { LegendDescriptor } from './legend';
import { LegendRenderer } from './legend';
import { OverlayManager } from './manager';

class OrderedOverlay extends HeatMapOverlay {
  public readonly calls: string[];
  private readonly label: string;

  public constructor(label: string, calls: string[]) {
    super({
      data: [
        {
          id: `${label}-point`,
          position: { type: CoordinateSystemType.Screen, x: 10, y: 10 },
          value: 1,
        },
      ],
    });
    this.label = label;
    this.calls = calls;
  }

  public override render(context: Parameters<HeatMapOverlay['render']>[0]) {
    this.calls.push(this.label);
    return super.render(context);
  }
}

function createLinearAndScreenBridge(): CoordinateBridge {
  const linearGraph = new GraphBuilder()
    .addNode({
      id: 'n1',
      name: 'Start',
      type: 'station',
      coordinate: {
        type: CoordinateSystemType.Linear,
        trackId: 'track-1',
        distance: 0,
      },
    })
    .addNode({
      id: 'n2',
      name: 'End',
      type: 'station',
      coordinate: {
        type: CoordinateSystemType.Linear,
        trackId: 'track-1',
        distance: 100,
      },
    })
    .addEdge({
      id: 'e1',
      source: 'n1',
      target: 'n2',
      length: 100,
      geometry: {
        type: 'straight',
      },
    })
    .addLine({
      id: 'l1',
      name: 'Line',
      edges: ['e1'],
    })
    .build();
  const screenGraph = new GraphBuilder()
    .addNode({
      id: 'n1',
      name: 'Start',
      type: 'station',
      coordinate: {
        type: CoordinateSystemType.Screen,
        x: 0,
        y: 0,
      },
    })
    .addNode({
      id: 'n2',
      name: 'End',
      type: 'station',
      coordinate: {
        type: CoordinateSystemType.Screen,
        x: 100,
        y: 0,
      },
    })
    .addEdge({
      id: 'e1',
      source: 'n1',
      target: 'n2',
      length: 100,
      geometry: {
        type: 'straight',
      },
    })
    .addLine({
      id: 'l1',
      name: 'Line',
      edges: ['e1'],
    })
    .build();

  return new CoordinateBridge(linearGraph, screenGraph);
}

describe('overlays integration', () => {
  it('handles multi-overlay z-order, visibility, batch updates, legends, and delegated events', async () => {
    const calls: string[] = [];
    const manager = new OverlayManager();
    const back = new OrderedOverlay('back', calls);
    const front = new OrderedOverlay('front', calls);
    const clickHandler = vi.fn();

    const backId = await manager.addOverlay(back, { id: 'back', zIndex: 1 });
    const frontId = await manager.addOverlay(front, { id: 'front', zIndex: 2 });
    manager.on('overlay-click', clickHandler);
    manager.registerInteractiveElement(frontId, 'front-node');

    await manager.renderAll({
      dimensions: { width: 100, height: 100 },
    });

    expect(calls).toEqual(['back', 'front']);

    manager.hideOverlay(backId);
    expect(manager.getLegends().map((legend) => legend.overlayId)).toEqual(['front']);

    await manager.batchUpdate([
      [
        backId,
        [
          {
            id: 'back-2',
            position: { type: CoordinateSystemType.Screen, x: 20, y: 20 },
            value: 2,
          },
        ],
      ],
      [
        frontId,
        [
          {
            id: 'front-2',
            position: { type: CoordinateSystemType.Screen, x: 30, y: 30 },
            value: 3,
          },
        ],
      ],
    ]);

    manager.showOverlay(backId);
    manager.delegateEvent({
      event: 'element-click',
      element: {
        id: 'front-node',
        type: 'overlay-node',
        properties: {},
        isOverlay: true,
      },
      coordinates: { x: 10, y: 20 },
    });

    expect(clickHandler).toHaveBeenCalledTimes(1);

    const legendRenderer = new LegendRenderer();
    const legendDescriptors: LegendDescriptor[] = manager.getLegends().map((legend) => {
      if (legend.type === 'continuous') {
        return {
          id: legend.overlayId,
          title: legend.title,
          type: 'continuous',
          min: legend.min ?? 0,
          max: legend.max ?? 1,
          startColor: legend.items[0]?.color ?? '#000000',
          endColor: legend.items.at(-1)?.color ?? '#ffffff',
        };
      }

      return {
        id: legend.overlayId,
        title: legend.title,
        type: 'categorical',
        items: legend.items,
      };
    });
    const renderedLegends = legendRenderer.render(legendDescriptors);

    expect(renderedLegends.length).toBeGreaterThan(0);
  });

  it('integrates with CoordinateBridge, ViewportController, EventManager, and RailGraph-backed contexts', async () => {
    const bridge = createLinearAndScreenBridge();
    const interactionRoot = {
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    };
    const viewportHost = {
      clientWidth: 200,
      clientHeight: 100,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 100 }),
    };
    const eventManager = new EventManager(interactionRoot);
    const viewportController = new ViewportController(viewportHost);
    const manager = new OverlayManager({
      coordinateBridge: bridge,
      eventManager,
      viewportController,
      graph: (bridge as unknown as { readonly linearGraph: unknown }).linearGraph as never,
    });
    const heatMapId = await manager.addOverlay(
      new HeatMapOverlay({
        data: [
          {
            id: 'heat',
            position: {
              type: CoordinateSystemType.Linear,
              trackId: 'track-1',
              distance: 50,
            },
            value: 3,
          },
        ],
      }),
      { id: 'heat' },
    );
    const annotationId = await manager.addOverlay(
      new AnnotationOverlay({
        data: [
          {
            id: 'annotation',
            position: {
              type: CoordinateSystemType.Linear,
              trackId: 'track-1',
              distance: 40,
            },
            label: 'Midpoint',
          },
        ],
      }),
      { id: 'annotation' },
    );
    const rangeBandId = await manager.addOverlay(
      new RangeBandOverlay({
        data: [
          {
            id: 'band',
            start: {
              type: CoordinateSystemType.Linear,
              trackId: 'track-1',
              distance: 20,
            },
            end: {
              type: CoordinateSystemType.Linear,
              trackId: 'track-1',
              distance: 80,
            },
            label: 'Segment',
          },
        ],
      }),
      { id: 'band' },
    );

    const results = await manager.renderAll({
      dimensions: { width: 200, height: 100 },
      viewportBounds: { minX: 0, minY: -10, maxX: 200, maxY: 100 },
      transform: { x: 0, y: 0, scale: 1 },
    });

    expect(results.map((result) => result.id)).toEqual([heatMapId, rangeBandId, annotationId]);

    const detach = manager.attachViewportChangeHandler(() => undefined, { mode: 'throttle' });
    expect(typeof detach).toBe('function');
    detach?.();

    eventManager.destroy();
    viewportController.destroy();
  });
});
