import type { AnimationScheduler } from '../animation';

export type PerformanceMode = 'quality' | 'balanced' | 'speed';

export interface RenderOptimizerConfig {
  readonly mode?: PerformanceMode;
  readonly debounceMs?: number;
  readonly scheduler?: AnimationScheduler;
  readonly geometryCacheSize?: number;
}

export interface UpdatePatternResult<T> {
  readonly enter: ReadonlyArray<T>;
  readonly update: ReadonlyArray<T>;
  readonly exit: ReadonlyArray<T>;
}

const DEFAULT_CONFIG: Required<Pick<RenderOptimizerConfig, 'mode' | 'debounceMs' | 'geometryCacheSize'>> = {
  mode: 'balanced',
  debounceMs: 16,
  geometryCacheSize: 250,
};

export class RenderOptimizer {
  private readonly scheduler: AnimationScheduler;
  private readonly debounceMs: number;
  private readonly debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly geometryCache = new Map<string, unknown>();
  private mode: PerformanceMode;
  private readonly geometryCacheSize: number;

  public constructor(config: RenderOptimizerConfig = {}) {
    this.scheduler = config.scheduler ?? {
      requestAnimationFrame: (callback) =>
        (typeof globalThis.requestAnimationFrame === 'function'
          ? globalThis.requestAnimationFrame(callback)
          : globalThis.setTimeout(() => callback(Date.now()), 16)) as unknown as number,
      cancelAnimationFrame: (handle) => {
        if (typeof globalThis.cancelAnimationFrame === 'function') {
          globalThis.cancelAnimationFrame(handle);
          return;
        }

        clearTimeout(handle);
      },
      now: () => (typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now()),
    };
    this.mode = config.mode ?? DEFAULT_CONFIG.mode;
    this.debounceMs = config.debounceMs ?? DEFAULT_CONFIG.debounceMs;
    this.geometryCacheSize = config.geometryCacheSize ?? DEFAULT_CONFIG.geometryCacheSize;
  }

  public getPerformanceMode(): PerformanceMode {
    return this.mode;
  }

  public setPerformanceMode(mode: PerformanceMode): void {
    this.mode = mode;
  }

  public scheduleFrame<T>(task: () => T | Promise<T>): Promise<T> {
    return new Promise<T>((resolve) => {
      this.scheduler.requestAnimationFrame(async () => {
        resolve(await task());
      });
    });
  }

  public debounce<T>(
    key: string,
    task: () => T | Promise<T>,
    waitMs = this.debounceMs,
  ): Promise<T> {
    const existingTimer = this.debounceTimers.get(key);

    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    return new Promise<T>((resolve) => {
      const timer = setTimeout(async () => {
        this.debounceTimers.delete(key);
        resolve(await task());
      }, Math.max(0, waitMs));

      this.debounceTimers.set(key, timer);
    });
  }

  public getCachedGeometry<T>(key: string, compute: () => T): T {
    if (this.geometryCache.has(key)) {
      return this.geometryCache.get(key) as T;
    }

    const value = compute();

    this.geometryCache.set(key, value);

    if (this.geometryCache.size > this.geometryCacheSize) {
      const oldestKey = this.geometryCache.keys().next().value;

      if (oldestKey !== undefined) {
        this.geometryCache.delete(oldestKey);
      }
    }

    return value;
  }

  public reconcileUpdatePattern<T>(
    previous: ReadonlyArray<T>,
    next: ReadonlyArray<T>,
  ): UpdatePatternResult<T> {
    const previousSet = new Set(previous);
    const nextSet = new Set(next);

    return {
      enter: next.filter((value) => !previousSet.has(value)),
      update: next.filter((value) => previousSet.has(value)),
      exit: previous.filter((value) => !nextSet.has(value)),
    };
  }

  public async optimizeLayoutChange<T>(task: () => T | Promise<T>): Promise<T> {
    if (this.mode === 'speed') {
      return task();
    }

    if (this.mode === 'quality') {
      return this.debounce('layout-change', task, this.debounceMs * 2);
    }

    return this.scheduleFrame(task);
  }
}
