import {
  EventMapper,
  ExportSystem,
  LifecycleManager,
  type AdapterPackageMetadata,
  type FrameworkEventPayload,
  type LifecycleFactorySet,
  type LifecycleResources,
  type PNGExportConfig,
  type PrintConfig,
  type SharedAdapterSurface,
  type SVGExportConfig,
} from '@rail-schematic-viz/adapters-shared';
import {
  RailGraph,
  SVGRenderer as CoreSVGRenderer,
  type StylingConfiguration,
} from '@rail-schematic-viz/core';
import {
  EventManager,
  FitToView,
  ViewportController,
} from '@rail-schematic-viz/layout';
import {
  OverlayManager as PackageOverlayManager,
  SVGRenderer as OverlaySVGRenderer,
  type OverlayConfiguration,
  type RailOverlay,
  type SvgRenderNode,
} from '@rail-schematic-viz/overlays';

export interface RailSchematicVueViewportState {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

export interface RailSchematicVueOverlay {
  readonly id?: string;
  readonly visible?: boolean;
}

export interface RailSchematicVueRenderer {
  getSVGString(): string;
  render(snapshot: RailSchematicVueRenderSnapshot): void;
  on(event: string, handler: RailSchematicVueEventHandler): void;
  off(event: string, handler: RailSchematicVueEventHandler): void;
  emit(event: string, payload?: Readonly<Record<string, unknown>>): void;
  destroy(): void;
}

export interface RailSchematicVueViewport {
  on(event: 'viewport-change', handler: RailSchematicVueViewportHandler): void;
  off(event: 'viewport-change', handler: RailSchematicVueViewportHandler): void;
  getTransform(): RailSchematicVueViewportState;
  getVisibleBounds(): {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
  };
  panTo(x: number, y: number): Promise<RailSchematicVueViewportState>;
  zoomTo(scale: number): Promise<RailSchematicVueViewportState>;
  fitToView(): Promise<RailSchematicVueViewportState>;
  destroy(): void;
}

export interface RailSchematicVueOverlayManager {
  getAllOverlays(): ReadonlyArray<{
    readonly id: string;
    readonly visible: boolean;
  }>;
  addOverlay(overlay: RailSchematicVueOverlay): string;
  removeOverlay(id: string): boolean;
  toggleOverlay(id: string): boolean;
  sync(overlays: ReadonlyArray<RailSchematicVueOverlay>): void;
  destroy(): void;
}

type RailSchematicVueEventHandler = (
  payload: Readonly<Record<string, unknown>>,
) => void;

type RailSchematicVueViewportHandler = (
  payload: Readonly<Record<string, unknown>>,
) => void;

export interface VueLifecycleInput {
  readonly data?: RailGraph | null;
  readonly width?: number | string;
  readonly height?: number | string;
  readonly layoutMode?: string;
  readonly style?: Readonly<Record<string, unknown>>;
  readonly overlays?: ReadonlyArray<RailSchematicVueOverlay>;
  readonly viewport?: Partial<RailSchematicVueViewportState>;
}

export type VueLifecycleUpdate = VueLifecycleInput;

export type VueLifecycleFactories = LifecycleFactorySet<
  VueLifecycleInput,
  VueLifecycleUpdate,
  RailSchematicVueRenderer,
  RailSchematicVueViewport,
  RailSchematicVueOverlayManager,
  ExportSystem
>;

export interface RailSchematicVueProps extends VueLifecycleInput {
  readonly class?: string;
  readonly dataTestId?: string;
  readonly onClick?: (payload: FrameworkEventPayload) => void;
  readonly onHover?: (payload: FrameworkEventPayload) => void;
  readonly onHoverEnd?: (payload: FrameworkEventPayload) => void;
  readonly onSelectionChange?: (payload: FrameworkEventPayload) => void;
  readonly onViewportChange?: (payload: FrameworkEventPayload) => void;
  readonly onOverlayClick?: (payload: FrameworkEventPayload) => void;
  readonly onEvent?: (
    eventName: string,
    payload: FrameworkEventPayload,
  ) => void;
  readonly lifecycleFactories?: VueLifecycleFactories;
}

export interface RailSchematicVueInstance {
  readonly framework: 'vue';
  readonly element: {
    readonly type: 'div';
    readonly props: Readonly<Record<string, unknown>>;
  };
  ready(): Promise<void>;
  update(props: RailSchematicVueProps): Promise<void>;
  destroy(): Promise<void>;
  pan(x: number, y: number): Promise<void>;
  zoom(scale: number): Promise<void>;
  fitToView(): Promise<void>;
  addOverlay(overlay: RailSchematicVueOverlay): string;
  removeOverlay(id: string): boolean;
  toggleOverlay(id: string): boolean;
  exportSVG(config?: SVGExportConfig): Promise<string>;
  exportPNG(config?: PNGExportConfig): Promise<string>;
  print(config?: PrintConfig): Promise<void>;
  selectElements(ids: ReadonlyArray<string>): void;
  clearSelection(): void;
  getRenderer(): RailSchematicVueRenderer;
  getViewport(): RailSchematicVueViewport;
  getOverlayManager(): RailSchematicVueOverlayManager;
  getExportSystem(): ExportSystem;
}

export interface UseRailSchematicComposable {
  readonly viewport: {
    readonly position: {
      readonly x: number;
      readonly y: number;
    };
    readonly scale: number;
    pan(x: number, y: number): Promise<void>;
    zoom(scale: number): Promise<void>;
    fitToView(): Promise<void>;
  };
  readonly overlays: {
    add(overlay: RailSchematicVueOverlay): string;
    remove(id: string): boolean;
    toggle(id: string): boolean;
    list(): ReadonlyArray<{ readonly id: string; readonly visible: boolean }>;
  };
  readonly selection: {
    readonly selected: ReadonlyArray<string>;
    select(ids: ReadonlyArray<string>): void;
    clear(): void;
  };
  readonly export: {
    toSVG(config?: SVGExportConfig): Promise<string>;
    toPNG(config?: PNGExportConfig): Promise<string>;
    print(config?: PrintConfig): Promise<void>;
  };
  dispose(): void;
}

interface DefaultStore {
  width: number;
  height: number;
  svgMarkup: string;
  nextOverlayId: number;
  selection: string[];
  data: RailGraph | null;
  layoutMode: string | undefined;
  style: Readonly<Record<string, unknown>> | undefined;
  overlays: Array<{ id: string; visible: boolean }>;
  viewportTransform: RailSchematicVueViewportState;
}

interface RailSchematicVueRenderSnapshot extends VueLifecycleInput {}

type ReadyResources = LifecycleResources<
  RailSchematicVueRenderer,
  RailSchematicVueViewport,
  RailSchematicVueOverlayManager,
  ExportSystem
> & {
  readonly exportSystem: ExportSystem;
};

const DEFAULT_WIDTH = 640;
const DEFAULT_HEIGHT = 360;
const EMPTY_RAIL_GRAPH = new RailGraph({
  edges: [],
  lines: [],
  nodes: [],
});

function resolveDimension(
  value: number | string | undefined,
  fallback: number,
): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);

    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
}

function createEventEmitter() {
  const handlers = new Map<string, Set<RailSchematicVueEventHandler>>();

  return {
    on(event: string, handler: RailSchematicVueEventHandler) {
      const nextHandlers = handlers.get(event) ?? new Set<RailSchematicVueEventHandler>();

      nextHandlers.add(handler);
      handlers.set(event, nextHandlers);
    },
    off(event: string, handler: RailSchematicVueEventHandler) {
      handlers.get(event)?.delete(handler);
    },
    emit(event: string, payload: Readonly<Record<string, unknown>> = {}) {
      handlers.get(event)?.forEach((handler) => {
        handler(payload);
      });
    },
    destroy() {
      handlers.clear();
    },
  };
}

function createDefaultLifecycleFactories(
  storeRef: { current: DefaultStore | undefined },
): VueLifecycleFactories {
  const emitter = createEventEmitter();
  const managedEvents = new Set([
    'element-click',
    'element-dblclick',
    'element-contextmenu',
    'element-hover',
    'element-hover-end',
    'selection-change',
    'brush-start',
    'brush-move',
    'brush-end',
    'focus-change',
  ]);
  const interactionListeners = new Map<string, Set<(event: unknown) => void>>();
  const interactionHost = {
    clientHeight: DEFAULT_HEIGHT,
    clientWidth: DEFAULT_WIDTH,
    addEventListener(type: string, listener: (event: unknown) => void) {
      const listeners = interactionListeners.get(type) ?? new Set<(event: unknown) => void>();

      listeners.add(listener);
      interactionListeners.set(type, listeners);
    },
    removeEventListener(type: string, listener: (event: unknown) => void) {
      interactionListeners.get(type)?.delete(listener);
    },
    getBoundingClientRect() {
      return {
        left: 0,
        top: 0,
        width: interactionHost.clientWidth,
        height: interactionHost.clientHeight,
      };
    },
  };
  const eventManager = new EventManager(interactionHost);
  const coreRenderer = new CoreSVGRenderer();
  const overlayRenderer = new OverlaySVGRenderer();
  const viewportController = new ViewportController(interactionHost, {
    height: DEFAULT_HEIGHT,
    width: DEFAULT_WIDTH,
  });
  const fitToView = new FitToView(viewportController);
  const packageOverlayManager = new PackageOverlayManager({
    dimensions: {
      height: DEFAULT_HEIGHT,
      width: DEFAULT_WIDTH,
    },
    eventManager,
    viewportController,
  });
  const overlayRecords = new Map<
    string,
    {
      readonly id: string;
      readonly overlay: RailOverlay<unknown, OverlayConfiguration>;
      visible: boolean;
    }
  >();

  class AdapterOverlay implements RailOverlay<unknown, OverlayConfiguration> {
    public readonly type = 'adapter-overlay';
    private configuration: OverlayConfiguration;

    public constructor(
      visible: boolean,
    ) {
      this.configuration = {
        interactive: true,
        visible,
      };
    }

    public initialize(): void {}

    public render(): { readonly durationMs: number; readonly elementCount: number } {
      return {
        durationMs: 0,
        elementCount: 1,
      };
    }

    public update(): void {}

    public resize(): void {}

    public destroy(): void {}

    public configure(
      configuration: Partial<OverlayConfiguration>,
    ): OverlayConfiguration {
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

  function ensureStore(input: VueLifecycleInput): DefaultStore {
    if (!storeRef.current) {
      storeRef.current = {
        width: resolveDimension(input.width, DEFAULT_WIDTH),
        height: resolveDimension(input.height, DEFAULT_HEIGHT),
        svgMarkup: '',
        nextOverlayId: 1,
        selection: [],
        data: input.data ?? null,
        layoutMode: input.layoutMode,
        style: input.style,
        overlays: (input.overlays ?? []).map((overlay, index) => ({
          id: overlay.id ?? `overlay-${index + 1}`,
          visible: overlay.visible ?? true,
        })),
        viewportTransform: {
          x: input.viewport?.x ?? 0,
          y: input.viewport?.y ?? 0,
          scale: input.viewport?.scale ?? 1,
        },
      };
    }

    return storeRef.current;
  }

  function serializeAttributes(
    attributes: Readonly<Record<string, string>>,
  ): string {
    return Object.entries(attributes)
      .map(([name, value]) => `${name}="${value}"`)
      .join(' ');
  }

  function serializeSvgNode(node: SvgRenderNode): string {
    const attributes = serializeAttributes(node.attributes);

    if (node.tag === 'text') {
      const { text, ...rest } = node.attributes;
      const serializedAttributes = serializeAttributes(rest);

      return `<text ${serializedAttributes}>${text ?? ''}</text>`;
    }

    return `<${node.tag} ${attributes} />`;
  }

  function resolveGraph(data: RailGraph | null | undefined): RailGraph {
    if (data === undefined || data === null) {
      return EMPTY_RAIL_GRAPH;
    }

    if (!(data instanceof RailGraph)) {
      throw new TypeError('RailSchematicVue requires the data prop to be a RailGraph instance.');
    }

    return data;
  }

  function buildOverlayMarkup(store: DefaultStore): string {
    return store.overlays
      .filter((overlay) => overlay.visible)
      .map((overlay, index) => {
        let nodes: ReadonlyArray<SvgRenderNode> = [];

        overlayRenderer.render(
          {
            clear: () => {
              nodes = [];
            },
            setNodes: (nextNodes) => {
              nodes = [...nextNodes];
            },
          },
          [
            {
              geometry: {
                label: overlay.id,
                radius: 4,
                type: 'point',
                x: 14 + index * 20,
                y: Math.max(16, store.height - 18),
              },
              id: `${overlay.id}-marker`,
              style: {
                fill: '#444',
                fontSize: 10,
                opacity: 0.9,
                stroke: '#ffffff',
                strokeWidth: 1,
              },
              zIndex: index,
            },
          ],
        );

        return `<g data-overlay-id="${overlay.id}">${nodes.map((node) => serializeSvgNode(node)).join('')}</g>`;
      })
      .join('');
  }

  function buildSelectionAnchorMarkup(graph: RailGraph, store: DefaultStore): string {
    return Array.from(graph.nodes.values())
      .map((node, index) => {
        const coordinate =
          node.coordinate.type === 'screen'
            ? node.coordinate
            : {
                x: 16 + index * 12,
                y: 16,
              };

        return `<circle id="${node.id}" cx="${coordinate.x}" cy="${coordinate.y}" r="1" opacity="0" data-selected="${store.selection.includes(node.id)}" />`;
      })
      .join('');
  }

  function rebuildSVG(store: DefaultStore): void {
    interactionHost.clientWidth = Math.max(1, store.width);
    interactionHost.clientHeight = Math.max(1, store.height);

    const graph = resolveGraph(store.data);
    const baseSVG = coreRenderer.render(
      graph,
      store.style as Partial<StylingConfiguration> | undefined,
    );
    const metadata = `<metadata data-layout-mode="${store.layoutMode ?? 'default'}" data-node-ids="${Array.from(graph.nodes.keys()).join(',')}" data-selection="${store.selection.join(',')}"></metadata>`;
    const overlayMarkup = buildOverlayMarkup(store);
    const selectionMarkup = buildSelectionAnchorMarkup(graph, store);

    store.svgMarkup = baseSVG.replace(
      '</svg>',
      `${overlayMarkup}${selectionMarkup}${metadata}</svg>`,
    );
  }

  for (const eventName of managedEvents) {
    eventManager.on(eventName as never, (payload) => {
      emitter.emit(eventName, {
        ...(payload.element ? { element: payload.element } : {}),
        ...(payload.coordinates ? { coordinates: payload.coordinates } : {}),
        ...(payload.selection ? { selection: payload.selection } : {}),
        ...(payload.originalEvent !== undefined ? { originalEvent: payload.originalEvent } : {}),
      });
    });
  }

  for (const eventName of ['overlay-click', 'overlay-hover', 'overlay-hover-end'] as const) {
    packageOverlayManager.on(eventName, (payload) => {
      emitter.emit(eventName, {
        ...(payload.coordinates ? { coordinates: payload.coordinates } : {}),
        ...(payload.element ? { element: payload.element } : {}),
        detail: {
          overlayId: payload.overlayId,
        },
      });
    });
  }

  const renderer: RailSchematicVueRenderer = {
    getSVGString: () => ensureStore({}).svgMarkup,
    render: (snapshot) => {
      const store = ensureStore(snapshot);

      store.data = snapshot.data ?? null;
      store.layoutMode = snapshot.layoutMode;
      store.style = snapshot.style;
      store.width = resolveDimension(snapshot.width, store.width);
      store.height = resolveDimension(snapshot.height, store.height);
      rebuildSVG(store);
    },
    on: emitter.on,
    off: emitter.off,
    emit: (event, payload = {}) => {
      if (managedEvents.has(event)) {
        eventManager.emit(event as never, payload as never);

        return;
      }

      emitter.emit(event, payload);
    },
    destroy: () => {
      eventManager.destroy();
      emitter.destroy();
    },
  };

  const viewport: RailSchematicVueViewport = {
    on: (event, handler) => {
      viewportController.on(event, handler as never);
    },
    off: (event, handler) => {
      viewportController.off(event, handler as never);
    },
    getTransform: () => viewportController.getTransform(),
    getVisibleBounds: () => viewportController.getVisibleBounds(),
    panTo: async (x, y) => {
      const transform = await viewportController.panTo(x, y);
      const store = ensureStore({});

      store.viewportTransform = {
        scale: transform.scale,
        x: transform.x,
        y: transform.y,
      };

      return transform;
    },
    zoomTo: async (scale) => {
      const transform = await viewportController.zoomTo(scale);
      const store = ensureStore({});

      store.viewportTransform = {
        scale: transform.scale,
        x: transform.x,
        y: transform.y,
      };

      return transform;
    },
    fitToView: async () => {
      const store = ensureStore({});
      const graph = resolveGraph(store.data);
      const bounds = Array.from(graph.nodes.values()).reduce(
        (currentBounds, node, index) => {
          const coordinate =
            node.coordinate.type === 'screen'
              ? node.coordinate
              : {
                  x: 24 + index * 24,
                  y: 24,
                };

          return {
            maxX: Math.max(currentBounds.maxX, coordinate.x),
            maxY: Math.max(currentBounds.maxY, coordinate.y),
            minX: Math.min(currentBounds.minX, coordinate.x),
            minY: Math.min(currentBounds.minY, coordinate.y),
          };
        },
        {
          maxX: 1,
          maxY: 1,
          minX: 0,
          minY: 0,
        },
      );
      const transform = await fitToView.fitToView(bounds);

      store.viewportTransform = {
        scale: transform.scale,
        x: transform.x,
        y: transform.y,
      };

      return transform;
    },
    destroy: () => {
      viewportController.destroy();
    },
  };

  const overlayManager: RailSchematicVueOverlayManager = {
    getAllOverlays: () => [...ensureStore({}).overlays],
    addOverlay: (overlay) => {
      const store = ensureStore({});
      const overlayId = overlay.id ?? `overlay-${store.nextOverlayId++}`;

      store.overlays.push({
        id: overlayId,
        visible: overlay.visible ?? true,
      });
      if (!overlayRecords.has(overlayId)) {
        const adapterOverlay = new AdapterOverlay(overlay.visible ?? true);

        overlayRecords.set(overlayId, {
          id: overlayId,
          overlay: adapterOverlay,
          visible: overlay.visible ?? true,
        });
        void packageOverlayManager.addOverlay(adapterOverlay, {
          id: overlayId,
          visible: overlay.visible ?? true,
        }).catch(() => {
        });
      }
      rebuildSVG(store);

      return overlayId;
    },
    removeOverlay: (id) => {
      const store = ensureStore({});
      const nextOverlays = store.overlays.filter((overlay) => overlay.id !== id);

      if (nextOverlays.length === store.overlays.length) {
        return false;
      }

      store.overlays = nextOverlays;
      overlayRecords.delete(id);
      void packageOverlayManager.removeOverlay(id).catch(() => {
      });
      rebuildSVG(store);

      return true;
    },
    toggleOverlay: (id) => {
      const store = ensureStore({});
      const target = store.overlays.find((overlay) => overlay.id === id);

      if (!target) {
        return false;
      }

      target.visible = !target.visible;
      const record = overlayRecords.get(id);

      if (record) {
        record.visible = target.visible;
        try {
          if (target.visible) {
            packageOverlayManager.showOverlay(id);
          } else {
            packageOverlayManager.hideOverlay(id);
          }
        } catch {
        }
      }
      rebuildSVG(store);

      return target.visible;
    },
    sync: (overlays) => {
      const store = ensureStore({});
      const normalized = overlays.map((overlay, index) => ({
        id: overlay.id ?? `overlay-${index + 1}`,
        visible: overlay.visible ?? true,
      }));
      const nextIds = new Set(normalized.map((overlay) => overlay.id));

      store.overlays = normalized;

      for (const existingId of [...overlayRecords.keys()]) {
        if (nextIds.has(existingId)) {
          continue;
        }

        overlayRecords.delete(existingId);
        void packageOverlayManager.removeOverlay(existingId).catch(() => {
        });
      }

      for (const overlay of normalized) {
        if (!overlayRecords.has(overlay.id)) {
          const adapterOverlay = new AdapterOverlay(overlay.visible);

          overlayRecords.set(overlay.id, {
            id: overlay.id,
            overlay: adapterOverlay,
            visible: overlay.visible,
          });
          void packageOverlayManager.addOverlay(adapterOverlay, {
            id: overlay.id,
            visible: overlay.visible,
          }).catch(() => {
          });
          continue;
        }

        try {
          if (overlay.visible) {
            packageOverlayManager.showOverlay(overlay.id);
          } else {
            packageOverlayManager.hideOverlay(overlay.id);
          }
        } catch {
        }
      }
      rebuildSVG(store);
    },
    destroy: () => {
      const store = ensureStore({});

      store.overlays = [];
      for (const overlayId of [...overlayRecords.keys()]) {
        void packageOverlayManager.removeOverlay(overlayId).catch(() => {
        });
      }
      overlayRecords.clear();
      rebuildSVG(store);
    },
  };

  return {
    createRenderer: (input) => {
      const store = ensureStore(input);

      rebuildSVG(store);

      return renderer;
    },
    createViewport: () => viewport,
    createOverlayManager: (_resources, input) => {
      ensureStore(input);
      overlayManager.sync(input.overlays ?? []);

      return overlayManager;
    },
    createExportSystem: ({ renderer: nextRenderer, viewport: nextViewport, overlayManager: nextOverlayManager }) =>
      new ExportSystem(nextRenderer, nextViewport, nextOverlayManager),
    update: (resources, input) => {
      const store = ensureStore(input);

      store.width = resolveDimension(input.width, store.width);
      store.height = resolveDimension(input.height, store.height);
      store.data = input.data ?? null;
      store.layoutMode = input.layoutMode;
      store.style = input.style;
      if (input.viewport) {
        store.viewportTransform = {
          x: input.viewport.x ?? store.viewportTransform.x,
          y: input.viewport.y ?? store.viewportTransform.y,
          scale: input.viewport.scale ?? store.viewportTransform.scale,
        };
      }
      resources.overlayManager.sync(input.overlays ?? []);
      resources.renderer.render(input);
    },
  };
}

function bindMappedHandlers(
  resources: LifecycleResources<
    RailSchematicVueRenderer,
    RailSchematicVueViewport,
    RailSchematicVueOverlayManager,
    ExportSystem
  >,
  props: RailSchematicVueProps,
  eventMapper: EventMapper,
): () => void {
  const cleanups: Array<() => void> = [];
  const handlerMap: Array<
    readonly [string, ((payload: FrameworkEventPayload) => void) | undefined]
  > = [
    ['element-click', props.onClick],
    ['element-hover', props.onHover],
    ['element-hover-end', props.onHoverEnd],
    ['selection-change', props.onSelectionChange],
    ['overlay-click', props.onOverlayClick],
  ];

  for (const [eventName, specificHandler] of handlerMap) {
    if (!specificHandler && !props.onEvent) {
      continue;
    }

    const wrapped = (payload: Readonly<Record<string, unknown>>) => {
      const mapped = eventMapper.mapEvent(eventName, payload, {
        target: 'vue',
      });

      specificHandler?.(mapped.payload);
      props.onEvent?.(mapped.name, mapped.payload);
    };

    resources.renderer.on(eventName, wrapped);
    cleanups.push(() => {
      resources.renderer.off(eventName, wrapped);
    });
  }

  if (props.onViewportChange || props.onEvent) {
    const wrappedViewport = (payload: Readonly<Record<string, unknown>>) => {
      const mapped = eventMapper.mapEvent('viewport-change', payload, {
        target: 'vue',
      });

      props.onViewportChange?.(mapped.payload);
      props.onEvent?.(mapped.name, mapped.payload);
    };

    resources.viewport.on('viewport-change', wrappedViewport);
    cleanups.push(() => {
      resources.viewport.off('viewport-change', wrappedViewport);
    });
  }

  return () => {
    cleanups.forEach((cleanup) => {
      cleanup();
    });
  };
}

function createLifecycleInput(props: RailSchematicVueProps): VueLifecycleInput {
  return {
    ...(props.data !== undefined ? { data: props.data } : {}),
    ...(props.width !== undefined ? { width: props.width } : {}),
    ...(props.height !== undefined ? { height: props.height } : {}),
    ...(props.layoutMode !== undefined ? { layoutMode: props.layoutMode } : {}),
    ...(props.style !== undefined ? { style: props.style } : {}),
    ...(props.overlays !== undefined ? { overlays: props.overlays } : {}),
    ...(props.viewport !== undefined ? { viewport: props.viewport } : {}),
  };
}

function createElementDescriptor(props: RailSchematicVueProps) {
  return {
    type: 'div' as const,
    props: {
      class: props.class,
      'data-framework': 'vue',
      'data-testid': props.dataTestId,
      style: {
        height: props.height,
        width: props.width,
      },
    },
  };
}

export const VUE_ADAPTER_METADATA = {
  framework: 'vue',
  packageName: '@rail-schematic-viz/vue',
  version: '0.1.0',
} as const satisfies AdapterPackageMetadata;

export const VUE_ADAPTER_SURFACE = {
  framework: 'vue',
  capabilities: {
    svg: true,
    png: true,
    print: true,
  },
} as const satisfies SharedAdapterSurface;

export function createRailSchematicVue(
  initialProps: RailSchematicVueProps = {},
): RailSchematicVueInstance {
  const storeRef: { current: DefaultStore | undefined } = {
    current: undefined,
  };
  const eventMapper = new EventMapper();
  const lifecycle = new LifecycleManager(
    initialProps.lifecycleFactories ?? createDefaultLifecycleFactories(storeRef),
  );
  let currentProps = initialProps;
  let element = createElementDescriptor(currentProps);
  let eventCleanup: (() => void) | undefined;
  const readyPromise = lifecycle
    .initialize(createLifecycleInput(currentProps))
    .then((resources) => {
      eventCleanup = bindMappedHandlers(resources, currentProps, eventMapper);
    });

  const requireResources = (): ReadyResources => {
    const resources = lifecycle.getResources();
    const exportSystem = resources?.exportSystem;

    if (!resources || !exportSystem) {
      throw new Error('RailSchematicVue is not initialized.');
    }

    return {
      renderer: resources.renderer,
      viewport: resources.viewport,
      overlayManager: resources.overlayManager,
      exportSystem,
    };
  };

  return {
    framework: 'vue',
    get element() {
      return element;
    },
    ready: async () => {
      await readyPromise;
    },
    update: async (props) => {
      currentProps = props;
      element = createElementDescriptor(currentProps);
      await readyPromise;
      await lifecycle.update(createLifecycleInput(currentProps));
      eventCleanup?.();
      eventCleanup = bindMappedHandlers(requireResources(), currentProps, eventMapper);
    },
    destroy: async () => {
      await readyPromise.catch(() => {
      });
      eventCleanup?.();
      eventCleanup = undefined;
      await lifecycle.cleanup();
    },
    pan: async (x, y) => {
      await readyPromise;
      await requireResources().viewport.panTo(x, y);
    },
    zoom: async (scale) => {
      await readyPromise;
      await requireResources().viewport.zoomTo(scale);
    },
    fitToView: async () => {
      await readyPromise;
      await requireResources().viewport.fitToView();
    },
    addOverlay: (overlay) => requireResources().overlayManager.addOverlay(overlay),
    removeOverlay: (id) => requireResources().overlayManager.removeOverlay(id),
    toggleOverlay: (id) => requireResources().overlayManager.toggleOverlay(id),
    exportSVG: (config = {}) => requireResources().exportSystem.exportSVG(config),
    exportPNG: (config = {}) => requireResources().exportSystem.exportPNG(config),
    print: async (config = {}) => {
      const resources = requireResources();

      resources.exportSystem.configurePrint(config);
      await resources.exportSystem.print();
    },
    selectElements: (ids) => {
      const resources = requireResources();

      if (storeRef.current) {
        storeRef.current.selection = [...ids];
        resources.renderer.render(createLifecycleInput(currentProps));
      }

      resources.renderer.emit('selection-change', {
        selection: [...ids],
      });
    },
    clearSelection: () => {
      const resources = requireResources();

      if (storeRef.current) {
        storeRef.current.selection = [];
        resources.renderer.render(createLifecycleInput(currentProps));
      }

      resources.renderer.emit('selection-change', {
        selection: [],
      });
    },
    getRenderer: () => requireResources().renderer,
    getViewport: () => requireResources().viewport,
    getOverlayManager: () => requireResources().overlayManager,
    getExportSystem: () => requireResources().exportSystem,
  };
}

export const RailSchematicVue = createRailSchematicVue;

export function useRailSchematic(
  componentRef: { readonly current: RailSchematicVueInstance | null },
): UseRailSchematicComposable {
  let viewportSnapshot: RailSchematicVueViewportState = {
    x: 0,
    y: 0,
    scale: 1,
  };
  let selectionSnapshot: ReadonlyArray<string> = [];
  let cleanup = () => {
  };
  const component = componentRef.current;

  if (component) {
    const renderer = component.getRenderer() as RailSchematicVueRenderer & {
      on?: (event: string, handler: RailSchematicVueEventHandler) => void;
      off?: (event: string, handler: RailSchematicVueEventHandler) => void;
    };
    const viewport = component.getViewport();
    const onSelectionChange = (payload: Readonly<Record<string, unknown>>) => {
      if (Array.isArray(payload.selection)) {
        selectionSnapshot = payload.selection.filter(
          (value): value is string => typeof value === 'string',
        );
      }
    };
    const onViewportChange = (payload: Readonly<Record<string, unknown>>) => {
      const transform = payload.transform as Partial<RailSchematicVueViewportState> | undefined;

      if (!transform) {
        return;
      }

      viewportSnapshot = {
        x: transform.x ?? viewportSnapshot.x,
        y: transform.y ?? viewportSnapshot.y,
        scale: transform.scale ?? viewportSnapshot.scale,
      };
    };

    viewportSnapshot = viewport.getTransform();
    renderer.on?.('selection-change', onSelectionChange);
    viewport.on('viewport-change', onViewportChange);
    cleanup = () => {
      renderer.off?.('selection-change', onSelectionChange);
      viewport.off('viewport-change', onViewportChange);
    };
  }

  return {
    viewport: {
      get position() {
        return {
          x: viewportSnapshot.x,
          y: viewportSnapshot.y,
        };
      },
      get scale() {
        return viewportSnapshot.scale;
      },
      pan: async (x, y) => {
        await componentRef.current?.pan(x, y);
      },
      zoom: async (scale) => {
        await componentRef.current?.zoom(scale);
      },
      fitToView: async () => {
        await componentRef.current?.fitToView();
      },
    },
    overlays: {
      add: (overlay) => componentRef.current?.addOverlay(overlay) ?? '',
      remove: (id) => componentRef.current?.removeOverlay(id) ?? false,
      toggle: (id) => componentRef.current?.toggleOverlay(id) ?? false,
      list: () => componentRef.current?.getOverlayManager().getAllOverlays() ?? [],
    },
    selection: {
      get selected() {
        return selectionSnapshot;
      },
      select: (ids) => {
        selectionSnapshot = [...ids];
        componentRef.current?.selectElements(ids);
      },
      clear: () => {
        selectionSnapshot = [];
        componentRef.current?.clearSelection();
      },
    },
    export: {
      toSVG: (config = {}) => componentRef.current?.exportSVG(config) ?? Promise.resolve(''),
      toPNG: (config = {}) => componentRef.current?.exportPNG(config) ?? Promise.resolve(''),
      print: async (config = {}) => {
        await componentRef.current?.print(config);
      },
    },
    dispose: () => {
      cleanup();
      cleanup = () => {
      };
    },
  };
}
