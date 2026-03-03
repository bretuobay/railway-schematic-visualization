import { CoordinateBridge, RailGraph } from '@rail-schematic-viz/core';

export type PluginOptions = Readonly<Record<string, unknown>>;

export interface PluginContext<
  TRenderer = unknown,
  TCoordinateBridge = CoordinateBridge | undefined,
> {
  readonly graph: RailGraph;
  readonly renderer: TRenderer;
  readonly coordinateBridge: TCoordinateBridge;
  readonly options: PluginOptions;
}

export interface RenderContext<
  TRenderer = unknown,
  TViewport = unknown,
  TSvgRoot = unknown,
  TCoordinateBridge = CoordinateBridge | undefined,
> extends PluginContext<TRenderer, TCoordinateBridge> {
  readonly viewport: TViewport;
  readonly svgRoot: TSvgRoot;
}

export interface ViewportChangeContext<
  TRenderer = unknown,
  TViewport = unknown,
  TCoordinateBridge = CoordinateBridge | undefined,
> extends PluginContext<TRenderer, TCoordinateBridge> {
  readonly viewport: TViewport;
  readonly payload?: Readonly<Record<string, unknown>>;
}

export interface DataUpdateContext<
  TRenderer = unknown,
  TCoordinateBridge = CoordinateBridge | undefined,
> extends PluginContext<TRenderer, TCoordinateBridge> {
  readonly previousGraph: RailGraph;
}

export interface Plugin<
  TRenderer = unknown,
  TViewport = unknown,
  TSvgRoot = unknown,
  TCoordinateBridge = CoordinateBridge | undefined,
> {
  initialize?(
    context: PluginContext<TRenderer, TCoordinateBridge>,
  ): void | Promise<void>;
  beforeRender?(
    context: RenderContext<TRenderer, TViewport, TSvgRoot, TCoordinateBridge>,
  ): void | Promise<void>;
  afterRender?(
    context: RenderContext<TRenderer, TViewport, TSvgRoot, TCoordinateBridge>,
  ): void | Promise<void>;
  onViewportChange?(
    context: ViewportChangeContext<TRenderer, TViewport, TCoordinateBridge>,
  ): void | Promise<void>;
  onDataUpdate?(
    context: DataUpdateContext<TRenderer, TCoordinateBridge>,
  ): void | Promise<void>;
  destroy?(
    context: PluginContext<TRenderer, TCoordinateBridge>,
  ): void | Promise<void>;
}

export interface PluginInfo {
  readonly name: string;
  readonly enabled: boolean;
  readonly options: PluginOptions;
}

export type PluginManagerEvent =
  | 'plugin-registered'
  | 'plugin-enabled'
  | 'plugin-disabled'
  | 'plugin-unregistered';

export interface PluginManagerEventPayload extends PluginInfo {
  readonly event: PluginManagerEvent;
}

export interface PluginManagerLogger {
  error(message: string, details?: Readonly<Record<string, unknown>>): void;
}

export interface PluginManagerConfig<
  TRenderer = unknown,
  TCoordinateBridge = CoordinateBridge | undefined,
> {
  readonly graph: RailGraph;
  readonly renderer: TRenderer;
  readonly coordinateBridge?: TCoordinateBridge;
  readonly logger?: PluginManagerLogger;
}

export interface PluginsPackageMetadata {
  readonly packageName: '@rail-schematic-viz/plugins';
  readonly supportsLifecycleHooks: true;
}

interface PluginRecord<
  TRenderer,
  TViewport,
  TSvgRoot,
  TCoordinateBridge,
> {
  readonly name: string;
  readonly plugin: Plugin<TRenderer, TViewport, TSvgRoot, TCoordinateBridge>;
  readonly options: PluginOptions;
  enabled: boolean;
  initialized: boolean;
}

type PluginManagerListener = (payload: PluginManagerEventPayload) => void;

const KNOWN_HOOK_NAMES = [
  'initialize',
  'beforeRender',
  'afterRender',
  'onViewportChange',
  'onDataUpdate',
  'destroy',
] as const;

export const PACKAGE_METADATA = {
  packageName: '@rail-schematic-viz/plugins',
  supportsLifecycleHooks: true,
} as const satisfies PluginsPackageMetadata;

export function getPackageMetadata(): PluginsPackageMetadata {
  return PACKAGE_METADATA;
}

export class PluginManager<
  TRenderer = unknown,
  TViewport = unknown,
  TSvgRoot = unknown,
  TCoordinateBridge = CoordinateBridge | undefined,
> {
  private coordinateBridge: TCoordinateBridge;
  private graph: RailGraph;
  private readonly listeners = new Map<
    PluginManagerEvent,
    Set<PluginManagerListener>
  >();
  private readonly logger: PluginManagerLogger;
  private readonly plugins = new Map<
    string,
    PluginRecord<TRenderer, TViewport, TSvgRoot, TCoordinateBridge>
  >();
  private renderer: TRenderer;

  public constructor(
    config: PluginManagerConfig<TRenderer, TCoordinateBridge>,
  ) {
    this.graph = config.graph;
    this.renderer = config.renderer;
    this.coordinateBridge = config.coordinateBridge as TCoordinateBridge;
    this.logger = config.logger ?? {
      error: (message, details) => {
        console.error(message, details);
      },
    };
  }

  public on(
    event: PluginManagerEvent,
    listener: PluginManagerListener,
  ): () => void {
    const listeners = this.listeners.get(event) ?? new Set<PluginManagerListener>();

    listeners.add(listener);
    this.listeners.set(event, listeners);

    return () => {
      listeners.delete(listener);
    };
  }

  public off(
    event: PluginManagerEvent,
    listener: PluginManagerListener,
  ): void {
    this.listeners.get(event)?.delete(listener);
  }

  public async registerPlugin(
    name: string,
    plugin: Plugin<TRenderer, TViewport, TSvgRoot, TCoordinateBridge>,
    options: PluginOptions = {},
  ): Promise<PluginInfo> {
    if (this.plugins.has(name)) {
      throw new Error(`Plugin "${name}" is already registered.`);
    }

    validatePlugin(plugin);

    const record: PluginRecord<TRenderer, TViewport, TSvgRoot, TCoordinateBridge> = {
      enabled: true,
      initialized: false,
      name,
      options: { ...options },
      plugin,
    };

    this.plugins.set(name, record);
    await this.initializeRecord(record);
    this.emit('plugin-registered', record);

    return this.toPluginInfo(record);
  }

  public async enablePlugin(name: string): Promise<PluginInfo> {
    const record = this.requireRecord(name);

    if (record.enabled) {
      return this.toPluginInfo(record);
    }

    record.enabled = true;
    record.initialized = false;
    await this.initializeRecord(record);
    this.emit('plugin-enabled', record);

    return this.toPluginInfo(record);
  }

  public disablePlugin(name: string): PluginInfo {
    const record = this.requireRecord(name);

    if (!record.enabled) {
      return this.toPluginInfo(record);
    }

    record.enabled = false;
    record.initialized = false;
    this.emit('plugin-disabled', record);

    return this.toPluginInfo(record);
  }

  public async unregisterPlugin(name: string): Promise<boolean> {
    const record = this.plugins.get(name);

    if (!record) {
      return false;
    }

    await this.invokeHook(record, 'destroy', this.baseContext(record), {
      details: {
        name,
      },
      phase: 'destroy',
    });
    this.plugins.delete(name);
    this.emit('plugin-unregistered', record);

    return true;
  }

  public listPlugins(): ReadonlyArray<PluginInfo> {
    return [...this.plugins.values()].map((record) => this.toPluginInfo(record));
  }

  public isPluginEnabled(name: string): boolean {
    return this.plugins.get(name)?.enabled ?? false;
  }

  public updateRenderer(renderer: TRenderer): void {
    this.renderer = renderer;
  }

  public updateCoordinateBridge(
    coordinateBridge: TCoordinateBridge,
  ): void {
    this.coordinateBridge = coordinateBridge;
  }

  public async notifyDataUpdate(graph: RailGraph): Promise<void> {
    const previousGraph = this.graph;

    this.graph = graph;

    for (const record of this.plugins.values()) {
      await this.invokeHook(
        record,
        'onDataUpdate',
        {
          ...this.baseContext(record),
          previousGraph,
        },
        {
          details: {
            name: record.name,
          },
          phase: 'onDataUpdate',
        },
      );
    }
  }

  public async notifyViewportChange(
    viewport: TViewport,
    payload?: Readonly<Record<string, unknown>>,
  ): Promise<void> {
    for (const record of this.plugins.values()) {
      await this.invokeHook(
        record,
        'onViewportChange',
        {
          ...this.baseContext(record),
          ...(payload !== undefined ? { payload } : {}),
          viewport,
        },
        {
          details: {
            name: record.name,
          },
          phase: 'onViewportChange',
        },
      );
    }
  }

  public async beforeRender(
    viewport: TViewport,
    svgRoot: TSvgRoot,
  ): Promise<void> {
    for (const record of this.plugins.values()) {
      await this.invokeHook(
        record,
        'beforeRender',
        {
          ...this.baseContext(record),
          svgRoot,
          viewport,
        },
        {
          details: {
            name: record.name,
          },
          phase: 'beforeRender',
        },
      );
    }
  }

  public async afterRender(
    viewport: TViewport,
    svgRoot: TSvgRoot,
  ): Promise<void> {
    for (const record of this.plugins.values()) {
      await this.invokeHook(
        record,
        'afterRender',
        {
          ...this.baseContext(record),
          svgRoot,
          viewport,
        },
        {
          details: {
            name: record.name,
          },
          phase: 'afterRender',
        },
      );
    }
  }

  private async initializeRecord(
    record: PluginRecord<TRenderer, TViewport, TSvgRoot, TCoordinateBridge>,
  ): Promise<void> {
    if (!record.enabled || record.initialized) {
      return;
    }

    await this.invokeHook(
      record,
      'initialize',
      this.baseContext(record),
      {
        details: {
          name: record.name,
        },
        phase: 'initialize',
      },
    );
    record.initialized = true;
  }

  private baseContext(
    record: PluginRecord<TRenderer, TViewport, TSvgRoot, TCoordinateBridge>,
  ): PluginContext<TRenderer, TCoordinateBridge> {
    return {
      coordinateBridge: this.coordinateBridge,
      graph: this.graph,
      options: record.options,
      renderer: this.renderer,
    };
  }

  private async invokeHook<
    THookName extends keyof Plugin<TRenderer, TViewport, TSvgRoot, TCoordinateBridge>,
    THookContext,
  >(
    record: PluginRecord<TRenderer, TViewport, TSvgRoot, TCoordinateBridge>,
    hookName: THookName,
    context: THookContext,
    errorContext: {
      readonly phase: string;
      readonly details: Readonly<Record<string, unknown>>;
    },
  ): Promise<void> {
    if (!record.enabled) {
      return;
    }

    const hook = record.plugin[hookName];

    if (typeof hook !== 'function') {
      return;
    }

    try {
      await (hook as (input: THookContext) => void | Promise<void>)(context);
    } catch (error) {
      this.logger.error(
        `Plugin "${record.name}" failed during ${errorContext.phase}.`,
        {
          ...errorContext.details,
          cause: error instanceof Error ? error.message : error,
        },
      );
    }
  }

  private emit(
    event: PluginManagerEvent,
    record: PluginRecord<TRenderer, TViewport, TSvgRoot, TCoordinateBridge>,
  ): void {
    const payload: PluginManagerEventPayload = {
      ...this.toPluginInfo(record),
      event,
    };

    this.listeners.get(event)?.forEach((listener) => {
      listener(payload);
    });
  }

  private requireRecord(
    name: string,
  ): PluginRecord<TRenderer, TViewport, TSvgRoot, TCoordinateBridge> {
    const record = this.plugins.get(name);

    if (!record) {
      throw new Error(`Plugin "${name}" is not registered.`);
    }

    return record;
  }

  private toPluginInfo(
    record: PluginRecord<TRenderer, TViewport, TSvgRoot, TCoordinateBridge>,
  ): PluginInfo {
    return {
      enabled: record.enabled,
      name: record.name,
      options: { ...record.options },
    };
  }
}

function validatePlugin<
  TRenderer,
  TViewport,
  TSvgRoot,
  TCoordinateBridge,
>(
  plugin: Plugin<TRenderer, TViewport, TSvgRoot, TCoordinateBridge>,
): void {
  if (!plugin || typeof plugin !== 'object') {
    throw new Error('Plugin must be an object implementing lifecycle hooks.');
  }

  for (const hookName of KNOWN_HOOK_NAMES) {
    const candidate = plugin[hookName];

    if (candidate !== undefined && typeof candidate !== 'function') {
      throw new Error(`Plugin hook "${hookName}" must be a function when provided.`);
    }
  }

  const hasKnownHook = KNOWN_HOOK_NAMES.some((hookName) => {
    const candidate = plugin[hookName];

    return typeof candidate === 'function';
  });

  if (!hasKnownHook) {
    throw new Error('Plugin must implement at least one lifecycle hook.');
  }
}
