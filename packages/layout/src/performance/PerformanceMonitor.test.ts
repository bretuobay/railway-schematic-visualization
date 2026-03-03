import { performance } from 'node:perf_hooks';

import { describe, expect, it, vi } from 'vitest';

import { PerformanceMonitor } from './PerformanceMonitor';

describe('PerformanceMonitor', () => {
  it('tracks frame timings and dropped frames', () => {
    const monitor = new PerformanceMonitor({
      frameTimeThresholdMs: 10,
    });

    monitor.recordFrameTime(8, {
      renderedElements: 400,
      culledElements: 120,
    });
    monitor.recordFrameTime(12);

    const metrics = monitor.getMetrics();

    expect(metrics.frameTimeMs).toBe(12);
    expect(metrics.averageFrameTimeMs).toBe(10);
    expect(metrics.totalFrames).toBe(2);
    expect(metrics.droppedFrames).toBe(1);
    expect(metrics.renderedElements).toBe(400);
    expect(metrics.culledElements).toBe(120);
  });

  it('tracks layout timings and averages', () => {
    const monitor = new PerformanceMonitor();

    monitor.recordLayoutTime(100);
    monitor.recordLayoutTime(300);

    const metrics = monitor.getMetrics();

    expect(metrics.layoutTimeMs).toBe(300);
    expect(metrics.averageLayoutTimeMs).toBe(200);
    expect(metrics.totalLayouts).toBe(2);
  });

  it('tracks rendered and culled element counts directly', () => {
    const monitor = new PerformanceMonitor();

    monitor.recordRenderedElements(1200);
    monitor.recordCulledElements(875);

    const metrics = monitor.getMetrics();

    expect(metrics.renderedElements).toBe(1200);
    expect(metrics.culledElements).toBe(875);
  });

  it('returns a defensive metrics snapshot', () => {
    const monitor = new PerformanceMonitor();

    monitor.recordFrameTime(16);
    const metrics = monitor.getMetrics();
    const mutated = {
      ...metrics,
      frameTimeMs: 0,
    };

    expect(mutated.frameTimeMs).toBe(0);
    expect(monitor.getMetrics().frameTimeMs).toBe(16);
  });

  it('emits threshold events for slow frames and slow layouts', () => {
    const onFrameThreshold = vi.fn();
    const onLayoutThreshold = vi.fn();
    const monitor = new PerformanceMonitor({
      frameTimeThresholdMs: 12,
      layoutTimeThresholdMs: 50,
    });

    monitor.on('frame-threshold', onFrameThreshold);
    monitor.on('layout-threshold', onLayoutThreshold);
    monitor.recordFrameTime(14);
    monitor.recordLayoutTime(60);

    expect(onFrameThreshold).toHaveBeenCalledTimes(1);
    expect(onLayoutThreshold).toHaveBeenCalledTimes(1);
  });

  it('supports enable and disable without blocking measured work', async () => {
    const monitor = new PerformanceMonitor({
      enabled: false,
    });

    monitor.recordFrameTime(40);
    expect(monitor.getMetrics().totalFrames).toBe(0);

    const result = await monitor.measureFrame(async () => 'disabled-result');
    expect(result).toBe('disabled-result');
    expect(monitor.getMetrics().totalFrames).toBe(0);

    monitor.setEnabled(true);
    await monitor.measureFrame(async () => 'enabled-result');

    expect(monitor.isEnabled()).toBe(true);
    expect(monitor.getMetrics().totalFrames).toBe(1);
  });

  it('measures frame and layout tasks', async () => {
    const monitor = new PerformanceMonitor();

    const frameResult = await monitor.measureFrame(async () => 'frame', {
      renderedElements: 20,
      culledElements: 10,
    });
    const layoutResult = await monitor.measureLayout(async () => 'layout');
    const metrics = monitor.getMetrics();

    expect(frameResult).toBe('frame');
    expect(layoutResult).toBe('layout');
    expect(metrics.totalFrames).toBe(1);
    expect(metrics.totalLayouts).toBe(1);
    expect(metrics.renderedElements).toBe(20);
    expect(metrics.culledElements).toBe(10);
  });

  it('keeps instrumentation overhead below the required threshold', () => {
    const monitor = new PerformanceMonitor();
    const startedAt = performance.now();

    for (let index = 0; index < 500; index += 1) {
      monitor.recordFrameTime(16, {
        renderedElements: 5000,
        culledElements: 1200,
      });
      monitor.recordLayoutTime(100);
    }

    const elapsedMs = performance.now() - startedAt;
    const metrics = monitor.getMetrics();

    expect(elapsedMs).toBeLessThan(250);
    expect(metrics.monitoringOverheadRatio).toBeLessThan(0.05);
  });
});
