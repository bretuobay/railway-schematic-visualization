import { LifecycleManager } from './LifecycleManager';

function createDestroyable(label: string, log: string[]) {
  return {
    label,
    destroy: () => {
      log.push(`destroy:${label}`);
    },
  };
}

describe('LifecycleManager', () => {
  it('initializes renderer, viewport, overlay manager, and export system in order', async () => {
    const log: string[] = [];
    const manager = new LifecycleManager<
      { readonly name: string },
      { readonly nextName: string },
      { readonly label: string; destroy: () => void },
      { readonly label: string; destroy: () => void },
      { readonly label: string; destroy: () => void },
      { readonly label: string; destroy: () => void }
    >({
      createRenderer: async (input) => {
        log.push(`create:renderer:${input.name}`);

        return createDestroyable('renderer', log);
      },
      createViewport: async (renderer, input) => {
        log.push(`create:viewport:${renderer.label}:${input.name}`);

        return createDestroyable('viewport', log);
      },
      createOverlayManager: async ({ renderer, viewport }, input) => {
        log.push(`create:overlay:${renderer.label}:${viewport.label}:${input.name}`);

        return createDestroyable('overlay', log);
      },
      createExportSystem: async ({ overlayManager }, input) => {
        log.push(`create:export:${overlayManager.label}:${input.name}`);

        return createDestroyable('export', log);
      },
      afterInitialize: async (resources, input) => {
        log.push(`after:${resources.renderer.label}:${input.name}`);
      },
      update: async (resources, input) => {
        log.push(`update:${resources.renderer.label}:${input.nextName}`);
      },
    });

    const resources = await manager.initialize({ name: 'initial' });
    await manager.update({ nextName: 'changed' });

    expect(manager.isInitialized()).toBe(true);
    expect(manager.getResources()).toBe(resources);
    expect(resources.renderer.label).toBe('renderer');
    expect(resources.viewport.label).toBe('viewport');
    expect(resources.overlayManager.label).toBe('overlay');
    expect(resources.exportSystem?.label).toBe('export');
    expect(log).toEqual([
      'create:renderer:initial',
      'create:viewport:renderer:initial',
      'create:overlay:renderer:viewport:initial',
      'create:export:overlay:initial',
      'after:renderer:initial',
      'update:renderer:changed',
    ]);
  });

  it('cleans up resources in reverse dependency order and resets state', async () => {
    const log: string[] = [];
    const manager = new LifecycleManager<
      { readonly mounted: true },
      { readonly updated: true },
      { readonly label: string; destroy: () => void },
      { readonly label: string; destroy: () => void },
      { readonly label: string; destroy: () => void },
      { readonly label: string; destroy: () => void }
    >({
      createRenderer: async () => createDestroyable('renderer', log),
      createViewport: async () => createDestroyable('viewport', log),
      createOverlayManager: async () => createDestroyable('overlay', log),
      createExportSystem: async () => createDestroyable('export', log),
      beforeCleanup: async () => {
        log.push('before-cleanup');
      },
    });

    await manager.initialize({ mounted: true });
    await manager.cleanup();

    expect(manager.isInitialized()).toBe(false);
    expect(manager.getResources()).toBeUndefined();
    expect(log).toEqual([
      'before-cleanup',
      'destroy:export',
      'destroy:overlay',
      'destroy:viewport',
      'destroy:renderer',
    ]);
  });

  it('throws a lifecycle error when updating before initialization', async () => {
    const manager = new LifecycleManager<
      { readonly mounted: true },
      { readonly updated: true },
      { readonly label: string; destroy: () => void },
      { readonly label: string; destroy: () => void },
      { readonly label: string; destroy: () => void }
    >({
      createRenderer: async () => createDestroyable('renderer', []),
      createViewport: async () => createDestroyable('viewport', []),
      createOverlayManager: async () => createDestroyable('overlay', []),
    });

    await expect(
      manager.update({ updated: true }),
    ).rejects.toMatchObject({
      name: 'LifecycleError',
      context: {
        phase: 'update',
      },
    });
  });

  it('rolls back partial initialization and wraps lifecycle failures', async () => {
    const log: string[] = [];
    const manager = new LifecycleManager<
      { readonly mounted: true },
      { readonly updated: true },
      { readonly label: string; destroy: () => void },
      { readonly label: string; destroy: () => void },
      { readonly label: string; destroy: () => void }
    >({
      createRenderer: async () => createDestroyable('renderer', log),
      createViewport: async () => createDestroyable('viewport', log),
      createOverlayManager: async () => {
        throw new Error('overlay failed');
      },
    });

    await expect(
      manager.initialize({ mounted: true }),
    ).rejects.toMatchObject({
      name: 'LifecycleError',
      context: {
        phase: 'initialize',
        cause: 'overlay failed',
      },
    });
    expect(manager.isInitialized()).toBe(false);
    expect(log).toEqual([
      'destroy:viewport',
      'destroy:renderer',
    ]);
  });
});
