import {
  EventMapper,
  ExportSystem,
  LifecycleManager,
  type AdapterPackageMetadata,
  type LifecycleFactorySet,
  type LifecycleResources,
  type PNGExportConfig,
  type PrintConfig,
  type SharedAdapterSurface,
  type SVGExportConfig,
} from '@rail-schematic-viz/adapters-shared';
import {
  JSONParser,
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

export interface RailSchematicViewportState {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

export interface RailSchematicOverlay {
  readonly id?: string;
  readonly visible?: boolean;
}

export interface RailSchematicRenderer {
  getSVGString(): string;
  render(snapshot: RailSchematicRenderInput): void;
  on(event: string, handler: RailSchematicEventHandler): void;
  off(event: string, handler: RailSchematicEventHandler): void;
  emit(event: string, payload?: Readonly<Record<string, unknown>>): void;
  destroy(): void;
}

export interface RailSchematicViewport {
  on(event: 'viewport-change', handler: RailSchematicViewportHandler): void;
  off(event: 'viewport-change', handler: RailSchematicViewportHandler): void;
  getTransform(): RailSchematicViewportState;
  getVisibleBounds(): {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
  };
  panTo(x: number, y: number): Promise<RailSchematicViewportState>;
  zoomTo(scale: number): Promise<RailSchematicViewportState>;
  fitToView(): Promise<RailSchematicViewportState>;
  destroy(): void;
}

export interface RailSchematicOverlayManager {
  getAllOverlays(): ReadonlyArray<{
    readonly id: string;
    readonly visible: boolean;
  }>;
  addOverlay(overlay: RailSchematicOverlay): string;
  removeOverlay(id: string): boolean;
  toggleOverlay(id: string): boolean;
  sync(overlays: ReadonlyArray<RailSchematicOverlay>): void;
  destroy(): void;
}

type RailSchematicEventHandler = (
  payload: Readonly<Record<string, unknown>>,
) => void;

type RailSchematicViewportHandler = (
  payload: Readonly<Record<string, unknown>>,
) => void;

export interface RailSchematicElementAttributes {
  readonly layoutMode?: string;
  readonly width?: number | string;
  readonly height?: number | string;
}

export interface RailSchematicRenderInput extends RailSchematicElementAttributes {
  readonly data?: RailGraph | null;
  readonly overlays?: ReadonlyArray<RailSchematicOverlay>;
  readonly style?: Readonly<Record<string, unknown>>;
  readonly viewport?: Partial<RailSchematicViewportState>;
}

export type WebComponentLifecycleFactories = LifecycleFactorySet<
  RailSchematicRenderInput,
  RailSchematicRenderInput,
  RailSchematicRenderer,
  RailSchematicViewport,
  RailSchematicOverlayManager,
  ExportSystem
>;

export interface RailSchematicElementHandle {
  readonly framework: 'web-component';
  readonly tagName: typeof RAIL_SCHEMATIC_ELEMENT_TAG;
  readonly element: RailSchematicElement;
}

export interface RailSchematicElementRegistry {
  define(name: string, constructor: CustomElementConstructor): void;
  get?(name: string): unknown;
}

interface RailSchematicRenderDraft {
  data?: RailGraph | null | undefined;
  height?: number | string | undefined;
  layoutMode?: string | undefined;
  overlays?: ReadonlyArray<RailSchematicOverlay> | undefined;
  style?: Readonly<Record<string, unknown>> | undefined;
  viewport?: Partial<RailSchematicViewportState> | undefined;
  width?: number | string | undefined;
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
  viewportTransform: RailSchematicViewportState;
}

class RailHTMLElementFallback {
  private readonly attributeMap = new Map<string, string>();
  private readonly listenerMap = new Map<string, Set<(event: Event) => void>>();

  public addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
  ): void {
    const listeners = this.listenerMap.get(type) ?? new Set<(event: Event) => void>();
    const normalizedListener =
      typeof listener === 'function'
        ? listener
        : (event: Event) => {
            listener.handleEvent(event);
          };

    listeners.add(normalizedListener);
    this.listenerMap.set(type, listeners);
  }

  public removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
  ): void {
    const normalizedListener =
      typeof listener === 'function'
        ? listener
        : (event: Event) => {
            listener.handleEvent(event);
          };

    this.listenerMap.get(type)?.delete(normalizedListener);
  }

  public dispatchEvent(event: Event): boolean {
    const eventType = (
      event as Event & {
        readonly type?: string;
      }
    ).type;

    if (!eventType) {
      return true;
    }

    this.listenerMap.get(eventType)?.forEach((listener) => {
      listener(event);
    });

    return true;
  }

  public setAttribute(name: string, value: string): void {
    this.attributeMap.set(name, value);
  }

  public getAttribute(name: string): string | null {
    return this.attributeMap.get(name) ?? null;
  }

  public removeAttribute(name: string): void {
    this.attributeMap.delete(name);
  }
}

const HTMLElementBase = (globalThis.HTMLElement ??
  RailHTMLElementFallback) as {
  new (): RailHTMLElementFallback & HTMLElement;
};

const DEFAULT_WIDTH = 640;
const DEFAULT_HEIGHT = 360;
const EMPTY_RAIL_GRAPH = new RailGraph({
  edges: [],
  lines: [],
  nodes: [],
});

type ReadyResources = LifecycleResources<
  RailSchematicRenderer,
  RailSchematicViewport,
  RailSchematicOverlayManager,
  ExportSystem
> & {
  readonly exportSystem: ExportSystem;
};

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
  const handlers = new Map<string, Set<RailSchematicEventHandler>>();

  return {
    on(event: string, handler: RailSchematicEventHandler) {
      const nextHandlers = handlers.get(event) ?? new Set<RailSchematicEventHandler>();

      nextHandlers.add(handler);
      handlers.set(event, nextHandlers);
    },
    off(event: string, handler: RailSchematicEventHandler) {
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
): WebComponentLifecycleFactories {
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

  function ensureStore(input: RailSchematicRenderInput): DefaultStore {
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
      throw new TypeError('RailSchematicElement requires the data property to be a RailGraph instance.');
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

  const renderer: RailSchematicRenderer = {
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

  const viewport: RailSchematicViewport = {
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

  const overlayManager: RailSchematicOverlayManager = {
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
    createExportSystem: ({ renderer, viewport, overlayManager }) =>
      new ExportSystem(renderer, viewport, overlayManager),
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

function createAdapterEvent(
  eventName: string,
  detail: unknown,
): Event {
  if (typeof CustomEvent === 'function') {
    return new CustomEvent(eventName, {
      bubbles: true,
      composed: true,
      detail,
    });
  }

  return {
    type: eventName,
    detail,
  } as unknown as Event;
}

function readAttribute(
  element: HTMLElement,
  name: string,
): string | undefined {
  const value = element.getAttribute(name);

  return value === null ? undefined : value;
}

const jsonParser = new JSONParser();

function parseDataAttribute(
  value: string | null | undefined,
): RailGraph | null {
  if (value === undefined || value === null || value.trim().length === 0) {
    return null;
  }

  const parsed = jsonParser.parse(value);

  if (!parsed.ok) {
    throw new Error(`Invalid rail-schematic data attribute: ${parsed.error.message}`);
  }

  return parsed.value;
}

function normalizeRenderInput(
  draft: RailSchematicRenderDraft,
): RailSchematicRenderInput {
  return {
    ...(draft.data !== undefined ? { data: draft.data } : {}),
    ...(draft.height !== undefined ? { height: draft.height } : {}),
    ...(draft.layoutMode !== undefined ? { layoutMode: draft.layoutMode } : {}),
    ...(draft.overlays !== undefined ? { overlays: draft.overlays } : {}),
    ...(draft.style !== undefined ? { style: draft.style } : {}),
    ...(draft.viewport !== undefined ? { viewport: draft.viewport } : {}),
    ...(draft.width !== undefined ? { width: draft.width } : {}),
  };
}

export const RAIL_SCHEMATIC_ELEMENT_TAG = 'rail-schematic';

export const WEB_COMPONENT_ADAPTER_METADATA = {
  framework: 'web-component',
  packageName: '@rail-schematic-viz/web-component',
  version: '0.1.0',
} as const satisfies AdapterPackageMetadata;

export const WEB_COMPONENT_ADAPTER_SURFACE = {
  framework: 'web-component',
  capabilities: {
    svg: true,
    png: true,
    print: true,
  },
} as const satisfies SharedAdapterSurface;

export class RailSchematicElement extends HTMLElementBase {
  public static observedAttributes = ['data', 'layout-mode'];

  private readonly eventMapper = new EventMapper();
  private readonly storeRef: { current: DefaultStore | undefined };
  private readonly lifecycle: LifecycleManager<
    RailSchematicRenderInput,
    RailSchematicRenderInput,
    RailSchematicRenderer,
    RailSchematicViewport,
    RailSchematicOverlayManager,
    ExportSystem
  >;
  private currentConfig: RailSchematicRenderInput;
  private eventCleanup: (() => void) | undefined;
  private readyPromise: Promise<void> | undefined;

  public constructor(
    lifecycleFactories?: WebComponentLifecycleFactories,
  ) {
    super();
    this.storeRef = {
      current: undefined,
    };
    this.lifecycle = new LifecycleManager(
      lifecycleFactories ?? createDefaultLifecycleFactories(this.storeRef),
    );
    this.currentConfig = normalizeRenderInput({
      data: parseDataAttribute(readAttribute(this, 'data')),
      layoutMode: readAttribute(this, 'layout-mode'),
    });
  }

  public attributeChangedCallback(
    name: string,
    _oldValue: string | null,
    newValue: string | null,
  ): void {
    switch (name) {
      case 'data':
        this.currentConfig = normalizeRenderInput({
          ...this.currentConfig,
          data: parseDataAttribute(newValue),
        });
        break;
      case 'layout-mode':
        this.currentConfig = normalizeRenderInput({
          ...this.currentConfig,
          layoutMode: newValue ?? undefined,
        });
        break;
      default:
        break;
    }

    if (this.readyPromise) {
      void this.sync();
    }
  }

  public connectedCallback(): void {
    if (!this.readyPromise) {
      this.readyPromise = this.lifecycle
        .initialize(this.currentConfig)
        .then((resources) => {
          this.eventCleanup = this.bindMappedHandlers(resources);
        });
    }
  }

  public disconnectedCallback(): void {
    void this.destroy();
  }

  public async ready(): Promise<void> {
    if (!this.readyPromise) {
      this.connectedCallback();
    }

    await this.readyPromise;
  }

  public async updateConfig(config: RailSchematicRenderInput): Promise<void> {
    this.currentConfig = normalizeRenderInput({
      ...this.currentConfig,
      ...config,
    });
    await this.sync();
  }

  public get data(): RailGraph | null {
    return this.currentConfig.data ?? null;
  }

  public set data(value: RailGraph | null) {
    this.currentConfig = normalizeRenderInput({
      ...this.currentConfig,
      data: value,
    });

    if (this.readyPromise) {
      void this.sync();
    }
  }

  public async setData(data: RailGraph | null): Promise<void> {
    this.currentConfig = normalizeRenderInput({
      ...this.currentConfig,
      data,
    });
    await this.sync();
  }

  public async setOverlays(
    overlays: ReadonlyArray<RailSchematicOverlay>,
  ): Promise<void> {
    this.currentConfig = normalizeRenderInput({
      ...this.currentConfig,
      overlays,
    });
    await this.sync();
  }

  public async setViewport(
    viewport: Partial<RailSchematicViewportState>,
  ): Promise<void> {
    this.currentConfig = normalizeRenderInput({
      ...this.currentConfig,
      viewport,
    });
    await this.sync();
  }

  public async destroy(): Promise<void> {
    await this.readyPromise?.catch(() => {
    });
    this.eventCleanup?.();
    this.eventCleanup = undefined;
    await this.lifecycle.cleanup();
    this.readyPromise = undefined;
  }

  public async pan(x: number, y: number): Promise<void> {
    await this.ready();
    await this.requireResources().viewport.panTo(x, y);
  }

  public async zoom(scale: number): Promise<void> {
    await this.ready();
    await this.requireResources().viewport.zoomTo(scale);
  }

  public async fitToView(): Promise<void> {
    await this.ready();
    await this.requireResources().viewport.fitToView();
  }

  public addOverlay(overlay: RailSchematicOverlay): string {
    return this.requireResources().overlayManager.addOverlay(overlay);
  }

  public removeOverlay(id: string): boolean {
    return this.requireResources().overlayManager.removeOverlay(id);
  }

  public toggleOverlay(id: string): boolean {
    return this.requireResources().overlayManager.toggleOverlay(id);
  }

  public exportSVG(config: SVGExportConfig = {}): Promise<string> {
    return this.requireResources().exportSystem.exportSVG(config);
  }

  public exportPNG(config: PNGExportConfig = {}): Promise<string> {
    return this.requireResources().exportSystem.exportPNG(config);
  }

  public async print(config: PrintConfig = {}): Promise<void> {
    const resources = this.requireResources();

    resources.exportSystem.configurePrint(config);
    await resources.exportSystem.print();
  }

  public selectElements(ids: ReadonlyArray<string>): void {
    const resources = this.requireResources();

    if (this.storeRef.current) {
      this.storeRef.current.selection = [...ids];
      resources.renderer.render(this.currentConfig);
    }

    resources.renderer.emit('selection-change', {
      selection: [...ids],
    });
  }

  public clearSelection(): void {
    const resources = this.requireResources();

    if (this.storeRef.current) {
      this.storeRef.current.selection = [];
      resources.renderer.render(this.currentConfig);
    }

    resources.renderer.emit('selection-change', {
      selection: [],
    });
  }

  public getRenderer(): RailSchematicRenderer {
    return this.requireResources().renderer;
  }

  public getViewport(): RailSchematicViewport {
    return this.requireResources().viewport;
  }

  public getOverlayManager(): RailSchematicOverlayManager {
    return this.requireResources().overlayManager;
  }

  public getExportSystem(): ExportSystem {
    return this.requireResources().exportSystem;
  }

  public toHandle(): RailSchematicElementHandle {
    return {
      framework: 'web-component',
      tagName: RAIL_SCHEMATIC_ELEMENT_TAG,
      element: this,
    };
  }

  private async sync(): Promise<void> {
    await this.ready();
    await this.lifecycle.update(this.currentConfig);
    this.eventCleanup?.();
    this.eventCleanup = this.bindMappedHandlers(this.requireResources());
  }

  private requireResources(): ReadyResources {
    const resources = this.lifecycle.getResources();
    const exportSystem = resources?.exportSystem;

    if (!resources || !exportSystem) {
      throw new Error('RailSchematicElement is not initialized.');
    }

    return {
      renderer: resources.renderer,
      viewport: resources.viewport,
      overlayManager: resources.overlayManager,
      exportSystem,
    };
  }

  private bindMappedHandlers(
    resources: LifecycleResources<
      RailSchematicRenderer,
      RailSchematicViewport,
      RailSchematicOverlayManager,
      ExportSystem
    >,
  ): () => void {
    const cleanups: Array<() => void> = [];
    const eventNames = [
      'element-click',
      'element-hover',
      'element-hover-end',
      'selection-change',
      'overlay-click',
    ];

    for (const eventName of eventNames) {
      const wrapped = (payload: Readonly<Record<string, unknown>>) => {
        const mapped = this.eventMapper.mapEvent(eventName, payload, {
          target: 'web-component',
        });

        this.dispatchEvent(createAdapterEvent(mapped.name, mapped.payload));
      };

      resources.renderer.on(eventName, wrapped);
      cleanups.push(() => {
        resources.renderer.off(eventName, wrapped);
      });
    }

    const wrappedViewport = (payload: Readonly<Record<string, unknown>>) => {
      const mapped = this.eventMapper.mapEvent('viewport-change', payload, {
        target: 'web-component',
      });

      this.dispatchEvent(createAdapterEvent(mapped.name, mapped.payload));
    };

    resources.viewport.on('viewport-change', wrappedViewport);
    cleanups.push(() => {
      resources.viewport.off('viewport-change', wrappedViewport);
    });

    return () => {
      cleanups.forEach((cleanup) => {
        cleanup();
      });
    };
  }
}

export function registerRailSchematicElement(
  registry: RailSchematicElementRegistry | undefined = globalThis.customElements,
): typeof RailSchematicElement {
  if (!registry) {
    throw new Error('Custom element registry is not available.');
  }

  const existing = typeof registry.get === 'function'
    ? registry.get(RAIL_SCHEMATIC_ELEMENT_TAG)
    : undefined;

  if (!existing) {
    registry.define(
      RAIL_SCHEMATIC_ELEMENT_TAG,
      RailSchematicElement as unknown as CustomElementConstructor,
    );
  }

  return RailSchematicElement;
}
