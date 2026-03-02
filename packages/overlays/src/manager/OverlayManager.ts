import type { EventManagerPayload } from '@rail-schematic-viz/layout';

import { OverlayAccessibilityManager } from '../accessibility';
import { OverlayError } from '../errors';
import { Debounce } from '../performance';
import { OverlayRegistry } from '../registry';
import type {
  OverlayConfiguration,
  OverlayContext,
  OverlayLegend,
  OverlayRenderResult,
  RailOverlay,
  RenderContext,
} from '../types';

export type OverlayInteractionEvent =
  | 'overlay-click'
  | 'overlay-hover'
  | 'overlay-hover-end';

export type OverlayManagerEvent =
  | 'overlay-added'
  | 'overlay-removed'
  | 'visibility-change'
  | 'z-order-change'
  | 'opacity-change'
  | 'data-update'
  | 'configuration-change'
  | OverlayInteractionEvent;

export interface OverlayHandle {
  readonly id: string;
  readonly overlay: RailOverlay;
  readonly visible: boolean;
  readonly zIndex: number;
  readonly opacity: number;
}

export interface OverlayRegistrationOptions {
  readonly id?: string;
  readonly visible?: boolean;
  readonly zIndex?: number;
  readonly opacity?: number;
}

export interface OverlayManagerEventPayload {
  readonly event: OverlayManagerEvent;
  readonly overlayId: string;
  readonly overlay: RailOverlay;
  readonly visible?: boolean;
  readonly zIndex?: number;
  readonly opacity?: number;
  readonly configuration?: Readonly<OverlayConfiguration>;
  readonly element?: Readonly<{
    readonly id: string;
    readonly type: string;
    readonly properties: Readonly<Record<string, unknown>>;
    readonly isOverlay: boolean;
  }>;
  readonly coordinates?: Readonly<{
    readonly x: number;
    readonly y: number;
  }>;
}

export type OverlayConfigurationValidator = (
  configuration: Readonly<OverlayConfiguration>,
) => OverlayConfiguration;

type OverlayManagerEventHandler = (payload: OverlayManagerEventPayload) => void;
type OverlayScopedEventHandler = (payload: OverlayManagerEventPayload) => void;

interface OverlayRecord {
  readonly id: string;
  readonly overlay: RailOverlay;
  visible: boolean;
  zIndex: number;
  opacity: number;
  configuration: OverlayConfiguration;
}

const DEFAULT_CONFIGURATION: Required<
  Pick<OverlayConfiguration, 'visible' | 'zIndex' | 'opacity' | 'interactive' | 'animationEnabled'>
> = {
  visible: true,
  zIndex: 0,
  opacity: 1,
  interactive: false,
  animationEnabled: false,
};

const INTERACTION_EVENT_MAP: Readonly<Record<string, OverlayInteractionEvent>> = {
  'element-click': 'overlay-click',
  'element-hover': 'overlay-hover',
  'element-hover-end': 'overlay-hover-end',
};

function mergeConfiguration(
  base?: Readonly<OverlayConfiguration>,
  next?: Readonly<Partial<OverlayConfiguration>>,
): OverlayConfiguration {
  const resolvedId = next?.id ?? base?.id;
  const resolvedMetadata = next?.metadata ?? base?.metadata;

  return {
    ...(resolvedId !== undefined ? { id: resolvedId } : {}),
    visible: next?.visible ?? base?.visible ?? DEFAULT_CONFIGURATION.visible,
    zIndex: next?.zIndex ?? base?.zIndex ?? DEFAULT_CONFIGURATION.zIndex,
    opacity: next?.opacity ?? base?.opacity ?? DEFAULT_CONFIGURATION.opacity,
    interactive: next?.interactive ?? base?.interactive ?? DEFAULT_CONFIGURATION.interactive,
    animationEnabled:
      next?.animationEnabled
      ?? base?.animationEnabled
      ?? DEFAULT_CONFIGURATION.animationEnabled,
    ...(resolvedMetadata !== undefined ? { metadata: resolvedMetadata } : {}),
  };
}

export class OverlayManager {
  private readonly overlays = new Map<string, OverlayRecord>();
  private readonly handlers = new Map<OverlayManagerEvent, Set<OverlayManagerEventHandler>>();
  private readonly overlayEventHandlers = new Map<
    string,
    Map<OverlayInteractionEvent, Set<OverlayScopedEventHandler>>
  >();
  private readonly interactiveElementOwners = new Map<string, string>();
  private readonly configurationValidators = new Map<string, OverlayConfigurationValidator>();
  private readonly delegatedListeners = new Map<string, (payload: EventManagerPayload) => void>();
  private readonly registry: OverlayRegistry;
  private readonly context: OverlayContext;
  private readonly accessibilityManager = new OverlayAccessibilityManager();
  private idCounter = 0;

  public constructor(
    context: OverlayContext = {},
    registry: OverlayRegistry = new OverlayRegistry(),
  ) {
    this.context = context;
    this.registry = registry;
    this.attachDelegatedEvents();
  }

  public on(event: OverlayManagerEvent, handler: OverlayManagerEventHandler): void {
    const handlers = this.handlers.get(event) ?? new Set<OverlayManagerEventHandler>();

    handlers.add(handler);
    this.handlers.set(event, handlers);
  }

  public off(event: OverlayManagerEvent, handler: OverlayManagerEventHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  public async addOverlay(
    overlayOrType: RailOverlay | string,
    options: OverlayRegistrationOptions = {},
  ): Promise<string> {
    const overlay =
      typeof overlayOrType === 'string'
        ? this.registry.create(overlayOrType)
        : overlayOrType;
    const overlayId = options.id ?? this.createUniqueId(overlay.type);

    if (this.overlays.has(overlayId)) {
      throw new OverlayError('Overlay id must be unique.', 'OVERLAY_DUPLICATE', {
        overlayId,
      });
    }

    const baseConfiguration = mergeConfiguration(overlay.getConfiguration?.(), {
      id: overlayId,
      ...(options.visible !== undefined ? { visible: options.visible } : {}),
      ...(options.zIndex !== undefined ? { zIndex: options.zIndex } : {}),
      ...(options.opacity !== undefined ? { opacity: options.opacity } : {}),
    });
    const configuration = this.validateConfigurationForType(overlay.type, baseConfiguration);

    if (overlay.configure) {
      await overlay.configure(configuration as never);
    }

    await overlay.initialize(this.context);

    this.overlays.set(overlayId, {
      id: overlayId,
      overlay,
      visible: configuration.visible ?? true,
      zIndex: configuration.zIndex ?? 0,
      opacity: configuration.opacity ?? 1,
      configuration,
    });

    this.emit('overlay-added', overlayId);

    return overlayId;
  }

  public async removeOverlay(id: string): Promise<boolean> {
    const record = this.overlays.get(id);

    if (!record) {
      return false;
    }

    await record.overlay.destroy();
    this.overlays.delete(id);
    this.overlayEventHandlers.delete(id);
    this.unregisterInteractiveElementsForOverlay(id);
    this.accessibilityManager.clear(id);
    this.emit('overlay-removed', id, record);

    return true;
  }

  public getOverlay(id: string): RailOverlay | undefined {
    return this.overlays.get(id)?.overlay;
  }

  public getAllOverlays(): ReadonlyArray<OverlayHandle> {
    return this.getSortedRecords().map((record) => ({
      id: record.id,
      overlay: record.overlay,
      visible: record.visible,
      zIndex: record.zIndex,
      opacity: record.opacity,
    }));
  }

  public showOverlay(id: string): void {
    this.setVisibility(id, true);
  }

  public hideOverlay(id: string): void {
    this.setVisibility(id, false);
  }

  public toggleOverlay(id: string): boolean {
    const record = this.requireRecord(id);
    const nextVisible = !record.visible;

    this.setVisibility(id, nextVisible);

    return nextVisible;
  }

  public showAll(): void {
    for (const record of this.overlays.values()) {
      record.visible = true;
      record.configuration = mergeConfiguration(record.configuration, { visible: true });
      this.emit('visibility-change', record.id, record);
      this.accessibilityManager.announce(`Overlay ${record.id} shown`);
    }
  }

  public hideAll(): void {
    for (const record of this.overlays.values()) {
      record.visible = false;
      record.configuration = mergeConfiguration(record.configuration, { visible: false });
      this.emit('visibility-change', record.id, record);
      this.accessibilityManager.announce(`Overlay ${record.id} hidden`);
    }
  }

  public setZOrder(id: string, zIndex: number): void {
    const record = this.requireRecord(id);

    record.zIndex = zIndex;
    record.configuration = mergeConfiguration(record.configuration, { zIndex });
    this.emit('z-order-change', id, record);
  }

  public bringToFront(id: string): void {
    const highest = this.getSortedRecords().at(-1)?.zIndex ?? 0;

    this.setZOrder(id, highest + 1);
  }

  public sendToBack(id: string): void {
    const lowest = this.getSortedRecords().at(0)?.zIndex ?? 0;

    this.setZOrder(id, lowest - 1);
  }

  public setOpacity(id: string, opacity: number): void {
    this.validateOpacity(opacity);
    const record = this.requireRecord(id);

    record.opacity = opacity;
    record.configuration = mergeConfiguration(record.configuration, { opacity });
    this.emit('opacity-change', id, record);
  }

  public async updateOverlayData<TData>(
    id: string,
    data: TData,
    context?: RenderContext,
  ): Promise<void> {
    const record = this.requireRecord(id);

    await record.overlay.update(data, context);
    this.emit('data-update', id, record);
  }

  public async batchUpdate(
    updates: ReadonlyArray<readonly [string, unknown]>,
    context?: RenderContext,
  ): Promise<void> {
    for (const [id, data] of updates) {
      await this.updateOverlayData(id, data, context);
    }
  }

  public async renderAll(
    context: RenderContext,
  ): Promise<ReadonlyArray<OverlayRenderResult & { readonly id: string }>> {
    const results: Array<OverlayRenderResult & { readonly id: string }> = [];

    for (const record of this.getSortedRecords()) {
      if (!record.visible) {
        continue;
      }

      const result = await record.overlay.render(context);
      results.push({
        id: record.id,
        ...result,
      });
    }

    return results;
  }

  public async renderOverlay(
    id: string,
    context: RenderContext,
  ): Promise<OverlayRenderResult | undefined> {
    const record = this.overlays.get(id);

    if (!record || !record.visible) {
      return undefined;
    }

    return record.overlay.render(context);
  }

  public getLegends(): ReadonlyArray<OverlayLegend & { readonly overlayId: string }> {
    return this.getSortedRecords()
      .filter((record) => record.visible)
      .map((record) => {
        const legend = record.overlay.getLegend?.();

        if (!legend) {
          return undefined;
        }

        return {
          overlayId: record.id,
          ...legend,
        };
      })
      .filter((legend): legend is OverlayLegend & { readonly overlayId: string } => legend !== undefined);
  }

  public registerInteractiveElement(
    overlayId: string,
    elementIdOrIds: string | ReadonlyArray<string>,
  ): void {
    const ids = Array.isArray(elementIdOrIds) ? elementIdOrIds : [elementIdOrIds];

    for (const elementId of ids) {
      this.interactiveElementOwners.set(elementId, overlayId);
    }
  }

  public unregisterInteractiveElement(elementId: string): void {
    this.interactiveElementOwners.delete(elementId);
  }

  public registerOverlayEventHandler(
    overlayId: string,
    event: OverlayInteractionEvent,
    handler: OverlayScopedEventHandler,
  ): void {
    const eventMap =
      this.overlayEventHandlers.get(overlayId)
      ?? new Map<OverlayInteractionEvent, Set<OverlayScopedEventHandler>>();
    const handlers = eventMap.get(event) ?? new Set<OverlayScopedEventHandler>();

    handlers.add(handler);
    eventMap.set(event, handlers);
    this.overlayEventHandlers.set(overlayId, eventMap);
  }

  public unregisterOverlayEventHandler(
    overlayId: string,
    event: OverlayInteractionEvent,
    handler: OverlayScopedEventHandler,
  ): void {
    this.overlayEventHandlers.get(overlayId)?.get(event)?.delete(handler);
  }

  public emitOverlayInteraction(
    event: OverlayInteractionEvent,
    overlayId: string,
    element: OverlayManagerEventPayload['element'],
    coordinates?: OverlayManagerEventPayload['coordinates'],
  ): void {
    const record = this.requireRecord(overlayId);
    const payload: OverlayManagerEventPayload = {
      event,
      overlayId,
      overlay: record.overlay,
      visible: record.visible,
      zIndex: record.zIndex,
      opacity: record.opacity,
      configuration: record.configuration,
      ...(element ? { element } : {}),
      ...(coordinates ? { coordinates } : {}),
    };

    this.dispatch(event, payload);
    const handlers = this.overlayEventHandlers.get(overlayId)?.get(event);

    if (!handlers) {
      return;
    }

    for (const handler of handlers) {
      handler(payload);
    }
  }

  public delegateEvent(payload: Pick<EventManagerPayload, 'event' | 'element' | 'coordinates'>): void {
    const managerEvent = INTERACTION_EVENT_MAP[payload.event];

    if (!managerEvent || !payload.element) {
      return;
    }

    const overlayId =
      (typeof payload.element.properties.overlayId === 'string'
        ? (payload.element.properties.overlayId as string)
        : undefined)
      ?? this.interactiveElementOwners.get(payload.element.id);

    if (!overlayId || !this.overlays.has(overlayId)) {
      return;
    }

    this.emitOverlayInteraction(
      managerEvent,
      overlayId,
      {
        id: payload.element.id,
        type: payload.element.type,
        properties: payload.element.properties,
        isOverlay: payload.element.isOverlay,
      },
      payload.coordinates
        ? {
            x: payload.coordinates.x,
            y: payload.coordinates.y,
          }
        : undefined,
    );
  }

  public registerConfigurationValidator(
    overlayType: string,
    validator: OverlayConfigurationValidator,
  ): void {
    this.configurationValidators.set(overlayType, validator);
  }

  public validateConfigurationForType(
    overlayType: string,
    configuration: Readonly<OverlayConfiguration>,
  ): OverlayConfiguration {
    const withDefaults = mergeConfiguration(configuration);

    if (withDefaults.visible !== undefined && typeof withDefaults.visible !== 'boolean') {
      throw new OverlayError('Visible must be a boolean.', 'OVERLAY_INVALID');
    }

    if (withDefaults.zIndex !== undefined && !Number.isFinite(withDefaults.zIndex)) {
      throw new OverlayError('zIndex must be a finite number.', 'OVERLAY_INVALID');
    }

    if (withDefaults.opacity !== undefined) {
      this.validateOpacity(withDefaults.opacity);
    }

    const validator = this.configurationValidators.get(overlayType);
    const validatedByType = validator
      ? validator(withDefaults)
      : this.validateBuiltInConfiguration(overlayType, withDefaults);

    return mergeConfiguration(withDefaults, validatedByType);
  }

  public async updateOverlayConfiguration(
    id: string,
    configuration: Readonly<Partial<OverlayConfiguration>>,
  ): Promise<OverlayConfiguration> {
    const record = this.requireRecord(id);
    const nextConfiguration = this.validateConfigurationForType(
      record.overlay.type,
      mergeConfiguration(record.configuration, configuration),
    );

    if (record.overlay.configure) {
      await record.overlay.configure(nextConfiguration as never);
    }

    record.configuration = nextConfiguration;
    record.visible = nextConfiguration.visible ?? record.visible;
    record.zIndex = nextConfiguration.zIndex ?? record.zIndex;
    record.opacity = nextConfiguration.opacity ?? record.opacity;

    this.emit('configuration-change', id, record);
    this.accessibilityManager.announce(`Overlay ${id} configuration updated`);

    return nextConfiguration;
  }

  public getOverlayConfiguration(id: string): Readonly<OverlayConfiguration> {
    return this.requireRecord(id).configuration;
  }

  public applyAccessibility(
    overlayId: string,
    nodes: ReadonlyArray<import('../rendering').SvgRenderNode>,
    options: Omit<
      import('../accessibility').AccessibilityEnhancementOptions,
      'overlayId'
    > = {},
  ): ReadonlyArray<import('../rendering').SvgRenderNode> {
    return this.accessibilityManager.enhanceNodes(nodes, {
      overlayId,
      ...options,
    });
  }

  public getAccessibilityManager(): OverlayAccessibilityManager {
    return this.accessibilityManager;
  }

  public attachViewportChangeHandler(
    handler: (context: { readonly visibleBounds: unknown }) => void,
    options: {
      readonly mode?: 'debounce' | 'throttle';
      readonly waitMs?: number;
    } = {},
  ): (() => void) | undefined {
    const viewportController = this.context.viewportController;

    if (!viewportController) {
      return undefined;
    }

    const waitMs = options.waitMs ?? 16;
    const wrapped =
      options.mode === 'throttle'
        ? Debounce.throttle(handler, waitMs)
        : Debounce.debounce(handler, waitMs);

    viewportController.on('viewport-change', wrapped as never);

    return () => {
      viewportController.off('viewport-change', wrapped as never);
    };
  }

  private setVisibility(id: string, visible: boolean): void {
    const record = this.requireRecord(id);

    record.visible = visible;
    record.configuration = mergeConfiguration(record.configuration, { visible });
    this.emit('visibility-change', id, record);
    this.accessibilityManager.announce(`Overlay ${id} ${visible ? 'shown' : 'hidden'}`);
  }

  private getSortedRecords(): Array<OverlayRecord> {
    return [...this.overlays.values()].sort(
      (left, right) => left.zIndex - right.zIndex || left.id.localeCompare(right.id),
    );
  }

  private createUniqueId(type: string): string {
    this.idCounter += 1;

    return `${type}-${this.idCounter}`;
  }

  private requireRecord(id: string): OverlayRecord {
    const record = this.overlays.get(id);

    if (!record) {
      throw new OverlayError('Overlay could not be found.', 'OVERLAY_NOT_FOUND', {
        overlayId: id,
      });
    }

    return record;
  }

  private validateOpacity(opacity: number): void {
    if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
      throw new OverlayError('Opacity must be a finite number between 0 and 1.', 'OVERLAY_OPACITY', {
        opacity,
      });
    }
  }

  private validateBuiltInConfiguration(
    overlayType: string,
    configuration: OverlayConfiguration,
  ): OverlayConfiguration {
    const metadata = configuration.metadata ?? {};

    const requirePositiveNumber = (key: string): void => {
      const value = metadata[key];

      if (value !== undefined && (!Number.isFinite(value) || Number(value) <= 0)) {
        throw new OverlayError(`Configuration field "${key}" must be positive.`, 'OVERLAY_INVALID');
      }
    };

    switch (overlayType) {
      case 'heat-map':
        requirePositiveNumber('pointRadius');
        break;
      case 'annotation':
        requirePositiveNumber('pinSize');
        requirePositiveNumber('clusterRadius');
        break;
      case 'range-band':
        requirePositiveNumber('bandWidth');
        break;
      case 'traffic-flow': {
        const minWidth = metadata.minWidth;
        const maxWidth = metadata.maxWidth;

        if (
          minWidth !== undefined
          && maxWidth !== undefined
          && Number.isFinite(minWidth)
          && Number.isFinite(maxWidth)
          && Number(maxWidth) < Number(minWidth)
        ) {
          throw new OverlayError('maxWidth must be greater than or equal to minWidth.', 'OVERLAY_INVALID');
        }

        break;
      }
      case 'time-series':
        requirePositiveNumber('pointRadius');
        break;
      default:
        break;
    }

    return configuration;
  }

  private emit(
    event: Exclude<OverlayManagerEvent, OverlayInteractionEvent>,
    overlayId: string,
    record?: OverlayRecord,
  ): void {
    const payloadRecord = record ?? this.requireRecord(overlayId);

    this.dispatch(event, {
      event,
      overlayId,
      overlay: payloadRecord.overlay,
      visible: payloadRecord.visible,
      zIndex: payloadRecord.zIndex,
      opacity: payloadRecord.opacity,
      configuration: payloadRecord.configuration,
    });
  }

  private dispatch(
    event: OverlayManagerEvent,
    payload: OverlayManagerEventPayload,
  ): void {
    const handlers = this.handlers.get(event);

    if (!handlers) {
      return;
    }

    for (const handler of handlers) {
      handler(payload);
    }
  }

  private attachDelegatedEvents(): void {
    const eventManager = this.context.eventManager;

    if (!eventManager) {
      return;
    }

    for (const managedEvent of Object.keys(INTERACTION_EVENT_MAP)) {
      const listener = (payload: EventManagerPayload) => {
        this.delegateEvent(payload);
      };

      this.delegatedListeners.set(managedEvent, listener);
      eventManager.on(managedEvent as never, listener);
    }
  }

  private unregisterInteractiveElementsForOverlay(overlayId: string): void {
    for (const [elementId, ownerId] of [...this.interactiveElementOwners.entries()]) {
      if (ownerId === overlayId) {
        this.interactiveElementOwners.delete(elementId);
      }
    }
  }
}
