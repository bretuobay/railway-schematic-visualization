import { describe, expect, it, vi } from 'vitest';

import {
  AnimationSystem,
  animationEasings,
  interpolateAnimationValue,
  type AnimationViewportTransform,
} from './AnimationSystem';
import { MockAnimationScheduler } from './AnimationSystem.test-helpers';

describe('AnimationSystem', () => {
  it('animates scalar values over time', async () => {
    const scheduler = new MockAnimationScheduler();
    const system = new AnimationSystem({ scheduler });
    const applied: number[] = [];

    const handle = system.animate<number>({
      from: 0,
      to: 100,
      duration: 100,
      easing: 'linear',
      apply: (value) => {
        applied.push(value);
      },
    });

    scheduler.advanceBy(50);
    expect(applied.at(-1)).toBe(50);

    scheduler.advanceBy(50);
    const result = await handle.promise;

    expect(result).toBe(100);
    expect(applied.at(-1)).toBe(100);
  });

  it('supports custom easing and interpolation helpers', async () => {
    const scheduler = new MockAnimationScheduler();
    const system = new AnimationSystem({ scheduler });
    const applied: number[] = [];

    const handle = system.animate<number>({
      from: 0,
      to: 100,
      duration: 100,
      easing: (progress) => progress * progress,
      apply: (value) => {
        applied.push(value);
      },
    });

    scheduler.advanceBy(50);
    expect(applied.at(-1)).toBe(25);
    expect(animationEasings.easeOutCubic(1)).toBe(1);
    expect(interpolateAnimationValue({ x: 0, y: 0 }, { x: 10, y: 20 }, 0.5)).toEqual({
      x: 5,
      y: 10,
    });

    scheduler.advanceBy(50);
    await handle.promise;
  });

  it('animates viewport transforms', async () => {
    const scheduler = new MockAnimationScheduler();
    const system = new AnimationSystem({ scheduler });
    const applied: AnimationViewportTransform[] = [];

    const handle = system.animateViewportTransition({
      getCurrent: () => ({ x: 0, y: 0, scale: 1 }),
      to: { x: 40, y: -20, scale: 2 },
      duration: 100,
      easing: 'linear',
      apply: (value) => {
        applied.push(value);
      },
    });

    scheduler.advanceBy(50);
    expect(applied.at(-1)).toEqual({ x: 20, y: -10, scale: 1.5 });

    scheduler.advanceBy(50);
    const result = await handle.promise;

    expect(result).toEqual({ x: 40, y: -20, scale: 2 });
  });

  it('animates layout transitions across node position maps', async () => {
    const scheduler = new MockAnimationScheduler();
    const system = new AnimationSystem({ scheduler });
    const applied: Array<Record<string, { x: number; y: number }>> = [];

    const handle = system.animateLayoutTransition({
      from: {
        alpha: { x: 0, y: 0 },
        beta: { x: 10, y: 10 },
      },
      to: {
        alpha: { x: 100, y: 50 },
        gamma: { x: 25, y: 75 },
      },
      duration: 100,
      easing: 'linear',
      apply: (value) => {
        applied.push(value);
      },
    });

    scheduler.advanceBy(50);
    expect(applied.at(-1)).toEqual({
      alpha: { x: 50, y: 25 },
      beta: { x: 10, y: 10 },
      gamma: { x: 25, y: 75 },
    });

    scheduler.advanceBy(50);
    await handle.promise;
  });

  it('animates LOD transitions', async () => {
    const scheduler = new MockAnimationScheduler();
    const system = new AnimationSystem({ scheduler });
    const applied: number[] = [];

    const handle = system.animateLODTransition({
      from: 0,
      to: 1,
      duration: 100,
      easing: 'linear',
      apply: (value) => {
        applied.push(value);
      },
    });

    scheduler.advanceBy(25);
    scheduler.advanceBy(25);
    expect(applied.at(-1)).toBe(0.5);

    scheduler.flush(25);
    expect(await handle.promise).toBe(1);
  });

  it('uses requestAnimationFrame scheduling for enabled animations', async () => {
    const scheduler = new MockAnimationScheduler();
    const system = new AnimationSystem({ scheduler });

    const handle = system.animate<number>({
      from: 0,
      to: 1,
      duration: 32,
    });

    expect(scheduler.requestCount).toBeGreaterThanOrEqual(1);
    scheduler.flush(16);
    await handle.promise;
  });

  it('completes immediately when animations are disabled', async () => {
    const scheduler = new MockAnimationScheduler();
    const system = new AnimationSystem({
      scheduler,
      enabled: false,
    });
    const onStart = vi.fn();
    const onProgress = vi.fn();
    const onComplete = vi.fn();
    const applied: number[] = [];

    const handle = system.animate<number>({
      from: 0,
      to: 10,
      duration: 100,
      apply: (value) => {
        applied.push(value);
      },
      onStart,
      onProgress,
      onComplete,
    });

    expect(scheduler.requestCount).toBe(0);
    expect(await handle.promise).toBe(10);
    expect(applied).toEqual([10]);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('supports cancel and cancelAll', async () => {
    const scheduler = new MockAnimationScheduler();
    const system = new AnimationSystem({ scheduler });
    const onCancel = vi.fn();

    const first = system.animate<number>({
      from: 0,
      to: 100,
      duration: 100,
      onCancel,
    });
    const second = system.animate<number>({
      from: 10,
      to: 20,
      duration: 100,
    });

    expect(first.cancel()).toBe(true);
    expect(onCancel).toHaveBeenCalledWith(0);
    expect(await first.promise).toBe(0);
    expect(system.cancelAll()).toBe(1);
    expect(await second.promise).toBe(10);
    expect(scheduler.cancelCount).toBeGreaterThanOrEqual(2);
  });
});
