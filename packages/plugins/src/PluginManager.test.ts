import { RailGraph } from '@rail-schematic-viz/core';
import { describe, expect, it, vi } from 'vitest';

import { PluginManager } from './index';

function createGraph(): RailGraph {
  return new RailGraph({
    edges: [],
    lines: [],
    nodes: [],
  });
}

describe('PluginManager', () => {
  it('registers plugins, initializes them, and emits registration events', async () => {
    const graph = createGraph();
    const renderer = { id: 'renderer-1' };
    const coordinateBridge = { id: 'bridge-1' };
    const initialize = vi.fn();
    const listener = vi.fn();
    const manager = new PluginManager({
      coordinateBridge,
      graph,
      renderer,
    });
    const unsubscribe = manager.on('plugin-registered', listener);

    const info = await manager.registerPlugin(
      'analytics',
      {
        initialize,
      },
      { mode: 'audit' },
    );

    expect(info).toEqual({
      enabled: true,
      name: 'analytics',
      options: { mode: 'audit' },
    });
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        coordinateBridge,
        graph,
        options: { mode: 'audit' },
        renderer,
      }),
    );
    expect(manager.listPlugins()).toEqual([info]);
    expect(manager.isPluginEnabled('analytics')).toBe(true);
    expect(listener).toHaveBeenCalledWith({
      enabled: true,
      event: 'plugin-registered',
      name: 'analytics',
      options: { mode: 'audit' },
    });

    unsubscribe();
    manager.off('plugin-registered', listener);
  });

  it('forwards render, viewport, and data update hooks with the latest runtime context', async () => {
    const initialGraph = createGraph();
    const nextGraph = createGraph();
    const initialRenderer = { id: 'renderer-1' };
    const nextRenderer = { id: 'renderer-2' };
    const initialBridge = { id: 'bridge-1' };
    const nextBridge = { id: 'bridge-2' };
    const viewport = { zoom: 2 };
    const svgRoot = { nodeName: 'svg' };
    const beforeRender = vi.fn();
    const afterRender = vi.fn();
    const onViewportChange = vi.fn();
    const onDataUpdate = vi.fn();
    const manager = new PluginManager({
      coordinateBridge: initialBridge,
      graph: initialGraph,
      renderer: initialRenderer,
    });

    await manager.registerPlugin('metrics', {
      afterRender,
      beforeRender,
      onDataUpdate,
      onViewportChange,
    });

    manager.updateRenderer(nextRenderer);
    manager.updateCoordinateBridge(nextBridge);

    await manager.notifyDataUpdate(nextGraph);
    await manager.notifyViewportChange(viewport, { source: 'pan' });
    await manager.beforeRender(viewport, svgRoot);
    await manager.afterRender(viewport, svgRoot);

    expect(onDataUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        coordinateBridge: nextBridge,
        graph: nextGraph,
        previousGraph: initialGraph,
        renderer: nextRenderer,
      }),
    );
    expect(onViewportChange).toHaveBeenCalledWith(
      expect.objectContaining({
        coordinateBridge: nextBridge,
        graph: nextGraph,
        payload: { source: 'pan' },
        renderer: nextRenderer,
        viewport,
      }),
    );
    expect(beforeRender).toHaveBeenCalledWith(
      expect.objectContaining({
        coordinateBridge: nextBridge,
        graph: nextGraph,
        renderer: nextRenderer,
        svgRoot,
        viewport,
      }),
    );
    expect(afterRender).toHaveBeenCalledWith(
      expect.objectContaining({
        coordinateBridge: nextBridge,
        graph: nextGraph,
        renderer: nextRenderer,
        svgRoot,
        viewport,
      }),
    );
  });

  it('supports disabling, re-enabling, and unregistering plugins', async () => {
    const initialize = vi.fn();
    const beforeRender = vi.fn();
    const destroy = vi.fn();
    const listener = vi.fn();
    const manager = new PluginManager({
      graph: createGraph(),
      renderer: { id: 'renderer' },
    });

    manager.on('plugin-enabled', listener);
    manager.on('plugin-disabled', listener);
    manager.on('plugin-unregistered', listener);

    await manager.registerPlugin('selection', {
      beforeRender,
      destroy,
      initialize,
    });

    expect(initialize).toHaveBeenCalledTimes(1);

    manager.disablePlugin('selection');
    await manager.beforeRender({ zoom: 1 }, { nodeName: 'svg' });
    expect(beforeRender).not.toHaveBeenCalled();
    expect(manager.isPluginEnabled('selection')).toBe(false);

    await manager.enablePlugin('selection');
    expect(initialize).toHaveBeenCalledTimes(2);
    expect(manager.isPluginEnabled('selection')).toBe(true);

    await manager.beforeRender({ zoom: 1 }, { nodeName: 'svg' });
    expect(beforeRender).toHaveBeenCalledTimes(1);

    await expect(manager.unregisterPlugin('selection')).resolves.toBe(true);
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(manager.listPlugins()).toEqual([]);
    await expect(manager.unregisterPlugin('selection')).resolves.toBe(false);

    expect(listener.mock.calls.map((call) => call[0].event)).toEqual([
      'plugin-disabled',
      'plugin-enabled',
      'plugin-unregistered',
    ]);
  });

  it('rejects invalid plugins, duplicate names, and missing registrations', async () => {
    const manager = new PluginManager({
      graph: createGraph(),
      renderer: { id: 'renderer' },
    });

    await expect(manager.registerPlugin('invalid-empty', {})).rejects.toThrow(
      'Plugin must implement at least one lifecycle hook.',
    );
    await expect(
      manager.registerPlugin('invalid-shape', {
        beforeRender: true as never,
      }),
    ).rejects.toThrow('Plugin hook "beforeRender" must be a function when provided.');

    await manager.registerPlugin('valid', {
      initialize: vi.fn(),
    });

    await expect(
      manager.registerPlugin('valid', {
        initialize: vi.fn(),
      }),
    ).rejects.toThrow('Plugin "valid" is already registered.');

    expect(() => manager.disablePlugin('missing')).toThrow(
      'Plugin "missing" is not registered.',
    );
    await expect(manager.enablePlugin('missing')).rejects.toThrow(
      'Plugin "missing" is not registered.',
    );
  });

  it('logs hook failures without breaking the manager lifecycle', async () => {
    const logger = {
      error: vi.fn(),
    };
    const manager = new PluginManager({
      graph: createGraph(),
      logger,
      renderer: { id: 'renderer' },
    });

    await expect(
      manager.registerPlugin('faulty', {
        initialize: () => {
          throw new Error('init-failed');
        },
        beforeRender: () => {
          throw new Error('render-failed');
        },
        destroy: () => {
          throw new Error('destroy-failed');
        },
      }),
    ).resolves.toEqual({
      enabled: true,
      name: 'faulty',
      options: {},
    });

    await expect(
      manager.beforeRender({ zoom: 1 }, { nodeName: 'svg' }),
    ).resolves.toBeUndefined();
    await expect(manager.unregisterPlugin('faulty')).resolves.toBe(true);

    expect(logger.error).toHaveBeenCalledTimes(3);
    expect(logger.error.mock.calls[0]?.[0]).toContain('initialize');
    expect(logger.error.mock.calls[1]?.[0]).toContain('beforeRender');
    expect(logger.error.mock.calls[2]?.[0]).toContain('destroy');
  });
});
