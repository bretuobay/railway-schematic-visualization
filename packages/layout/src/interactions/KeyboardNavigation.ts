import type { EventManager, InteractionRootLike } from './EventManager';
import type { SelectionEngine } from './SelectionEngine';

export type NavigationDirection = 'up' | 'down' | 'left' | 'right';
export type KeyboardNavigationEvent = 'focus-change' | 'activate';

export interface KeyboardNavigableTarget {
  readonly style?: Record<string, string>;
}

export interface KeyboardNavigableElement {
  readonly id: string;
  readonly type: string;
  readonly target?: KeyboardNavigableTarget;
  readonly position?: {
    readonly x: number;
    readonly y: number;
  };
}

export interface KeyboardNavigationConfig {
  readonly root?: Pick<InteractionRootLike, 'addEventListener' | 'removeEventListener'>;
  readonly eventManager?: Pick<EventManager, 'emit'>;
  readonly selectionEngine?: Pick<SelectionEngine, 'clearSelection'>;
  readonly focusStyles?: Readonly<Record<string, string>>;
  readonly focusColor?: string;
  readonly backgroundColor?: string;
}

export interface FocusChangePayload {
  readonly focusedId: string | null;
  readonly previousFocusedId: string | null;
}

export interface ActivationPayload {
  readonly focusedId: string;
}

type KeyboardNavigationHandler =
  | ((payload: FocusChangePayload) => void)
  | ((payload: ActivationPayload) => void);

interface RegisteredElement {
  readonly id: string;
  readonly type: string;
  readonly target?: KeyboardNavigableTarget;
  readonly position?: {
    readonly x: number;
    readonly y: number;
  };
}

type KeyboardEventLike = {
  readonly key?: string;
  readonly shiftKey?: boolean;
  preventDefault?: () => void;
};

const DEFAULT_FOCUS_STYLES: Readonly<Record<string, string>> = {
  outline: '2px solid #0b57d0',
  outlineOffset: '2px',
};

const DEFAULT_FOCUS_COLOR = '#0b57d0';
const DEFAULT_BACKGROUND_COLOR = '#ffffff';

export class KeyboardNavigation {
  private readonly config: KeyboardNavigationConfig;
  private readonly handlers = new Map<
    KeyboardNavigationEvent,
    Set<KeyboardNavigationHandler>
  >();
  private readonly elements = new Map<string, RegisteredElement>();
  private readonly order: Array<string> = [];
  private readonly adjacency = new Map<string, Set<string>>();
  private readonly keydownListener: ((event: unknown) => void) | undefined;
  private focusedId: string | null = null;

  public constructor(config: KeyboardNavigationConfig = {}) {
    this.config = config;

    if (config.root) {
      this.keydownListener = (event) => {
        this.handleKeyDown(event as KeyboardEventLike);
      };

      config.root.addEventListener?.('keydown', this.keydownListener);
    }
  }

  public destroy(): void {
    if (this.config.root && this.keydownListener) {
      this.config.root.removeEventListener?.('keydown', this.keydownListener);
    }
  }

  public on(event: 'focus-change', handler: (payload: FocusChangePayload) => void): void;
  public on(event: 'activate', handler: (payload: ActivationPayload) => void): void;
  public on(event: KeyboardNavigationEvent, handler: KeyboardNavigationHandler): void {
    const handlers = this.handlers.get(event) ?? new Set<KeyboardNavigationHandler>();

    handlers.add(handler);
    this.handlers.set(event, handlers);
  }

  public off(event: KeyboardNavigationEvent, handler: KeyboardNavigationHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  public registerElement(element: KeyboardNavigableElement): void {
    if (!this.elements.has(element.id)) {
      this.order.push(element.id);
    }

    this.elements.set(
      element.id,
      element.target || element.position
        ? {
            id: element.id,
            type: element.type,
            ...(element.target ? { target: element.target } : {}),
            ...(element.position ? { position: element.position } : {}),
          }
        : {
            id: element.id,
            type: element.type,
          },
    );
  }

  public connectElements(
    sourceId: string,
    targetId: string,
    bidirectional = true,
  ): void {
    const sourceNeighbors = this.adjacency.get(sourceId) ?? new Set<string>();

    sourceNeighbors.add(targetId);
    this.adjacency.set(sourceId, sourceNeighbors);

    if (!bidirectional) {
      return;
    }

    const targetNeighbors = this.adjacency.get(targetId) ?? new Set<string>();

    targetNeighbors.add(sourceId);
    this.adjacency.set(targetId, targetNeighbors);
  }

  public getFocusedId(): string | null {
    return this.focusedId;
  }

  public getFocusStyles(): Readonly<Record<string, string>> {
    return this.config.focusStyles ?? DEFAULT_FOCUS_STYLES;
  }

  public getContrastRatio(): number {
    return contrastRatio(
      this.config.focusColor ?? DEFAULT_FOCUS_COLOR,
      this.config.backgroundColor ?? DEFAULT_BACKGROUND_COLOR,
    );
  }

  public focus(id: string): string | null {
    if (!this.elements.has(id)) {
      return this.focusedId;
    }

    const previousFocusedId = this.focusedId;

    if (previousFocusedId === id) {
      return this.focusedId;
    }

    this.clearFocusStyles(previousFocusedId);
    this.focusedId = id;
    this.applyFocusStyles(id);
    this.emit('focus-change', {
      focusedId: id,
      previousFocusedId,
    });
    this.config.eventManager?.emit('focus-change', {
      element: {
        id,
        type: this.elements.get(id)!.type,
        properties: {},
        isOverlay: false,
      },
    });

    return this.focusedId;
  }

  public clearFocus(): void {
    if (!this.focusedId) {
      return;
    }

    const previousFocusedId = this.focusedId;

    this.clearFocusStyles(previousFocusedId);
    this.focusedId = null;
    this.emit('focus-change', {
      focusedId: null,
      previousFocusedId,
    });
  }

  public focusNext(): string | null {
    if (this.order.length === 0) {
      return this.focusedId;
    }

    if (!this.focusedId) {
      return this.focus(this.order[0]!);
    }

    const currentIndex = this.order.indexOf(this.focusedId);
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % this.order.length;

    return this.focus(this.order[nextIndex]!);
  }

  public focusPrevious(): string | null {
    if (this.order.length === 0) {
      return this.focusedId;
    }

    if (!this.focusedId) {
      return this.focus(this.order[this.order.length - 1]!);
    }

    const currentIndex = this.order.indexOf(this.focusedId);
    const previousIndex =
      currentIndex < 0
        ? this.order.length - 1
        : (currentIndex - 1 + this.order.length) % this.order.length;

    return this.focus(this.order[previousIndex]!);
  }

  public navigate(direction: NavigationDirection): string | null {
    if (!this.focusedId) {
      return this.focusNext();
    }

    const nextId = this.findDirectionalNeighbor(this.focusedId, direction);

    if (!nextId) {
      return this.focusedId;
    }

    return this.focus(nextId);
  }

  public activateFocused(): string | null {
    if (!this.focusedId) {
      return null;
    }

    this.emit('activate', {
      focusedId: this.focusedId,
    });

    return this.focusedId;
  }

  public handleKeyDown(event: KeyboardEventLike): string | null {
    const key = event.key ?? '';

    switch (key) {
      case 'Tab':
        event.preventDefault?.();
        return event.shiftKey ? this.focusPrevious() : this.focusNext();
      case 'ArrowUp':
        event.preventDefault?.();
        return this.navigate('up');
      case 'ArrowDown':
        event.preventDefault?.();
        return this.navigate('down');
      case 'ArrowLeft':
        event.preventDefault?.();
        return this.navigate('left');
      case 'ArrowRight':
        event.preventDefault?.();
        return this.navigate('right');
      case 'Enter':
      case ' ':
      case 'Spacebar':
        event.preventDefault?.();
        return this.activateFocused();
      case 'Escape':
        event.preventDefault?.();
        this.config.selectionEngine?.clearSelection();
        this.clearFocus();
        return this.focusedId;
      default:
        return this.focusedId;
    }
  }

  private findDirectionalNeighbor(
    sourceId: string,
    direction: NavigationDirection,
  ): string | null {
    const source = this.elements.get(sourceId);
    const neighborIds = Array.from(this.adjacency.get(sourceId) ?? []);

    if (!source || neighborIds.length === 0) {
      return null;
    }

    const sourcePosition = source.position;

    if (!sourcePosition) {
      return neighborIds[0] ?? null;
    }

    const candidates = neighborIds
      .map((id) => this.elements.get(id))
      .filter((element): element is RegisteredElement => Boolean(element))
      .filter((element) => isDirectionalMatch(sourcePosition, element.position, direction))
      .sort((left, right) => {
        const leftDistance = directionalDistance(sourcePosition, left.position, direction);
        const rightDistance = directionalDistance(sourcePosition, right.position, direction);

        return leftDistance - rightDistance;
      });

    return candidates[0]?.id ?? (neighborIds[0] ?? null);
  }

  private applyFocusStyles(id: string): void {
    const target = this.elements.get(id)?.target;
    const styles = this.getFocusStyles();

    if (!target?.style) {
      return;
    }

    for (const [property, value] of Object.entries(styles)) {
      target.style[property] = value;
    }
  }

  private clearFocusStyles(id: string | null): void {
    if (!id) {
      return;
    }

    const target = this.elements.get(id)?.target;
    const styles = this.getFocusStyles();

    if (!target?.style) {
      return;
    }

    for (const property of Object.keys(styles)) {
      delete target.style[property];
    }
  }

  private emit(event: 'focus-change', payload: FocusChangePayload): void;
  private emit(event: 'activate', payload: ActivationPayload): void;
  private emit(
    event: KeyboardNavigationEvent,
    payload: FocusChangePayload | ActivationPayload,
  ): void {
    const handlers = this.handlers.get(event);

    if (!handlers) {
      return;
    }

    for (const handler of handlers) {
      (handler as (payload: FocusChangePayload | ActivationPayload) => void)(payload);
    }
  }
}

function isDirectionalMatch(
  source: { readonly x: number; readonly y: number },
  target:
    | {
        readonly x: number;
        readonly y: number;
      }
    | undefined,
  direction: NavigationDirection,
): boolean {
  if (!target) {
    return false;
  }

  switch (direction) {
    case 'up':
      return target.y < source.y;
    case 'down':
      return target.y > source.y;
    case 'left':
      return target.x < source.x;
    case 'right':
      return target.x > source.x;
  }
}

function directionalDistance(
  source: { readonly x: number; readonly y: number },
  target:
    | {
        readonly x: number;
        readonly y: number;
      }
    | undefined,
  direction: NavigationDirection,
): number {
  if (!target) {
    return Number.POSITIVE_INFINITY;
  }

  switch (direction) {
    case 'up':
    case 'down':
      return Math.abs(target.y - source.y) * 1000 + Math.abs(target.x - source.x);
    case 'left':
    case 'right':
      return Math.abs(target.x - source.x) * 1000 + Math.abs(target.y - source.y);
  }
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(parseHexColor(foreground));
  const backgroundLuminance = relativeLuminance(parseHexColor(background));
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function parseHexColor(color: string): { readonly r: number; readonly g: number; readonly b: number } {
  const normalized = color.replace('#', '');
  const value = normalized.length === 3
    ? normalized
        .split('')
        .map((part) => `${part}${part}`)
        .join('')
    : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    return { r: 0, g: 0, b: 0 };
  }

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function relativeLuminance(color: { readonly r: number; readonly g: number; readonly b: number }): number {
  const channels = [color.r, color.g, color.b].map((channel) => {
    const normalized = channel / 255;

    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

export const keyboardNavigationInternals = {
  contrastRatio,
};
