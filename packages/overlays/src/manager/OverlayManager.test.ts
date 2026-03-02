import { describe, expect, it } from 'vitest';

import { OverlayManager } from './OverlayManager';
import type {
  OverlayConfiguration,
  OverlayDimensions,
  OverlayLegend,
  OverlayRenderResult,
  RailOverlay,
  RenderContext,
} from '../types';

class OverlayWithLegend implements RailOverlay<{ readonly value: number }, OverlayConfiguration> {
  public readonly updates: Array<unknown> = [];

  public constructor(
    public readonly type: string,
    private readonly legend: OverlayLegend,
  ) {}

  public initialize(): void {
    return;
  }

  public render(_context: RenderContext): OverlayRenderResult {
    return {
      elementCount: 1,
      durationMs: 0,
    };
  }

  public update(data: { readonly value: number }): void {
    this.updates.push(data);
  }

  public resize(_dimensions: OverlayDimensions): void {
    return;
  }

  public destroy(): void {
    return;
  }

  public getLegend(): OverlayLegend {
    return this.legend;
  }

  public getConfiguration(): Readonly<OverlayConfiguration> {
    return {
      visible: true,
      opacity: 1,
      zIndex: 0,
    };
  }
}

const renderContext: RenderContext = {
  dimensions: {
    width: 100,
    height: 100,
  },
};

describe('OverlayManager behavior', () => {
  it('emits events and exposes legends', async () => {
    const manager = new OverlayManager();
    const events: string[] = [];

    manager.on('overlay-added', () => {
      events.push('overlay-added');
    });
    manager.on('visibility-change', () => {
      events.push('visibility-change');
    });
    manager.on('z-order-change', () => {
      events.push('z-order-change');
    });
    manager.on('opacity-change', () => {
      events.push('opacity-change');
    });
    manager.on('data-update', () => {
      events.push('data-update');
    });
    manager.on('overlay-removed', () => {
      events.push('overlay-removed');
    });

    const id = await manager.addOverlay(
      new OverlayWithLegend('custom', {
        title: 'Custom',
        type: 'categorical',
        items: [{ label: 'A', color: '#111111' }],
      }),
    );

    manager.hideOverlay(id);
    manager.showOverlay(id);
    manager.toggleOverlay(id);
    manager.toggleOverlay(id);
    manager.setZOrder(id, 5);
    manager.bringToFront(id);
    manager.sendToBack(id);
    manager.setOpacity(id, 0.6);
    await manager.updateOverlayData(id, { value: 1 });
    await manager.batchUpdate([[id, { value: 2 }]], renderContext);

    expect(manager.getLegends()).toHaveLength(1);
    expect(events).toContain('overlay-added');
    expect(events).toContain('visibility-change');
    expect(events).toContain('z-order-change');
    expect(events).toContain('opacity-change');
    expect(events).toContain('data-update');

    await manager.removeOverlay(id);

    expect(events).toContain('overlay-removed');
  });

  it('supports showAll, hideAll, and targeted rendering', async () => {
    const manager = new OverlayManager();
    const firstId = await manager.addOverlay(
      new OverlayWithLegend('custom', {
        title: 'One',
        type: 'categorical',
        items: [{ label: '1', color: '#111111' }],
      }),
    );
    const secondId = await manager.addOverlay(
      new OverlayWithLegend('custom', {
        title: 'Two',
        type: 'categorical',
        items: [{ label: '2', color: '#222222' }],
      }),
    );

    manager.hideAll();
    expect(await manager.renderOverlay(firstId, renderContext)).toBeUndefined();

    manager.showAll();
    expect(await manager.renderOverlay(firstId, renderContext)).toEqual({
      elementCount: 1,
      durationMs: 0,
    });

    expect((await manager.renderAll(renderContext)).map((result) => result.id)).toEqual([
      firstId,
      secondId,
    ]);
  });
});
