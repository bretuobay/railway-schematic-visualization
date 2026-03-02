import type { AnimationScheduler } from './AnimationSystem';

type FrameCallback = (timestamp: number) => void;

export class MockAnimationScheduler implements AnimationScheduler {
  public currentTime = 0;
  public requestCount = 0;
  public cancelCount = 0;
  private nextHandle = 0;
  private readonly callbacks = new Map<number, FrameCallback>();

  public requestAnimationFrame(callback: FrameCallback): number {
    this.nextHandle += 1;
    this.requestCount += 1;
    this.callbacks.set(this.nextHandle, callback);

    return this.nextHandle;
  }

  public cancelAnimationFrame(handle: number): void {
    this.cancelCount += 1;
    this.callbacks.delete(handle);
  }

  public now(): number {
    return this.currentTime;
  }

  public hasPendingFrames(): boolean {
    return this.callbacks.size > 0;
  }

  public advanceBy(milliseconds: number): void {
    this.currentTime += milliseconds;
    const callbacks = Array.from(this.callbacks.entries());

    this.callbacks.clear();

    for (const [, callback] of callbacks) {
      callback(this.currentTime);
    }
  }

  public flush(stepMs = 16, maxIterations = 100): void {
    let iterations = 0;

    while (this.hasPendingFrames() && iterations < maxIterations) {
      this.advanceBy(stepMs);
      iterations += 1;
    }
  }
}
