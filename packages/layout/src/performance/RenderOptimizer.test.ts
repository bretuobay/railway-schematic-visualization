import { performance } from 'node:perf_hooks';

import { describe, expect, it, vi } from 'vitest';

import { MockAnimationScheduler } from '../animation/AnimationSystem.test-helpers';
import { RenderOptimizer } from './RenderOptimizer';

describe('RenderOptimizer', () => {
  it('uses requestAnimationFrame scheduling for frame work', async () => {
    const scheduler = new MockAnimationScheduler();
    const optimizer = new RenderOptimizer({ scheduler });
    const task = vi.fn(() => 'done');

    const promise = optimizer.scheduleFrame(task);
    expect(task).not.toHaveBeenCalled();

    scheduler.flush();

    expect(await promise).toBe('done');
    expect(task).toHaveBeenCalledTimes(1);
    expect(scheduler.requestCount).toBeGreaterThanOrEqual(1);
  });

  it('debounces expensive operations during continuous interactions', async () => {
    vi.useFakeTimers();
    const optimizer = new RenderOptimizer({ debounceMs: 10 });
    const first = vi.fn(() => 'first');
    const second = vi.fn(() => 'second');

    const firstPromise = optimizer.debounce('pan', first);
    const secondPromise = optimizer.debounce('pan', second);

    vi.advanceTimersByTime(10);

    expect(await secondPromise).toBe('second');
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledTimes(0);
    await expect(Promise.race([firstPromise, Promise.resolve('pending')])).resolves.toBe('pending');
    vi.useRealTimers();
  });

  it('caches computed geometries', () => {
    const optimizer = new RenderOptimizer({ geometryCacheSize: 2 });
    const compute = vi.fn(() => ({ points: [1, 2, 3] }));

    const first = optimizer.getCachedGeometry('a', compute);
    const second = optimizer.getCachedGeometry('a', compute);

    expect(first).toBe(second);
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('exposes a D3-style update pattern diff', () => {
    const optimizer = new RenderOptimizer();
    const result = optimizer.reconcileUpdatePattern(['a', 'b'], ['b', 'c']);

    expect(result).toEqual({
      enter: ['c'],
      update: ['b'],
      exit: ['a'],
    });
  });

  it('supports configurable performance modes', async () => {
    vi.useFakeTimers();
    const scheduler = new MockAnimationScheduler();
    const optimizer = new RenderOptimizer({ mode: 'speed', scheduler });

    expect(optimizer.getPerformanceMode()).toBe('speed');
    await expect(optimizer.optimizeLayoutChange(() => 'fast')).resolves.toBe('fast');

    optimizer.setPerformanceMode('balanced');
    const balancedPromise = optimizer.optimizeLayoutChange(() => 'balanced');
    scheduler.flush();
    await expect(balancedPromise).resolves.toBe('balanced');

    optimizer.setPerformanceMode('quality');
    const qualityPromise = optimizer.optimizeLayoutChange(() => 'quality');
    vi.advanceTimersByTime(32);
    await expect(qualityPromise).resolves.toBe('quality');
    vi.useRealTimers();
  });

  it('meets the frame and layout benchmark budgets with representative workloads', async () => {
    const scheduler = new MockAnimationScheduler();
    const optimizer = new RenderOptimizer({ scheduler });
    const heavyIds = Array.from({ length: 5000 }, (_, index) => `node-${index}`);
    const beforeFrame = performance.now();

    const framePromise = optimizer.scheduleFrame(() => optimizer.reconcileUpdatePattern([], heavyIds));
    scheduler.flush();
    const frameResult = await framePromise;
    const frameElapsed = performance.now() - beforeFrame;

    const beforeLayout = performance.now();
    const layoutPromise = optimizer.optimizeLayoutChange(() => {
      for (let index = 0; index < 500; index += 1) {
        optimizer.getCachedGeometry(`edge-${index}`, () => ({ index, points: [index, index + 1] }));
      }

      return 'layout-done';
    });
    scheduler.flush();
    const layoutResult = await layoutPromise;
    const layoutElapsed = performance.now() - beforeLayout;

    expect(frameResult.enter).toHaveLength(5000);
    expect(frameElapsed).toBeLessThan(1000 / 60);
    expect(layoutResult).toBe('layout-done');
    expect(layoutElapsed).toBeLessThan(500);
  });
});
