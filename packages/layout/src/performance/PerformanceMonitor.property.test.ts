import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';

import { PerformanceMonitor } from './PerformanceMonitor';

describe('PerformanceMonitor properties', () => {
  it('tracks frame, layout, rendered, and culled metrics consistently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            frameTimeMs: fc.float({ min: 0, max: 1000, noNaN: true }),
            layoutTimeMs: fc.float({ min: 0, max: 5000, noNaN: true }),
            renderedElements: fc.integer({ min: 0, max: 10000 }),
            culledElements: fc.integer({ min: 0, max: 10000 }),
          }),
          { minLength: 1, maxLength: 20 },
        ),
        async (samples) => {
          const monitor = new PerformanceMonitor();

          for (const sample of samples) {
            monitor.recordFrameTime(sample.frameTimeMs, {
              renderedElements: sample.renderedElements,
              culledElements: sample.culledElements,
            });
            monitor.recordLayoutTime(sample.layoutTimeMs);
          }

          const metrics = monitor.getMetrics();
          const expectedAverageFrame =
            samples.reduce((sum, sample) => sum + sample.frameTimeMs, 0) / samples.length;
          const expectedAverageLayout =
            samples.reduce((sum, sample) => sum + sample.layoutTimeMs, 0) / samples.length;
          const lastSample = samples.at(-1);

          expect(metrics.totalFrames).toBe(samples.length);
          expect(metrics.totalLayouts).toBe(samples.length);
          expect(metrics.averageFrameTimeMs).toBeCloseTo(expectedAverageFrame, 5);
          expect(metrics.averageLayoutTimeMs).toBeCloseTo(expectedAverageLayout, 5);
          expect(metrics.renderedElements).toBe(lastSample?.renderedElements ?? 0);
          expect(metrics.culledElements).toBe(lastSample?.culledElements ?? 0);
          expect(metrics.monitoringOverheadRatio).toBeGreaterThanOrEqual(0);
        },
      ),
    );
  });

  it('emits threshold events when recorded durations exceed configured thresholds', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.double({ min: 0.1, max: 100, noNaN: true }),
        fc.double({ min: 0.1, max: 100, noNaN: true }),
        async (frameThresholdMs, overshoot) => {
          const onThreshold = vi.fn();
          const monitor = new PerformanceMonitor({
            frameTimeThresholdMs: frameThresholdMs,
          });

          monitor.on('frame-threshold', onThreshold);
          monitor.recordFrameTime(frameThresholdMs + overshoot);

          expect(onThreshold).toHaveBeenCalledTimes(1);
          expect(onThreshold).toHaveBeenCalledWith({
            event: 'frame-threshold',
            metrics: expect.objectContaining({
              frameTimeMs: frameThresholdMs + overshoot,
            }),
            observedMs: frameThresholdMs + overshoot,
            thresholdMs: frameThresholdMs,
          });
        },
      ),
    );
  });
});
