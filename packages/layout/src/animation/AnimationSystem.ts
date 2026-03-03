export type AnimationId = string;

export type AnimationEasingName = 'linear' | 'easeInOutQuad' | 'easeOutCubic';
export type AnimationEasingFunction = (progress: number) => number;

export interface AnimationScheduler {
  requestAnimationFrame(callback: (timestamp: number) => void): number;
  cancelAnimationFrame(handle: number): void;
  now(): number;
}

export interface AnimationProgress<T> {
  readonly value: T;
  readonly progress: number;
  readonly easedProgress: number;
}

export interface AnimationCallbacks<T> {
  readonly onStart?: (value: T) => void;
  readonly onProgress?: (progress: AnimationProgress<T>) => void;
  readonly onComplete?: (value: T) => void;
  readonly onCancel?: (value: T) => void;
}

export interface AnimationDefinition<T> extends AnimationCallbacks<T> {
  readonly from: T;
  readonly to: T;
  readonly duration?: number;
  readonly easing?: AnimationEasingName | AnimationEasingFunction;
  readonly interpolate?: (from: T, to: T, progress: number) => T;
  readonly apply?: (value: T) => void;
}

export interface AnimationHandle<T> {
  readonly id: AnimationId;
  readonly promise: Promise<T>;
  cancel(): boolean;
}

export interface AnimationSystemConfig {
  readonly enabled?: boolean;
  readonly defaultDuration?: number;
  readonly defaultEasing?: AnimationEasingName | AnimationEasingFunction;
  readonly scheduler?: AnimationScheduler;
}

export interface AnimationViewportTransform {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

export interface AnimationViewportDefinition extends AnimationCallbacks<AnimationViewportTransform> {
  readonly from?: AnimationViewportTransform;
  readonly to: AnimationViewportTransform;
  readonly duration?: number;
  readonly easing?: AnimationEasingName | AnimationEasingFunction;
  readonly getCurrent?: () => AnimationViewportTransform;
  readonly apply: (value: AnimationViewportTransform) => void;
}

export interface AnimationPoint {
  readonly x: number;
  readonly y: number;
}

export type LayoutTransitionState = Readonly<Record<string, AnimationPoint>>;

export interface LayoutTransitionDefinition extends AnimationCallbacks<LayoutTransitionState> {
  readonly from: LayoutTransitionState;
  readonly to: LayoutTransitionState;
  readonly duration?: number;
  readonly easing?: AnimationEasingName | AnimationEasingFunction;
  readonly apply: (value: LayoutTransitionState) => void;
}

export interface LODTransitionDefinition extends AnimationCallbacks<number> {
  readonly from: number;
  readonly to: number;
  readonly duration?: number;
  readonly easing?: AnimationEasingName | AnimationEasingFunction;
  readonly apply: (value: number) => void;
}

const DEFAULT_CONFIG: Required<Pick<AnimationSystemConfig, 'enabled' | 'defaultDuration'>> = {
  enabled: true,
  defaultDuration: 200,
};

export const animationEasings: Readonly<Record<AnimationEasingName, AnimationEasingFunction>> = {
  linear: (progress) => progress,
  easeInOutQuad: (progress) =>
    progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2,
  easeOutCubic: (progress) => 1 - Math.pow(1 - progress, 3),
};

export class AnimationSystem {
  private readonly scheduler: AnimationScheduler;
  private readonly defaultDuration: number;
  private readonly defaultEasing: AnimationEasingName | AnimationEasingFunction;
  private enabled: boolean;
  private nextId = 0;
  private readonly activeAnimations = new Map<AnimationId, () => boolean>();

  public constructor(config: AnimationSystemConfig = {}) {
    this.scheduler = config.scheduler ?? createDefaultScheduler();
    this.defaultDuration = normalizeDuration(config.defaultDuration ?? DEFAULT_CONFIG.defaultDuration);
    this.defaultEasing = config.defaultEasing ?? 'easeInOutQuad';
    this.enabled = config.enabled ?? DEFAULT_CONFIG.enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public animate<T>(definition: AnimationDefinition<T>): AnimationHandle<T> {
    const id = this.createId();
    const duration = normalizeDuration(definition.duration ?? this.defaultDuration);
    const easing = resolveEasing(definition.easing ?? this.defaultEasing);
    const interpolate = definition.interpolate ?? ((from: T, to: T, progress: number) =>
      interpolateAnimationValue(from, to, progress));
    const onStart = definition.onStart;
    const onProgress = definition.onProgress;
    const onComplete = definition.onComplete;
    const onCancel = definition.onCancel;
    let resolvePromise!: (value: T) => void;
    const promise = new Promise<T>((resolve) => {
      resolvePromise = resolve;
    });
    let frameHandle: number | null = null;
    let currentValue = definition.from;
    const complete = (value: T) => {
      if (!this.activeAnimations.has(id)) {
        return;
      }

      this.activeAnimations.delete(id);
      onComplete?.(value);
      resolvePromise(value);
    };
    const cancelActive = () => {
      if (!this.activeAnimations.has(id)) {
        return false;
      }

      if (frameHandle !== null) {
        this.scheduler.cancelAnimationFrame(frameHandle);
      }

      this.activeAnimations.delete(id);
      onCancel?.(currentValue);
      resolvePromise(currentValue);

      return true;
    };

    this.activeAnimations.set(id, cancelActive);
    onStart?.(definition.from);

    if (!this.enabled || duration === 0) {
      const finalValue = interpolate(definition.from, definition.to, 1);

      definition.apply?.(finalValue);
      currentValue = finalValue;
      onProgress?.({
        value: finalValue,
        progress: 1,
        easedProgress: 1,
      });
      complete(finalValue);

      return {
        id,
        promise,
        cancel: () => false,
      };
    }

    const startedAt = this.scheduler.now();
    const step = (timestamp: number) => {
      if (!this.activeAnimations.has(id)) {
        return;
      }

      const elapsed = Math.max(0, timestamp - startedAt);
      const progress = clampUnit(duration === 0 ? 1 : elapsed / duration);
      const easedProgress = clampUnit(easing(progress));
      const nextValue = interpolate(definition.from, definition.to, easedProgress);

      currentValue = nextValue;
      definition.apply?.(nextValue);
      onProgress?.({
        value: nextValue,
        progress,
        easedProgress,
      });

      if (progress >= 1) {
        complete(nextValue);
        return;
      }

      frameHandle = this.scheduler.requestAnimationFrame(step);
    };

    frameHandle = this.scheduler.requestAnimationFrame(step);

    return {
      id,
      promise,
      cancel: () => this.cancel(id),
    };
  }

  public animateViewportTransition(
    definition: AnimationViewportDefinition,
  ): AnimationHandle<AnimationViewportTransform> {
    const from = definition.from ?? definition.getCurrent?.() ?? definition.to;

    return this.animate<AnimationViewportTransform>(buildAnimationDefinition({
      from,
      to: definition.to,
      apply: definition.apply,
    }, definition));
  }

  public animateLayoutTransition(
    definition: LayoutTransitionDefinition,
  ): AnimationHandle<LayoutTransitionState> {
    return this.animate<LayoutTransitionState>(buildAnimationDefinition({
      from: normalizeLayoutState(definition.from, definition.to),
      to: normalizeLayoutState(definition.to, definition.from),
      apply: definition.apply,
    }, definition));
  }

  public animateLODTransition(
    definition: LODTransitionDefinition,
  ): AnimationHandle<number> {
    return this.animate<number>(buildAnimationDefinition({
      from: definition.from,
      to: definition.to,
      apply: definition.apply,
    }, definition));
  }

  public cancel(id: AnimationId): boolean {
    const cancelActive = this.activeAnimations.get(id);

    if (!cancelActive) {
      return false;
    }

    return cancelActive();
  }

  public cancelAll(): number {
    const ids = Array.from(this.activeAnimations.keys());

    for (const id of ids) {
      this.cancel(id);
    }

    return ids.length;
  }
  private createId(): AnimationId {
    this.nextId += 1;

    return `animation-${this.nextId}`;
  }
}

export function interpolateAnimationValue<T>(
  from: T,
  to: T,
  progress: number,
): T {
  return interpolateUnknown(from, to, clampUnit(progress)) as T;
}

function interpolateUnknown(from: unknown, to: unknown, progress: number): unknown {
  if (typeof from === 'number' && typeof to === 'number') {
    return from + (to - from) * progress;
  }

  if (Array.isArray(from) && Array.isArray(to)) {
    const length = Math.max(from.length, to.length);

    return Array.from({ length }, (_, index) => {
      const fromValue = from[index];
      const toValue = to[index];

      if (fromValue === undefined) {
        return progress < 1 ? undefined : toValue;
      }

      if (toValue === undefined) {
        return progress < 1 ? fromValue : undefined;
      }

      return interpolateUnknown(fromValue, toValue, progress);
    });
  }

  if (isRecord(from) && isRecord(to)) {
    const keys = new Set([...Object.keys(from), ...Object.keys(to)]);
    const result: Record<string, unknown> = {};

    for (const key of keys) {
      const fromValue = from[key];
      const toValue = to[key];

      if (fromValue === undefined) {
        result[key] = progress < 1 ? undefined : toValue;
        continue;
      }

      if (toValue === undefined) {
        result[key] = progress < 1 ? fromValue : undefined;
        continue;
      }

      result[key] = interpolateUnknown(fromValue, toValue, progress);
    }

    return result;
  }

  return progress < 1 ? from : to;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveEasing(
  easing: AnimationEasingName | AnimationEasingFunction,
): AnimationEasingFunction {
  if (typeof easing === 'function') {
    return easing;
  }

  return animationEasings[easing] ?? animationEasings.easeInOutQuad;
}

function normalizeLayoutState(
  primary: LayoutTransitionState,
  fallback: LayoutTransitionState,
): LayoutTransitionState {
  const keys = new Set([...Object.keys(primary), ...Object.keys(fallback)]);
  const result: Record<string, AnimationPoint> = {};

  for (const key of keys) {
    result[key] = primary[key] ?? fallback[key] ?? { x: 0, y: 0 };
  }

  return result;
}

function buildAnimationDefinition<T>(
  base: Pick<AnimationDefinition<T>, 'from' | 'to'> & Partial<Pick<AnimationDefinition<T>, 'apply'>>,
  source: Partial<Omit<AnimationDefinition<T>, 'from' | 'to' | 'apply'>> & Partial<Pick<AnimationDefinition<T>, 'apply'>>,
): AnimationDefinition<T> {
  return {
    ...base,
    ...(source.duration !== undefined ? { duration: source.duration } : {}),
    ...(source.easing !== undefined ? { easing: source.easing } : {}),
    ...(source.interpolate !== undefined ? { interpolate: source.interpolate } : {}),
    ...(source.onStart !== undefined ? { onStart: source.onStart } : {}),
    ...(source.onProgress !== undefined ? { onProgress: source.onProgress } : {}),
    ...(source.onComplete !== undefined ? { onComplete: source.onComplete } : {}),
    ...(source.onCancel !== undefined ? { onCancel: source.onCancel } : {}),
  };
}

function normalizeDuration(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return value;
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

function createDefaultScheduler(): AnimationScheduler {
  return {
    requestAnimationFrame: (callback) => {
      if (typeof globalThis.requestAnimationFrame === 'function') {
        return globalThis.requestAnimationFrame(callback);
      }

      return globalThis.setTimeout(() => callback(nowMs()), 16) as unknown as number;
    },
    cancelAnimationFrame: (handle) => {
      if (typeof globalThis.cancelAnimationFrame === 'function') {
        globalThis.cancelAnimationFrame(handle);
        return;
      }

      clearTimeout(handle);
    },
    now: () => nowMs(),
  };
}

function nowMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }

  return Date.now();
}
