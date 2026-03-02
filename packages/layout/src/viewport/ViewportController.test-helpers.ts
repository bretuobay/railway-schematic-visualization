import type { ViewportHost } from './ViewportController';

type EventListener = (event: unknown) => void;

export class MockViewportHost implements ViewportHost {
  public readonly clientWidth: number;
  public readonly clientHeight: number;
  private readonly listeners = new Map<string, Set<EventListener>>();

  public constructor(width = 800, height = 600) {
    this.clientWidth = width;
    this.clientHeight = height;
  }

  public addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();

    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  public removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  public getBoundingClientRect(): {
    left: number;
    top: number;
    width: number;
    height: number;
  } {
    return {
      left: 0,
      top: 0,
      width: this.clientWidth,
      height: this.clientHeight,
    };
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
