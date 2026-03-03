export interface MeasureToken {
  readonly name: string;
  readonly startedAt: number;
}

export interface OverlayMetric {
  readonly name: string;
  readonly count: number;
  readonly totalMs: number;
  readonly averageMs: number;
  readonly minMs: number;
  readonly maxMs: number;
  readonly lastMs: number;
}

interface MutableMetric {
  count: number;
  totalMs: number;
  minMs: number;
  maxMs: number;
  lastMs: number;
}

export class PerformanceMonitor {
  private readonly metrics = new Map<string, MutableMetric>();

  public startMeasure(name: string, startedAt = Date.now()): MeasureToken {
    return { name, startedAt };
  }

  public endMeasure(token: MeasureToken, endedAt = Date.now()): OverlayMetric {
    const durationMs = Math.max(0, endedAt - token.startedAt);
    const metric = this.metrics.get(token.name) ?? {
      count: 0,
      totalMs: 0,
      minMs: Number.POSITIVE_INFINITY,
      maxMs: 0,
      lastMs: 0,
    };

    metric.count += 1;
    metric.totalMs += durationMs;
    metric.minMs = Math.min(metric.minMs, durationMs);
    metric.maxMs = Math.max(metric.maxMs, durationMs);
    metric.lastMs = durationMs;
    this.metrics.set(token.name, metric);

    return this.getMetrics(token.name)!;
  }

  public getMetrics(name: string): OverlayMetric | undefined {
    const metric = this.metrics.get(name);

    if (!metric) {
      return undefined;
    }

    return {
      name,
      count: metric.count,
      totalMs: metric.totalMs,
      averageMs: metric.count === 0 ? 0 : metric.totalMs / metric.count,
      minMs: metric.count === 0 ? 0 : metric.minMs,
      maxMs: metric.maxMs,
      lastMs: metric.lastMs,
    };
  }

  public getAllMetrics(): ReadonlyArray<OverlayMetric> {
    return [...this.metrics.keys()]
      .sort((left, right) => left.localeCompare(right))
      .map((name) => this.getMetrics(name)!)
      .filter(Boolean);
  }

  public reset(name?: string): void {
    if (name) {
      this.metrics.delete(name);
      return;
    }

    this.metrics.clear();
  }
}
