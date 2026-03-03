import { describe, expect, it, vi } from 'vitest';

import { OverlayManager } from './OverlayManager';
import type {
  OverlayConfiguration,
  OverlayDimensions,
  OverlayRenderResult,
  RailOverlay,
  RenderContext,
} from '../types';

class ManagedOverlay implements RailOverlay<unknown, OverlayConfiguration> {
  public configuration: OverlayConfiguration = {};
  public configureCalls: Array<Partial<OverlayConfiguration>> = [];

  public constructor(public readonly type: string) {}

  public initialize(): void {
    return;
  }

  public render(_context: RenderContext): OverlayRenderResult {
    return { elementCount: 1, durationMs: 0 };
  }

  public update(): void {
    return;
  }

  public resize(_dimensions: OverlayDimensions): void {
    return;
  }

  public destroy(): void {
    return;
  }

  public configure(configuration: Partial<OverlayConfiguration>): OverlayConfiguration {
    this.configureCalls.push(configuration);
    this.configuration = {
      ...this.configuration,
      ...configuration,
    };

    return this.configuration;
  }

  public getConfiguration(): Readonly<OverlayConfiguration> {
    return this.configuration;
  }
}

describe('OverlayManager events and configuration', () => {
  it('delegates click and hover events to overlay and scoped handlers', async () => {
    const manager = new OverlayManager();
    const overlay = new ManagedOverlay('custom');
    const overlayId = await manager.addOverlay(overlay, { id: 'custom-1' });
    const clickHandler = vi.fn();
    const hoverHandler = vi.fn();
    const scopedHandler = vi.fn();

    manager.on('overlay-click', clickHandler);
    manager.on('overlay-hover', hoverHandler);
    manager.registerOverlayEventHandler(overlayId, 'overlay-click', scopedHandler);
    manager.registerInteractiveElement(overlayId, 'element-1');

    manager.delegateEvent({
      event: 'element-click',
      element: {
        id: 'element-1',
        type: 'annotation',
        properties: {},
        isOverlay: true,
      },
      coordinates: { x: 5, y: 7 },
    });
    manager.delegateEvent({
      event: 'element-hover',
      element: {
        id: 'element-1',
        type: 'annotation',
        properties: {},
        isOverlay: true,
      },
      coordinates: { x: 6, y: 8 },
    });

    expect(clickHandler).toHaveBeenCalledTimes(1);
    expect(hoverHandler).toHaveBeenCalledTimes(1);
    expect(scopedHandler).toHaveBeenCalledTimes(1);

    await manager.removeOverlay(overlayId);
    manager.delegateEvent({
      event: 'element-click',
      element: {
        id: 'element-1',
        type: 'annotation',
        properties: {},
        isOverlay: true,
      },
      coordinates: { x: 5, y: 7 },
    });

    expect(clickHandler).toHaveBeenCalledTimes(1);
  });

  it('applies defaults and emits configuration changes', async () => {
    const manager = new OverlayManager();
    const overlay = new ManagedOverlay('custom');
    const configurationEvents: Array<unknown> = [];
    const overlayId = await manager.addOverlay(overlay, { id: 'custom-1' });

    manager.on('configuration-change', (payload) => {
      configurationEvents.push(payload);
    });

    expect(manager.getOverlayConfiguration(overlayId)).toMatchObject({
      visible: true,
      zIndex: 0,
      opacity: 1,
    });

    await manager.updateOverlayConfiguration(overlayId, {
      opacity: 0.5,
      metadata: { pointRadius: 10 },
    });

    expect(manager.getOverlayConfiguration(overlayId).opacity).toBe(0.5);
    expect(overlay.configureCalls).toHaveLength(2);
    expect(configurationEvents).toHaveLength(1);
  });

  it('rejects invalid configuration updates', async () => {
    const manager = new OverlayManager();
    const overlayId = await manager.addOverlay(new ManagedOverlay('custom'), { id: 'custom-1' });

    await expect(
      manager.updateOverlayConfiguration(overlayId, {
        opacity: 2,
      }),
    ).rejects.toThrowError(/Opacity/);
  });

  it('attaches debounced viewport handlers and accessibility decoration', async () => {
    const listeners = new Map<string, Set<(payload: unknown) => void>>();
    const viewportController = {
      on: (event: string, handler: (payload: unknown) => void) => {
        const handlers = listeners.get(event) ?? new Set<(payload: unknown) => void>();
        handlers.add(handler);
        listeners.set(event, handlers);
      },
      off: (event: string, handler: (payload: unknown) => void) => {
        listeners.get(event)?.delete(handler);
      },
    };
    const manager = new OverlayManager({ viewportController } as never);
    const cleanup = manager.attachViewportChangeHandler(() => undefined);
    const nodes = manager.applyAccessibility('overlay-1', [
      { id: 'node-1', tag: 'circle', attributes: { cx: '0', cy: '0', r: '1' } },
    ], {
      interactiveNodeIds: ['node-1'],
    });

    expect(listeners.get('viewport-change')?.size).toBe(1);
    expect(nodes[0]?.attributes.role).toBe('button');

    cleanup?.();

    expect(listeners.get('viewport-change')?.size ?? 0).toBe(0);
  });
});
