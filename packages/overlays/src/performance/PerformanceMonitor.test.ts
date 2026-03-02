import { describe, expect, it } from 'vitest';

import { PerformanceMonitor } from './PerformanceMonitor';

describe('PerformanceMonitor', () => {
  it('records and aggregates timing metrics', () => {
    const monitor = new PerformanceMonitor();
    const tokenOne = monitor.startMeasure('render', 0);
    const tokenTwo = monitor.startMeasure('render', 10);

    monitor.endMeasure(tokenOne, 20);
    const metric = monitor.endMeasure(tokenTwo, 40);

    expect(metric.count).toBe(2);
    expect(metric.averageMs).toBe(25);
    expect(metric.maxMs).toBe(30);
    expect(metric.minMs).toBe(20);
  });

  it('returns all metrics and supports reset', () => {
    const monitor = new PerformanceMonitor();

    monitor.endMeasure(monitor.startMeasure('render', 0), 10);
    monitor.endMeasure(monitor.startMeasure('update', 0), 20);

    expect(monitor.getAllMetrics()).toHaveLength(2);

    monitor.reset('render');
    expect(monitor.getMetrics('render')).toBeUndefined();

    monitor.reset();
    expect(monitor.getAllMetrics()).toHaveLength(0);
  });
});
