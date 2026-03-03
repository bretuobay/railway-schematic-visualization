import { describe, expect, it, vi } from 'vitest';

import {
  ContextMenuController,
  type ContextMenuTarget,
  type MenuItem,
} from './index';

interface TestTarget extends ContextMenuTarget {
  readonly kind: 'edge' | 'node';
}

function createTarget(kind: TestTarget['kind'] = 'node'): TestTarget {
  return {
    id: `${kind}-1`,
    kind,
    label: `${kind.toUpperCase()} 1`,
    type: kind,
  };
}

describe('ContextMenuController', () => {
  it('registers menu items and resolves a visible menu within viewport bounds', () => {
    const controller = new ContextMenuController<TestTarget>();
    const stateListener = vi.fn();

    controller.onStateChange(stateListener);
    controller.registerMenuItem({
      id: 'view-details',
      label: ({ target }) => `View ${target?.label ?? 'Item'}`,
    });
    controller.registerMenuItem({
      id: 'separator-a',
      separator: true,
    });
    controller.registerMenuItem({
      id: 'edge-only',
      label: 'Edge only',
      visible: ({ target }) => target?.kind === 'edge',
    });
    controller.registerMenuItem({
      id: 'select-connected',
      label: 'Select Connected',
      submenu: [
        {
          id: 'select-upstream',
          label: 'Upstream',
        },
      ],
    });

    const state = controller.show({
      position: { x: 190, y: 170 },
      size: { height: 100, width: 120 },
      target: createTarget('edge'),
      viewport: { height: 200, width: 250 },
    });

    expect(controller.isVisible()).toBe(true);
    expect(state.position).toEqual({ x: 130, y: 100 });
    expect(state.items.map((item) => item.id)).toEqual([
      'view-details',
      'separator-a',
      'edge-only',
      'select-connected',
    ]);
    expect(state.items[0]?.label).toBe('View EDGE 1');
    expect(state.items[3]?.submenu.map((item) => item.id)).toEqual([
      'select-upstream',
    ]);
    expect(state.activeIndex).toBe(0);
    expect(stateListener).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'show',
      }),
    );
  });

  it('supports keyboard navigation, selection events, and closes after selection', async () => {
    const controller = new ContextMenuController<TestTarget>();
    const action = vi.fn();
    const selectionListener = vi.fn();
    const stateListener = vi.fn();
    const items: MenuItem<TestTarget>[] = [
      {
        disabled: true,
        id: 'disabled',
        label: 'Disabled',
      },
      {
        id: 'zoom-to-element',
        label: 'Zoom to Element',
        shortcut: 'Enter',
        action,
      },
      {
        id: 'copy-coordinates',
        label: 'Copy Coordinates',
      },
    ];

    controller.onSelect(selectionListener);
    controller.onStateChange(stateListener);
    items.forEach((item) => controller.registerMenuItem(item));

    controller.show({
      position: { x: 20, y: 30 },
      target: createTarget(),
      viewport: { height: 300, width: 400 },
    });

    expect(controller.getState().activeIndex).toBe(1);

    await controller.handleKeyDown('ArrowDown');
    expect(controller.getState().activeIndex).toBe(2);

    await controller.handleKeyDown('ArrowUp');
    expect(controller.getState().activeIndex).toBe(1);

    await expect(controller.handleKeyDown('Enter')).resolves.toBe(true);

    expect(action).toHaveBeenCalledWith(
      expect.objectContaining({
        item: expect.objectContaining({
          id: 'zoom-to-element',
        }),
        source: 'keyboard',
        target: expect.objectContaining({
          kind: 'node',
        }),
      }),
    );
    expect(selectionListener).toHaveBeenCalledWith(
      expect.objectContaining({
        item: expect.objectContaining({
          id: 'zoom-to-element',
        }),
        source: 'keyboard',
      }),
    );
    expect(controller.isVisible()).toBe(false);
    expect(stateListener.mock.calls.map((call) => call[0].reason)).toContain('focus');
    expect(stateListener.mock.calls.map((call) => call[0].reason)).toContain('hide');
  });

  it('closes on outside pointer and Escape, but ignores inside clicks', async () => {
    const controller = new ContextMenuController<TestTarget>({
      defaultSize: { height: 80, width: 120 },
    });

    controller.registerMenuItem({
      id: 'view',
      label: 'View',
    });

    controller.show({
      position: { x: 10, y: 10 },
      target: createTarget(),
      viewport: { height: 200, width: 200 },
    });

    expect(controller.handlePointerDown({ x: 50, y: 50 })).toBe(false);
    expect(controller.isVisible()).toBe(true);

    expect(controller.handlePointerDown({ x: 180, y: 150 })).toBe(true);
    expect(controller.isVisible()).toBe(false);

    controller.show({
      position: { x: 10, y: 10 },
      target: createTarget(),
      viewport: { height: 200, width: 200 },
    });

    await expect(controller.handleKeyDown('Escape')).resolves.toBe(true);
    expect(controller.isVisible()).toBe(false);
  });

  it('recomputes visible state when items change while the menu is open', () => {
    const controller = new ContextMenuController<TestTarget>();
    const stateListener = vi.fn();

    controller.onStateChange(stateListener);
    controller.registerMenuItem({
      id: 'view',
      label: 'View',
    });
    controller.registerMenuItem({
      id: 'hide',
      label: 'Hide',
    });

    controller.show({
      position: { x: 0, y: 0 },
      target: createTarget(),
      viewport: { height: 100, width: 100 },
    });

    expect(controller.getState().items.map((item) => item.id)).toEqual([
      'view',
      'hide',
    ]);

    expect(controller.unregisterMenuItem('view')).toBe(true);
    expect(controller.getState().items.map((item) => item.id)).toEqual(['hide']);
    expect(stateListener.mock.calls.map((call) => call[0].reason)).toContain(
      'items-change',
    );
  });

  it('validates malformed menu items early', () => {
    const controller = new ContextMenuController();

    expect(() =>
      controller.registerMenuItem({
        id: '',
      } as never),
    ).toThrow('Menu item id must be a non-empty string.');
    expect(() =>
      controller.registerMenuItem({
        id: 'broken-label',
        label: 42 as never,
      }),
    ).toThrow('Menu item "broken-label" label must be a string or function.');
    expect(() =>
      controller.registerMenuItem({
        id: 'broken-action',
        action: true as never,
      }),
    ).toThrow('Menu item "broken-action" action must be a function when provided.');
  });
});
