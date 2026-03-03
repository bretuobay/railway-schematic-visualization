import { LifecycleError } from '../errors';

export interface LifecycleResources<
  TRenderer = unknown,
  TViewport = unknown,
  TOverlayManager = unknown,
  TExportSystem = unknown,
> {
  readonly renderer: TRenderer;
  readonly viewport: TViewport;
  readonly overlayManager: TOverlayManager;
  readonly exportSystem?: TExportSystem;
}

export interface LifecycleFactorySet<
  TInitializeInput,
  TUpdateInput,
  TRenderer,
  TViewport,
  TOverlayManager,
  TExportSystem = unknown,
> {
  createRenderer(input: TInitializeInput): TRenderer | Promise<TRenderer>;
  createViewport(
    renderer: TRenderer,
    input: TInitializeInput,
  ): TViewport | Promise<TViewport>;
  createOverlayManager(
    resources: Pick<
      LifecycleResources<TRenderer, TViewport, TOverlayManager, TExportSystem>,
      'renderer' | 'viewport'
    >,
    input: TInitializeInput,
  ): TOverlayManager | Promise<TOverlayManager>;
  createExportSystem?(
    resources: LifecycleResources<TRenderer, TViewport, TOverlayManager, TExportSystem>,
    input: TInitializeInput,
  ): TExportSystem | Promise<TExportSystem>;
  afterInitialize?(
    resources: LifecycleResources<TRenderer, TViewport, TOverlayManager, TExportSystem>,
    input: TInitializeInput,
  ): void | Promise<void>;
  update?(
    resources: LifecycleResources<TRenderer, TViewport, TOverlayManager, TExportSystem>,
    input: TUpdateInput,
  ): void | Promise<void>;
  beforeCleanup?(
    resources: LifecycleResources<TRenderer, TViewport, TOverlayManager, TExportSystem>,
  ): void | Promise<void>;
}

type ManagedResource = Readonly<Record<string, unknown>> | undefined;

export class LifecycleManager<
  TInitializeInput,
  TUpdateInput = Partial<TInitializeInput>,
  TRenderer = unknown,
  TViewport = unknown,
  TOverlayManager = unknown,
  TExportSystem = unknown,
> {
  private resources:
    | LifecycleResources<TRenderer, TViewport, TOverlayManager, TExportSystem>
    | undefined;
  private readonly factories: LifecycleFactorySet<
    TInitializeInput,
    TUpdateInput,
    TRenderer,
    TViewport,
    TOverlayManager,
    TExportSystem
  >;

  public constructor(
    factories: LifecycleFactorySet<
      TInitializeInput,
      TUpdateInput,
      TRenderer,
      TViewport,
      TOverlayManager,
      TExportSystem
    >,
  ) {
    this.factories = factories;
  }

  public isInitialized(): boolean {
    return this.resources !== undefined;
  }

  public getResources():
    | LifecycleResources<TRenderer, TViewport, TOverlayManager, TExportSystem>
    | undefined {
    return this.resources;
  }

  public async initialize(
    input: TInitializeInput,
  ): Promise<LifecycleResources<TRenderer, TViewport, TOverlayManager, TExportSystem>> {
    if (this.resources) {
      throw new LifecycleError('Lifecycle resources are already initialized.', {
        phase: 'initialize',
      });
    }

    let renderer: TRenderer | undefined;
    let viewport: TViewport | undefined;
    let overlayManager: TOverlayManager | undefined;
    let exportSystem: TExportSystem | undefined;

    try {
      renderer = await this.factories.createRenderer(input);
      viewport = await this.factories.createViewport(renderer, input);
      overlayManager = await this.factories.createOverlayManager(
        { renderer, viewport },
        input,
      );
      const baseResources = {
        renderer,
        viewport,
        overlayManager,
      } as LifecycleResources<TRenderer, TViewport, TOverlayManager, TExportSystem>;

      if (this.factories.createExportSystem) {
        exportSystem = await this.factories.createExportSystem(baseResources, input);
      }

      this.resources = {
        ...baseResources,
        ...(exportSystem !== undefined ? { exportSystem } : {}),
      };

      await this.factories.afterInitialize?.(this.resources, input);

      return this.resources;
    } catch (error) {
      await this.cleanupPartialResources({
        ...(renderer !== undefined ? { renderer } : {}),
        ...(viewport !== undefined ? { viewport } : {}),
        ...(overlayManager !== undefined ? { overlayManager } : {}),
        ...(exportSystem !== undefined ? { exportSystem } : {}),
      });

      throw this.toLifecycleError('Initialization failed.', 'initialize', error);
    }
  }

  public async update(
    input: TUpdateInput,
  ): Promise<LifecycleResources<TRenderer, TViewport, TOverlayManager, TExportSystem>> {
    if (!this.resources) {
      throw new LifecycleError('Lifecycle resources must be initialized before update.', {
        phase: 'update',
      });
    }

    try {
      await this.factories.update?.(this.resources, input);

      return this.resources;
    } catch (error) {
      throw this.toLifecycleError('Lifecycle update failed.', 'update', error);
    }
  }

  public async cleanup(): Promise<void> {
    if (!this.resources) {
      return;
    }

    const currentResources = this.resources;

    this.resources = undefined;

    try {
      await this.factories.beforeCleanup?.(currentResources);
      await this.cleanupPartialResources(currentResources);
    } catch (error) {
      throw this.toLifecycleError('Lifecycle cleanup failed.', 'cleanup', error);
    }
  }

  private async cleanupPartialResources(
    resources: Partial<LifecycleResources<TRenderer, TViewport, TOverlayManager, TExportSystem>>,
  ): Promise<void> {
    const cleanupTargets = [
      resources.exportSystem,
      resources.overlayManager,
      resources.viewport,
      resources.renderer,
    ];
    let firstError: unknown;

    for (const target of cleanupTargets) {
      if (target === undefined) {
        continue;
      }

      try {
        await this.disposeTarget(target as ManagedResource);
      } catch (error) {
        firstError ??= error;
      }
    }

    if (firstError !== undefined) {
      throw firstError;
    }
  }

  private async disposeTarget(target: ManagedResource): Promise<void> {
    if (!target) {
      return;
    }

    const candidate = target as {
      destroy?: () => void | Promise<void>;
      dispose?: () => void | Promise<void>;
      disconnect?: () => void | Promise<void>;
      unmount?: () => void | Promise<void>;
    };

    if (typeof candidate.destroy === 'function') {
      await candidate.destroy();

      return;
    }

    if (typeof candidate.dispose === 'function') {
      await candidate.dispose();

      return;
    }

    if (typeof candidate.disconnect === 'function') {
      await candidate.disconnect();

      return;
    }

    if (typeof candidate.unmount === 'function') {
      await candidate.unmount();
    }
  }

  private toLifecycleError(
    message: string,
    phase: 'initialize' | 'update' | 'cleanup',
    cause: unknown,
  ): LifecycleError {
    return new LifecycleError(message, {
      phase,
      cause: cause instanceof Error ? cause.message : cause,
    });
  }
}
