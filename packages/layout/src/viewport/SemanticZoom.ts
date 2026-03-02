import type {
  ViewportController,
  ViewportEventPayload,
} from './ViewportController';

export type LODLevel = 'low-detail' | 'mid-detail' | 'high-detail';

export type SemanticElementType =
  | 'tracks'
  | 'stations'
  | 'junctions'
  | 'station-labels'
  | 'signals'
  | 'mileposts'
  | 'annotations';

export interface SemanticZoomConfig {
  readonly midDetailThreshold?: number;
  readonly highDetailThreshold?: number;
  readonly visibilityRules?: Readonly<Record<string, LODLevel>>;
  readonly controller?: Pick<ViewportController, 'getTransform' | 'on' | 'off'>;
}

export interface LODChangePayload {
  readonly previousLOD: LODLevel;
  readonly lod: LODLevel;
  readonly scale: number;
}

export type SemanticZoomEvent = 'lod-change';

type SemanticZoomHandler = (payload: LODChangePayload) => void;

const DEFAULT_THRESHOLDS: {
  readonly midDetailThreshold: number;
  readonly highDetailThreshold: number;
} = {
  midDetailThreshold: 1.5,
  highDetailThreshold: 3,
};

const LOD_RANK: Record<LODLevel, number> = {
  'low-detail': 0,
  'mid-detail': 1,
  'high-detail': 2,
};

const DEFAULT_VISIBILITY_RULES: Readonly<Record<SemanticElementType, LODLevel>> = {
  tracks: 'low-detail',
  stations: 'low-detail',
  junctions: 'low-detail',
  'station-labels': 'mid-detail',
  signals: 'mid-detail',
  mileposts: 'high-detail',
  annotations: 'high-detail',
};

export class SemanticZoom {
  private readonly handlers = new Map<SemanticZoomEvent, Set<SemanticZoomHandler>>();
  private readonly controller: SemanticZoomConfig['controller'];
  private readonly controllerZoomHandler: ((payload: ViewportEventPayload) => void) | undefined;
  private readonly visibilityRules: Record<string, LODLevel>;
  private readonly midDetailThreshold: number;
  private readonly highDetailThreshold: number;
  private currentLOD: LODLevel = 'low-detail';

  public constructor(config: SemanticZoomConfig = {}) {
    const normalizedThresholds = this.normalizeThresholds(
      config.midDetailThreshold,
      config.highDetailThreshold,
    );

    this.midDetailThreshold = normalizedThresholds.midDetailThreshold;
    this.highDetailThreshold = normalizedThresholds.highDetailThreshold;
    this.visibilityRules = {
      ...DEFAULT_VISIBILITY_RULES,
      ...config.visibilityRules,
    };
    this.controller = config.controller;

    if (this.controller) {
      this.controllerZoomHandler = (payload) => {
        this.updateLOD(payload.transform.scale);
      };

      this.controller.on('zoom', this.controllerZoomHandler);
      this.updateLOD(this.controller.getTransform().scale);
    }
  }

  public destroy(): void {
    if (this.controller && this.controllerZoomHandler) {
      this.controller.off('zoom', this.controllerZoomHandler);
    }
  }

  public on(event: SemanticZoomEvent, handler: SemanticZoomHandler): void {
    const handlers = this.handlers.get(event) ?? new Set<SemanticZoomHandler>();

    handlers.add(handler);
    this.handlers.set(event, handlers);
  }

  public off(event: SemanticZoomEvent, handler: SemanticZoomHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  public getLOD(): LODLevel {
    return this.currentLOD;
  }

  public getThresholds(): {
    readonly midDetailThreshold: number;
    readonly highDetailThreshold: number;
  } {
    return {
      midDetailThreshold: this.midDetailThreshold,
      highDetailThreshold: this.highDetailThreshold,
    };
  }

  public updateLOD(scale: number): LODLevel {
    const lod = this.resolveLOD(scale);

    if (lod === this.currentLOD) {
      return lod;
    }

    const previousLOD = this.currentLOD;

    this.currentLOD = lod;
    this.emit('lod-change', {
      previousLOD,
      lod,
      scale,
    });

    return lod;
  }

  public isVisible(elementType: string, scale?: number): boolean {
    const activeLOD = scale === undefined ? this.currentLOD : this.resolveLOD(scale);
    const minimumLOD = this.visibilityRules[elementType] ?? 'low-detail';

    return LOD_RANK[activeLOD] >= LOD_RANK[minimumLOD];
  }

  public getVisibilityMap(scale?: number): Readonly<Record<string, boolean>> {
    const entries = Object.keys(this.visibilityRules).map((elementType) => [
      elementType,
      this.isVisible(elementType, scale),
    ] as const);

    return Object.fromEntries(entries);
  }

  private resolveLOD(scale: number): LODLevel {
    if (scale < this.midDetailThreshold) {
      return 'low-detail';
    }

    if (scale < this.highDetailThreshold) {
      return 'mid-detail';
    }

    return 'high-detail';
  }

  private emit(event: SemanticZoomEvent, payload: LODChangePayload): void {
    const handlers = this.handlers.get(event);

    if (!handlers) {
      return;
    }

    for (const handler of handlers) {
      handler(payload);
    }
  }

  private normalizeThresholds(
    midDetailThreshold = DEFAULT_THRESHOLDS.midDetailThreshold,
    highDetailThreshold = DEFAULT_THRESHOLDS.highDetailThreshold,
  ): {
    readonly midDetailThreshold: number;
    readonly highDetailThreshold: number;
  } {
    const normalizedMid = Math.max(0, Math.min(midDetailThreshold, highDetailThreshold));
    const normalizedHigh = Math.max(normalizedMid, highDetailThreshold);

    return {
      midDetailThreshold: normalizedMid,
      highDetailThreshold: normalizedHigh,
    };
  }
}
