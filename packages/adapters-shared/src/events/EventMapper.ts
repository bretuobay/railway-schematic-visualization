export type EventNamingConvention = 'camelCase' | 'kebab-case';

export type FrameworkEventTarget = 'react' | 'vue' | 'web-component';

export type LibraryEventName =
  | 'element-click'
  | 'element-dblclick'
  | 'element-contextmenu'
  | 'element-hover'
  | 'element-hover-end'
  | 'selection-change'
  | 'viewport-change'
  | 'overlay-click'
  | 'overlay-hover'
  | 'overlay-hover-end'
  | 'focus-change'
  | 'brush-start'
  | 'brush-move'
  | 'brush-end'
  | 'pan'
  | 'zoom'
  | 'transform';

export interface EventMapperOptions {
  readonly target?: FrameworkEventTarget;
  readonly convention?: EventNamingConvention;
  readonly prefix?: string;
}

export interface MapPayloadOptions<TOutput = FrameworkEventPayload> {
  readonly includeSourceEvent?: boolean;
  readonly transform?: (
    payload: FrameworkEventPayload,
    eventName: string,
  ) => TOutput;
}

export interface FrameworkEventPayload {
  readonly type: string;
  readonly sourceEvent?: string;
  readonly element?: Readonly<Record<string, unknown>>;
  readonly coordinates?: Readonly<{
    readonly x: number;
    readonly y: number;
  }>;
  readonly selection?: ReadonlyArray<string>;
  readonly viewport?: Readonly<Record<string, unknown>>;
  readonly detail?: Readonly<Record<string, unknown>>;
  readonly originalEvent?: unknown;
}

export interface MappedEvent<TPayload = FrameworkEventPayload> {
  readonly name: string;
  readonly payload: TPayload;
}

const FRAMEWORK_EVENT_NAMES: Readonly<
  Record<FrameworkEventTarget, Readonly<Record<string, string>>>
> = {
  react: {
    'element-click': 'onClick',
    'element-hover': 'onHover',
    'element-hover-end': 'onHoverEnd',
    'selection-change': 'onSelectionChange',
    'viewport-change': 'onViewportChange',
    'overlay-click': 'onOverlayClick',
    'overlay-hover': 'onOverlayHover',
    'overlay-hover-end': 'onOverlayHoverEnd',
    'focus-change': 'onFocusChange',
    'brush-start': 'onBrushStart',
    'brush-move': 'onBrushMove',
    'brush-end': 'onBrushEnd',
    pan: 'onPan',
    zoom: 'onZoom',
    transform: 'onTransform',
    'element-dblclick': 'onDoubleClick',
    'element-contextmenu': 'onContextMenu',
  },
  vue: {
    'element-click': 'click',
    'element-hover': 'hover',
    'element-hover-end': 'hover-end',
    'selection-change': 'selection-change',
    'viewport-change': 'viewport-change',
    'overlay-click': 'overlay-click',
    'overlay-hover': 'overlay-hover',
    'overlay-hover-end': 'overlay-hover-end',
    'focus-change': 'focus-change',
    'brush-start': 'brush-start',
    'brush-move': 'brush-move',
    'brush-end': 'brush-end',
    pan: 'pan',
    zoom: 'zoom',
    transform: 'transform',
    'element-dblclick': 'dblclick',
    'element-contextmenu': 'contextmenu',
  },
  'web-component': {
    'element-click': 'rail-click',
    'element-hover': 'rail-hover',
    'element-hover-end': 'rail-hover-end',
    'selection-change': 'rail-selection-change',
    'viewport-change': 'rail-viewport-change',
    'overlay-click': 'rail-overlay-click',
    'overlay-hover': 'rail-overlay-hover',
    'overlay-hover-end': 'rail-overlay-hover-end',
    'focus-change': 'rail-focus-change',
    'brush-start': 'rail-brush-start',
    'brush-move': 'rail-brush-move',
    'brush-end': 'rail-brush-end',
    pan: 'rail-pan',
    zoom: 'rail-zoom',
    transform: 'rail-transform',
    'element-dblclick': 'rail-dblclick',
    'element-contextmenu': 'rail-contextmenu',
  },
};

const LIBRARY_EVENT_ALIASES: Readonly<Record<string, string>> = {
  'element-click': 'click',
  'element-dblclick': 'double-click',
  'element-contextmenu': 'context-menu',
  'element-hover': 'hover',
  'element-hover-end': 'hover-end',
};

export class EventMapper {
  public mapName(
    eventName: string,
    options: EventMapperOptions = {},
  ): string {
    if (options.target) {
      return this.mapFrameworkName(eventName, options.target);
    }

    const baseName = this.resolveBaseName(eventName);

    if (options.convention === 'camelCase') {
      return this.toCamelCase(options.prefix ? `${options.prefix}-${baseName}` : baseName);
    }

    if (options.convention === 'kebab-case') {
      return this.toKebabCase(options.prefix ? `${options.prefix}-${baseName}` : baseName);
    }

    if (options.prefix) {
      return `${options.prefix}-${baseName}`;
    }

    return baseName;
  }

  public mapPayload<TOutput = FrameworkEventPayload>(
    eventName: string,
    payload: Readonly<Record<string, unknown>> = {},
    options: MapPayloadOptions<TOutput> = {},
  ): TOutput {
    const element = this.readRecord(payload, 'element');
    const coordinates = this.readCoordinates(payload, 'coordinates');
    const selection = this.readSelection(payload);
    const viewport = this.readViewport(payload);
    const detail = this.readRecord(payload, 'detail');
    const hasOriginalEvent = Object.prototype.hasOwnProperty.call(payload, 'originalEvent');
    const normalizedPayload: FrameworkEventPayload = {
      type: this.resolveBaseName(eventName),
      ...(options.includeSourceEvent !== false ? { sourceEvent: eventName } : {}),
      ...(element !== undefined ? { element } : {}),
      ...(coordinates !== undefined ? { coordinates } : {}),
      ...(selection !== undefined ? { selection } : {}),
      ...(viewport !== undefined ? { viewport } : {}),
      ...(detail !== undefined ? { detail } : {}),
      ...(hasOriginalEvent
        ? { originalEvent: payload.originalEvent }
        : {}),
    };

    if (options.transform) {
      return options.transform(normalizedPayload, eventName);
    }

    return normalizedPayload as TOutput;
  }

  public mapEvent<TOutput = FrameworkEventPayload>(
    eventName: string,
    payload: Readonly<Record<string, unknown>> = {},
    options: EventMapperOptions & MapPayloadOptions<TOutput> = {},
  ): MappedEvent<TOutput> {
    return {
      name: this.mapName(eventName, options),
      payload: this.mapPayload(eventName, payload, options),
    };
  }

  private mapFrameworkName(
    eventName: string,
    target: FrameworkEventTarget,
  ): string {
    const directMatch = FRAMEWORK_EVENT_NAMES[target][eventName];

    if (directMatch) {
      return directMatch;
    }

    const baseName = this.resolveBaseName(eventName);

    switch (target) {
      case 'react':
        return `on${this.capitalize(this.toCamelCase(baseName))}`;
      case 'vue':
        return this.toKebabCase(baseName);
      case 'web-component':
        return `rail-${this.toKebabCase(baseName)}`;
    }
  }

  private resolveBaseName(eventName: string): string {
    return LIBRARY_EVENT_ALIASES[eventName] ?? eventName;
  }

  private toCamelCase(value: string): string {
    return value
      .split(/[-_\s]+/)
      .filter((segment) => segment.length > 0)
      .map((segment, index) =>
        index === 0
          ? segment.toLowerCase()
          : this.capitalize(segment.toLowerCase()),
      )
      .join('');
  }

  private toKebabCase(value: string): string {
    return value
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .split(/[\s_]+/)
      .join('-')
      .replace(/-+/g, '-')
      .toLowerCase();
  }

  private capitalize(value: string): string {
    return value.length === 0 ? value : `${value[0]?.toUpperCase() ?? ''}${value.slice(1)}`;
  }

  private readRecord(
    payload: Readonly<Record<string, unknown>>,
    key: string,
  ): Readonly<Record<string, unknown>> | undefined {
    const candidate = payload[key];

    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      return candidate as Record<string, unknown>;
    }

    return undefined;
  }

  private readCoordinates(
    payload: Readonly<Record<string, unknown>>,
    key: string,
  ): Readonly<{ x: number; y: number }> | undefined {
    const candidate = this.readRecord(payload, key);
    const x = candidate?.x;
    const y = candidate?.y;

    if (typeof x === 'number' && Number.isFinite(x) && typeof y === 'number' && Number.isFinite(y)) {
      return { x, y };
    }

    return undefined;
  }

  private readSelection(
    payload: Readonly<Record<string, unknown>>,
  ): ReadonlyArray<string> | undefined {
    const candidate = payload.selection;

    if (!Array.isArray(candidate)) {
      return undefined;
    }

    return candidate.filter((value): value is string => typeof value === 'string');
  }

  private readViewport(
    payload: Readonly<Record<string, unknown>>,
  ): Readonly<Record<string, unknown>> | undefined {
    const transform = this.readRecord(payload, 'transform');
    const previousTransform = this.readRecord(payload, 'previousTransform');
    const visibleBounds = this.readRecord(payload, 'visibleBounds');

    if (!transform && !previousTransform && !visibleBounds) {
      return undefined;
    }

    return {
      ...(transform ? { transform } : {}),
      ...(previousTransform ? { previousTransform } : {}),
      ...(visibleBounds ? { visibleBounds } : {}),
    };
  }
}
