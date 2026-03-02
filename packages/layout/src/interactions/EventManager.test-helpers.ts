import type {
  InteractionElementLike,
  InteractionRootLike,
} from './EventManager';

type RootListener = (event: unknown) => void;

export class MockInteractionRoot implements InteractionRootLike {
  private readonly listeners = new Map<string, Set<RootListener>>();

  public addEventListener(type: string, listener: RootListener): void {
    const listeners = this.listeners.get(type) ?? new Set<RootListener>();

    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  public removeEventListener(type: string, listener: RootListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  public dispatch(type: string, event: unknown): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }

  public listenerCount(type: string): number {
    return this.listeners.get(type)?.size ?? 0;
  }
}

export interface MockInteractionElementInit {
  readonly elementId?: string;
  readonly elementType?: string;
  readonly elementProps?: string;
  readonly customProps?: string;
  readonly overlayFor?: string;
  readonly underlyingType?: string;
  readonly parentElement?: MockInteractionElement | null;
}

export class MockInteractionElement implements InteractionElementLike {
  public readonly dataset: Record<string, string | undefined>;
  public readonly parentElement: MockInteractionElement | null;

  public constructor(init: MockInteractionElementInit = {}) {
    this.dataset = {
      elementId: init.elementId,
      elementType: init.elementType,
      elementProps: init.elementProps,
      customProps: init.customProps,
      overlayFor: init.overlayFor,
      underlyingType: init.underlyingType,
    };
    this.parentElement = init.parentElement ?? null;
  }

  public getAttribute(name: string): string | null {
    const key = name
      .replace(/^data-/, '')
      .replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

    return this.dataset[key] ?? null;
  }
}
