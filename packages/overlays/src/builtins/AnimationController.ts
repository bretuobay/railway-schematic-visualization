export interface AnimationConfig {
  readonly id?: string;
  readonly durationMs: number;
  readonly loop?: boolean;
  readonly speed?: number;
  readonly onFrame: (progress: number, state: AnimationState) => void;
  readonly onComplete?: () => void;
}

export interface AnimationState {
  readonly id: string;
  readonly status: 'running' | 'paused' | 'stopped';
  readonly elapsedMs: number;
  readonly speed: number;
  readonly iteration: number;
  readonly progress: number;
}

export interface AnimationScheduler {
  request(callback: (timestamp: number) => void): number;
  cancel(handle: number): void;
}

interface AnimationRecord {
  readonly config: AnimationConfig;
  state: AnimationState;
  lastTimestamp: number | undefined;
}

export class AnimationController {
  private readonly scheduler: AnimationScheduler | undefined;
  private readonly animations = new Map<string, AnimationRecord>();
  private rafHandle: number | undefined;
  private counter = 0;

  public constructor(scheduler?: AnimationScheduler) {
    this.scheduler =
      scheduler
      ?? (typeof globalThis.requestAnimationFrame === 'function'
        && typeof globalThis.cancelAnimationFrame === 'function'
        ? {
            request: (callback) => globalThis.requestAnimationFrame(callback),
            cancel: (handle) => globalThis.cancelAnimationFrame(handle),
          }
        : undefined);
  }

  public start(config: AnimationConfig): string {
    const id = config.id ?? `animation-${++this.counter}`;
    const record: AnimationRecord = {
      config,
      state: {
        id,
        status: 'running',
        elapsedMs: 0,
        speed: config.speed ?? 1,
        iteration: 0,
        progress: 0,
      },
      lastTimestamp: undefined,
    };

    this.animations.set(id, record);
    this.ensureLoop();

    return id;
  }

  public stop(id?: string): void {
    if (id) {
      this.animations.delete(id);
    } else {
      this.animations.clear();
    }

    if (this.animations.size === 0) {
      this.cancelLoop();
    }
  }

  public pause(id?: string): void {
    this.updateStatus('paused', id);
  }

  public resume(id?: string): void {
    this.updateStatus('running', id);
    this.ensureLoop();
  }

  public setSpeed(speed: number, id?: string): void {
    const nextSpeed = Number.isFinite(speed) && speed > 0 ? speed : 1;

    for (const record of this.records(id)) {
      record.state = {
        ...record.state,
        speed: nextSpeed,
      };
    }
  }

  public tick(timestamp = Date.now()): void {
    for (const [id, record] of [...this.animations]) {
      if (record.state.status !== 'running') {
        record.lastTimestamp = timestamp;
        continue;
      }

      const lastTimestamp = record.lastTimestamp ?? timestamp;
      const deltaMs = Math.max(0, timestamp - lastTimestamp);
      const nextElapsedMs = record.state.elapsedMs + deltaMs * record.state.speed;
      const durationMs = Math.max(1, record.config.durationMs);
      const rawProgress = nextElapsedMs / durationMs;
      const progress = Math.min(rawProgress, 1);
      const nextIteration =
        rawProgress >= 1
          ? record.state.iteration + 1
          : record.state.iteration;

      record.state = {
        ...record.state,
        elapsedMs: rawProgress >= 1 && record.config.loop ? 0 : Math.min(nextElapsedMs, durationMs),
        iteration: nextIteration,
        progress: record.config.loop ? progress % 1 : progress,
      };
      record.lastTimestamp = timestamp;

      record.config.onFrame(record.state.progress, record.state);

      if (rawProgress < 1) {
        continue;
      }

      if (record.config.loop) {
        continue;
      }

      record.config.onComplete?.();
      this.animations.delete(id);
    }

    if (this.animations.size === 0) {
      this.cancelLoop();
    }
  }

  public getState(id: string): AnimationState | undefined {
    return this.animations.get(id)?.state;
  }

  public getActiveAnimationIds(): ReadonlyArray<string> {
    return [...this.animations.keys()];
  }

  private ensureLoop(): void {
    if (!this.scheduler || this.rafHandle !== undefined || this.animations.size === 0) {
      return;
    }

    this.rafHandle = this.scheduler.request((timestamp) => {
      this.rafHandle = undefined;
      this.tick(timestamp);

      if (this.animations.size > 0) {
        this.ensureLoop();
      }
    });
  }

  private cancelLoop(): void {
    if (this.scheduler && this.rafHandle !== undefined) {
      this.scheduler.cancel(this.rafHandle);
    }

    this.rafHandle = undefined;
  }

  private updateStatus(status: 'running' | 'paused', id?: string): void {
    for (const record of this.records(id)) {
      record.state = {
        ...record.state,
        status,
      };
    }
  }

  private records(id?: string): Array<AnimationRecord> {
    if (id) {
      const record = this.animations.get(id);

      return record ? [record] : [];
    }

    return [...this.animations.values()];
  }
}
