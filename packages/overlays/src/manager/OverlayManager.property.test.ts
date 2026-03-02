import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { OverlayManager } from '.';
import type {
  OverlayDimensions,
  OverlayRenderResult,
  RailOverlay,
  RenderContext,
} from '../types';

class MockOverlay implements RailOverlay<unknown> {
  public readonly initializeCalls: Array<unknown> = [];
  public readonly renderCalls: Array<RenderContext> = [];
  public readonly updateCalls: Array<unknown> = [];
  public readonly resizeCalls: Array<OverlayDimensions> = [];
  public readonly destroyCalls: Array<number> = [];
  public readonly renderOrder: Array<string>;

  public constructor(
    public readonly type: string,
    private readonly label: string,
    renderOrder: Array<string>,
  ) {
    this.renderOrder = renderOrder;
  }

  public initialize(context: unknown): void {
    this.initializeCalls.push(context);
  }

  public render(context: RenderContext): OverlayRenderResult {
    this.renderCalls.push(context);
    this.renderOrder.push(this.label);

    return {
      elementCount: 1,
      durationMs: 0,
    };
  }

  public update(data: unknown): void {
    this.updateCalls.push(data);
  }

  public resize(dimensions: OverlayDimensions): void {
    this.resizeCalls.push(dimensions);
  }

  public destroy(): void {
    this.destroyCalls.push(Date.now());
  }
}

const renderContext: RenderContext = {
  dimensions: {
    width: 100,
    height: 100,
  },
};

describe('OverlayManager', () => {
  it('maintains the overlay collection', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 6 }), async (count) => {
        const manager = new OverlayManager();
        const overlays = Array.from({ length: count }, (_, index) => new MockOverlay('test', `${index}`, []));
        const ids = await Promise.all(overlays.map((overlay) => manager.addOverlay(overlay)));

        expect(manager.getAllOverlays()).toHaveLength(count);
        expect(manager.getOverlay(ids[0]!)).toBe(overlays[0]);

        await manager.removeOverlay(ids[0]!);

        expect(manager.getAllOverlays()).toHaveLength(count - 1);
      }),
    );
  });

  it('assigns unique identifiers for repeated overlay types', async () => {
    const manager = new OverlayManager();
    const firstId = await manager.addOverlay(new MockOverlay('heat-map', 'first', []));
    const secondId = await manager.addOverlay(new MockOverlay('heat-map', 'second', []));

    expect(firstId).not.toBe(secondId);
  });

  it('invokes lifecycle methods on add, update, and remove', async () => {
    const manager = new OverlayManager();
    const overlay = new MockOverlay('annotation', 'overlay', []);
    const id = await manager.addOverlay(overlay);

    await manager.updateOverlayData(id, { value: 1 });
    await manager.removeOverlay(id);

    expect(overlay.initializeCalls).toHaveLength(1);
    expect(overlay.updateCalls).toEqual([{ value: 1 }]);
    expect(overlay.destroyCalls).toHaveLength(1);
  });

  it('supports multiple instances of the same type', async () => {
    const manager = new OverlayManager();

    await manager.addOverlay(new MockOverlay('annotation', 'first', []));
    await manager.addOverlay(new MockOverlay('annotation', 'second', []));

    expect(manager.getAllOverlays().map((entry) => entry.overlay.type)).toEqual([
      'annotation',
      'annotation',
    ]);
  });

  it('applies visibility changes without affecting other overlays', async () => {
    const manager = new OverlayManager();
    const firstId = await manager.addOverlay(new MockOverlay('range-band', 'first', []));
    const secondId = await manager.addOverlay(new MockOverlay('range-band', 'second', []));

    manager.hideOverlay(firstId);

    const overlays = manager.getAllOverlays();

    expect(overlays.find((entry) => entry.id === firstId)?.visible).toBe(false);
    expect(overlays.find((entry) => entry.id === secondId)?.visible).toBe(true);
  });

  it('renders overlays in z-order sequence', async () => {
    const renderOrder: string[] = [];
    const manager = new OverlayManager();

    await manager.addOverlay(new MockOverlay('time-series', 'middle', renderOrder), { zIndex: 2 });
    await manager.addOverlay(new MockOverlay('time-series', 'back', renderOrder), { zIndex: 1 });
    await manager.addOverlay(new MockOverlay('time-series', 'front', renderOrder), { zIndex: 3 });

    await manager.renderAll(renderContext);

    expect(renderOrder).toEqual(['back', 'middle', 'front']);
  });

  it('rejects invalid opacity values', async () => {
    const manager = new OverlayManager();
    const id = await manager.addOverlay(new MockOverlay('heat-map', 'overlay', []));

    expect(() => manager.setOpacity(id, 1.5)).toThrowError(/Opacity/);
    expect(() => manager.setOpacity(id, Number.NaN)).toThrowError(/Opacity/);
  });

  it('updates only the targeted overlay data', async () => {
    const manager = new OverlayManager();
    const first = new MockOverlay('traffic-flow', 'first', []);
    const second = new MockOverlay('traffic-flow', 'second', []);
    const firstId = await manager.addOverlay(first);
    const secondId = await manager.addOverlay(second);

    await manager.updateOverlayData(firstId, { target: 'first' });
    await manager.updateOverlayData(secondId, { target: 'second' });

    expect(first.updateCalls).toEqual([{ target: 'first' }]);
    expect(second.updateCalls).toEqual([{ target: 'second' }]);
  });
});
