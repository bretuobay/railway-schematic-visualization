import {
  AnnotationOverlay,
  HeatMapOverlay,
  RangeBandOverlay,
  TimeSeriesOverlay,
  TrafficFlowOverlay,
} from '../builtins';
import { RegistryError } from '../errors';
import type { OverlayFactory, OverlayFactoryOptions, RailOverlay } from '../types';
import { isRailOverlay } from '../types';

const BUILT_IN_FACTORIES = new Map<string, OverlayFactory<unknown, any>>([
  ['heat-map', (options) => new HeatMapOverlay(options as never)],
  ['annotation', (options) => new AnnotationOverlay(options as never)],
  ['range-band', (options) => new RangeBandOverlay(options as never)],
  ['traffic-flow', (options) => new TrafficFlowOverlay(options as never)],
  ['time-series', (options) => new TimeSeriesOverlay(options as never)],
]);

export class OverlayRegistry {
  private readonly factories = new Map<string, OverlayFactory<unknown, any>>();

  public constructor() {
    for (const [type, factory] of BUILT_IN_FACTORIES) {
      this.factories.set(type, factory);
    }
  }

  public register(type: string, factory: OverlayFactory): void {
    const normalizedType = this.normalizeType(type);

    if (this.factories.has(normalizedType)) {
      throw new RegistryError('Overlay type is already registered.', {
        type: normalizedType,
      });
    }

    if (typeof factory !== 'function') {
      throw new RegistryError('Overlay factory must be a function.', {
        type: normalizedType,
      });
    }

    this.factories.set(normalizedType, factory);
  }

  public unregister(type: string): boolean {
    const normalizedType = this.normalizeType(type);

    if (BUILT_IN_FACTORIES.has(normalizedType)) {
      return false;
    }

    return this.factories.delete(normalizedType);
  }

  public create<TData = unknown>(
    type: string,
    options?: OverlayFactoryOptions<TData>,
  ): RailOverlay<TData> {
    const normalizedType = this.normalizeType(type);
    const factory = this.factories.get(normalizedType);

    if (!factory) {
      throw new RegistryError('Overlay type is not registered.', {
        type: normalizedType,
      });
    }

    const overlay = factory(options);

    if (!isRailOverlay(overlay)) {
      throw new RegistryError('Overlay factory must return a RailOverlay implementation.', {
        type: normalizedType,
      });
    }

    return overlay as RailOverlay<TData>;
  }

  public has(type: string): boolean {
    return this.factories.has(this.normalizeType(type));
  }

  public listTypes(): ReadonlyArray<string> {
    return [...this.factories.keys()].sort((left, right) => left.localeCompare(right));
  }

  private normalizeType(type: string): string {
    const normalizedType = type.trim();

    if (normalizedType.length === 0) {
      throw new RegistryError('Overlay type is required.');
    }

    return normalizedType;
  }
}
