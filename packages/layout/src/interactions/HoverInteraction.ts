import type {
  EventManager,
  EventManagerElementData,
  EventManagerPayload,
  InteractionCoordinates,
} from './EventManager';

export interface HoverTooltipState {
  readonly visible: boolean;
  readonly content: string;
  readonly position: InteractionCoordinates;
}

export interface HoverInteractionConfig {
  readonly hoverDelayMs?: number;
  readonly hoverStyles?: Readonly<Record<string, string>>;
  readonly tooltipTemplate?: (element: EventManagerElementData) => string;
  readonly viewportWidth?: number;
  readonly viewportHeight?: number;
  readonly tooltipWidth?: number;
  readonly tooltipHeight?: number;
  readonly tooltipMargin?: number;
}

export interface HoverInteractionPayload {
  readonly element: EventManagerElementData;
  readonly coordinates: InteractionCoordinates;
  readonly tooltip: HoverTooltipState;
  readonly originalEvent?: unknown;
}

export type HoverInteractionEvent = 'hover' | 'hover-end';

export interface HoverStylableTarget {
  readonly style?: Record<string, string>;
}

type HoverInteractionHandler = (payload: HoverInteractionPayload) => void;

const DEFAULT_CONFIG: Required<
  Pick<
    HoverInteractionConfig,
    | 'hoverDelayMs'
    | 'viewportWidth'
    | 'viewportHeight'
    | 'tooltipWidth'
    | 'tooltipHeight'
    | 'tooltipMargin'
  >
> = {
  hoverDelayMs: 0,
  viewportWidth: 800,
  viewportHeight: 600,
  tooltipWidth: 180,
  tooltipHeight: 48,
  tooltipMargin: 8,
};

export class HoverInteraction {
  private readonly eventManager: Pick<EventManager, 'on' | 'off'>;
  private readonly config: HoverInteractionConfig;
  private readonly handlers = new Map<HoverInteractionEvent, Set<HoverInteractionHandler>>();
  private readonly onHoverFromManager: (payload: EventManagerPayload) => void;
  private readonly onHoverEndFromManager: (payload: EventManagerPayload) => void;
  private hoverTimer: ReturnType<typeof setTimeout> | undefined;
  private hoveredElement: EventManagerElementData | undefined;
  private hoveredTarget: HoverStylableTarget | undefined;
  private tooltip: HoverTooltipState = {
    visible: false,
    content: '',
    position: { x: 0, y: 0 },
  };

  public constructor(
    eventManager: Pick<EventManager, 'on' | 'off'>,
    config: HoverInteractionConfig = {},
  ) {
    this.eventManager = eventManager;
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
    this.onHoverFromManager = (payload) => {
      this.handleHover(payload);
    };
    this.onHoverEndFromManager = (payload) => {
      this.handleHoverEnd(payload);
    };

    this.eventManager.on('element-hover', this.onHoverFromManager);
    this.eventManager.on('element-hover-end', this.onHoverEndFromManager);
  }

  public on(event: HoverInteractionEvent, handler: HoverInteractionHandler): void {
    const handlers = this.handlers.get(event) ?? new Set<HoverInteractionHandler>();

    handlers.add(handler);
    this.handlers.set(event, handlers);
  }

  public off(event: HoverInteractionEvent, handler: HoverInteractionHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  public destroy(): void {
    this.clearHoverTimer();
    this.clearHoverStyles();
    this.eventManager.off('element-hover', this.onHoverFromManager);
    this.eventManager.off('element-hover-end', this.onHoverEndFromManager);
  }

  public getHoveredElement(): EventManagerElementData | undefined {
    return this.hoveredElement;
  }

  public getTooltipState(): HoverTooltipState {
    return {
      visible: this.tooltip.visible,
      content: this.tooltip.content,
      position: { ...this.tooltip.position },
    };
  }

  public resolveTooltipPosition(
    point: InteractionCoordinates,
    tooltipSize: {
      readonly width?: number;
      readonly height?: number;
    } = {},
  ): InteractionCoordinates {
    const width = tooltipSize.width ?? this.config.tooltipWidth ?? DEFAULT_CONFIG.tooltipWidth;
    const height = tooltipSize.height ?? this.config.tooltipHeight ?? DEFAULT_CONFIG.tooltipHeight;
    const margin = this.config.tooltipMargin ?? DEFAULT_CONFIG.tooltipMargin;
    const viewportWidth = this.config.viewportWidth ?? DEFAULT_CONFIG.viewportWidth;
    const viewportHeight = this.config.viewportHeight ?? DEFAULT_CONFIG.viewportHeight;

    return {
      x: Math.min(
        viewportWidth - width - margin,
        Math.max(margin, point.x + margin),
      ),
      y: Math.min(
        viewportHeight - height - margin,
        Math.max(margin, point.y + margin),
      ),
    };
  }

  private handleHover(payload: EventManagerPayload): void {
    if (!payload.element || !payload.coordinates) {
      return;
    }

    const element = payload.element;
    const coordinates = payload.coordinates;

    this.clearHoverTimer();
    this.clearHoverStyles();

    const run = () => {
      const target = this.resolveTarget(payload.originalEvent);
      const tooltip = this.buildTooltip(element, coordinates);

      this.hoveredElement = element;
      this.hoveredTarget = target;
      this.tooltip = tooltip;
      this.applyHoverStyles(target);
      this.emit('hover', {
        element,
        coordinates,
        tooltip,
        ...(payload.originalEvent ? { originalEvent: payload.originalEvent } : {}),
      });
    };

    if ((this.config.hoverDelayMs ?? DEFAULT_CONFIG.hoverDelayMs) > 0) {
      this.hoverTimer = setTimeout(run, this.config.hoverDelayMs);
      return;
    }

    run();
  }

  private handleHoverEnd(payload: EventManagerPayload): void {
    this.clearHoverTimer();

    if (!this.hoveredElement) {
      return;
    }

    const endedElement = this.hoveredElement;
    const endedTooltip = this.tooltip;
    const endedCoordinates = payload.coordinates ?? endedTooltip.position;

    this.clearHoverStyles();
    this.hoveredElement = undefined;
    this.hoveredTarget = undefined;
    this.tooltip = {
      visible: false,
      content: '',
      position: endedTooltip.position,
    };

    this.emit('hover-end', {
      element: endedElement,
      coordinates: endedCoordinates,
      tooltip: {
        visible: false,
        content: endedTooltip.content,
        position: endedTooltip.position,
      },
      ...(payload.originalEvent ? { originalEvent: payload.originalEvent } : {}),
    });
  }

  private emit(event: HoverInteractionEvent, payload: HoverInteractionPayload): void {
    const handlers = this.handlers.get(event);

    if (!handlers) {
      return;
    }

    for (const handler of handlers) {
      handler(payload);
    }
  }

  private applyHoverStyles(target: HoverStylableTarget | undefined): void {
    if (!target?.style || !this.config.hoverStyles) {
      return;
    }

    for (const [property, value] of Object.entries(this.config.hoverStyles)) {
      target.style[property] = value;
    }
  }

  private clearHoverStyles(): void {
    if (!this.hoveredTarget?.style || !this.config.hoverStyles) {
      return;
    }

    for (const property of Object.keys(this.config.hoverStyles)) {
      delete this.hoveredTarget.style[property];
    }
  }

  private buildTooltip(
    element: EventManagerElementData,
    coordinates: InteractionCoordinates,
  ): HoverTooltipState {
    const content = this.renderTooltip(element);

    return {
      visible: true,
      content,
      position: this.resolveTooltipPosition(coordinates),
    };
  }

  private renderTooltip(element: EventManagerElementData): string {
    if (this.config.tooltipTemplate) {
      return this.config.tooltipTemplate(element);
    }

    const label = element.properties.label;
    const name = element.properties.name;

    if (typeof label === 'string' && label.length > 0) {
      return label;
    }

    if (typeof name === 'string' && name.length > 0) {
      return name;
    }

    return `${element.type}: ${element.id}`;
  }

  private resolveTarget(originalEvent: unknown): HoverStylableTarget | undefined {
    if (!originalEvent || typeof originalEvent !== 'object') {
      return undefined;
    }

    const target = (originalEvent as { readonly target?: unknown }).target;

    if (!target || typeof target !== 'object') {
      return undefined;
    }

    return target as HoverStylableTarget;
  }

  private clearHoverTimer(): void {
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = undefined;
    }
  }
}
