export type EventManagerEvent =
  | 'element-click'
  | 'element-dblclick'
  | 'element-contextmenu'
  | 'element-hover'
  | 'element-hover-end'
  | 'selection-change'
  | 'brush-start'
  | 'brush-move'
  | 'brush-end'
  | 'focus-change';

export interface InteractionCoordinates {
  readonly x: number;
  readonly y: number;
}

export interface EventManagerElementData {
  readonly id: string;
  readonly type: string;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly isOverlay: boolean;
  readonly underlyingId?: string;
  readonly underlyingType?: string;
}

export interface EventManagerPayload {
  readonly event: EventManagerEvent;
  readonly element?: EventManagerElementData;
  readonly coordinates?: InteractionCoordinates;
  readonly selection?: ReadonlyArray<string>;
  readonly originalEvent?: unknown;
}

export interface InteractionElementLike {
  readonly dataset?: Record<string, string | undefined>;
  readonly parentElement?: InteractionElementLike | null;
  getAttribute?(name: string): string | null;
}

export interface InteractionRootLike {
  addEventListener?(
    type: string,
    listener: (event: unknown) => void,
    options?: AddEventListenerOptions | boolean,
  ): void;
  removeEventListener?(
    type: string,
    listener: (event: unknown) => void,
    options?: EventListenerOptions | boolean,
  ): void;
}

type EventManagerHandler = (payload: EventManagerPayload) => void;

type NativeDelegatedEvent = {
  readonly target?: unknown;
  readonly clientX?: number;
  readonly clientY?: number;
  readonly offsetX?: number;
  readonly offsetY?: number;
  preventDefault?: () => void;
};

const ROOT_EVENT_MAP: ReadonlyArray<readonly [string, EventManagerEvent]> = [
  ['click', 'element-click'],
  ['dblclick', 'element-dblclick'],
  ['contextmenu', 'element-contextmenu'],
  ['pointerover', 'element-hover'],
  ['pointerout', 'element-hover-end'],
  ['focusin', 'focus-change'],
];

export class EventManager {
  private readonly root: InteractionRootLike;
  private readonly handlers = new Map<EventManagerEvent, Set<EventManagerHandler>>();
  private readonly rootListeners = new Map<string, (event: unknown) => void>();

  public constructor(root: SVGSVGElement | InteractionRootLike) {
    this.root = root;

    for (const [nativeEvent, managedEvent] of ROOT_EVENT_MAP) {
      const listener = (event: unknown) => {
        this.handleDelegatedEvent(managedEvent, event as NativeDelegatedEvent);
      };

      this.rootListeners.set(nativeEvent, listener);
      this.root.addEventListener?.(nativeEvent, listener);
    }
  }

  public on(event: EventManagerEvent, handler: EventManagerHandler): void {
    const handlers = this.handlers.get(event) ?? new Set<EventManagerHandler>();

    handlers.add(handler);
    this.handlers.set(event, handlers);
  }

  public off(event: EventManagerEvent, handler: EventManagerHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  public emit(event: EventManagerEvent, payload: Omit<EventManagerPayload, 'event'> = {}): void {
    this.dispatch(event, {
      event,
      ...payload,
    });
  }

  public destroy(): void {
    for (const [nativeEvent, listener] of this.rootListeners) {
      this.root.removeEventListener?.(nativeEvent, listener);
    }
  }

  private handleDelegatedEvent(
    managedEvent: EventManagerEvent,
    nativeEvent: NativeDelegatedEvent,
  ): void {
    if (managedEvent === 'element-contextmenu') {
      nativeEvent.preventDefault?.();
    }

    const element = this.resolveElement(nativeEvent.target);

    if (!element) {
      if (managedEvent === 'focus-change') {
        this.dispatch(managedEvent, {
          event: managedEvent,
          coordinates: this.resolveCoordinates(nativeEvent),
          originalEvent: nativeEvent,
        });
      }

      return;
    }

    const payload: EventManagerPayload = {
      event: managedEvent,
      element,
      coordinates: this.resolveCoordinates(nativeEvent),
      originalEvent: nativeEvent,
    };

    this.dispatch(managedEvent, payload);

    if (!element.isOverlay || !element.underlyingId) {
      return;
    }

    this.dispatch(managedEvent, {
      ...payload,
      element: {
        id: element.underlyingId,
        type: element.underlyingType ?? 'track',
        properties: element.properties,
        isOverlay: false,
      },
    });
  }

  private dispatch(event: EventManagerEvent, payload: EventManagerPayload): void {
    const handlers = this.handlers.get(event);

    if (!handlers) {
      return;
    }

    for (const handler of handlers) {
      handler(payload);
    }
  }

  private resolveCoordinates(event: NativeDelegatedEvent): InteractionCoordinates {
    return {
      x: event.offsetX ?? event.clientX ?? 0,
      y: event.offsetY ?? event.clientY ?? 0,
    };
  }

  private resolveElement(target: unknown): EventManagerElementData | undefined {
    let current = this.asInteractionElement(target);

    while (current) {
      const id = this.readData(current, 'elementId');
      const type = this.readData(current, 'elementType');

      if (id && type) {
        const underlyingId = this.readData(current, 'overlayFor');
        const underlyingType = this.readData(current, 'underlyingType');

        return {
          id,
          type,
          properties: this.readProperties(current),
          isOverlay: underlyingId !== undefined,
          ...(underlyingId ? { underlyingId } : {}),
          ...(underlyingType ? { underlyingType } : {}),
        };
      }

      current = current.parentElement ?? undefined;
    }

    return undefined;
  }

  private readProperties(element: InteractionElementLike): Readonly<Record<string, unknown>> {
    const rawProperties =
      this.readData(element, 'elementProps')
      ?? this.readData(element, 'customProps')
      ?? '{}';

    try {
      const parsed = JSON.parse(rawProperties) as unknown;

      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }

    return {};
  }

  private readData(
    element: InteractionElementLike,
    key: 'elementId' | 'elementType' | 'elementProps' | 'customProps' | 'overlayFor' | 'underlyingType',
  ): string | undefined {
    const datasetValue = element.dataset?.[key];

    if (datasetValue !== undefined) {
      return datasetValue;
    }

    const attributeName = `data-${key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}`;
    const attributeValue = element.getAttribute?.(attributeName);

    return attributeValue ?? undefined;
  }

  private asInteractionElement(target: unknown): InteractionElementLike | undefined {
    if (!target || typeof target !== 'object') {
      return undefined;
    }

    return target as InteractionElementLike;
  }
}
