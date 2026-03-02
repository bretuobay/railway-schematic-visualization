export type ARIAPriority = 'polite' | 'assertive';

export interface ARIAElementLike {
  setAttribute?(name: string, value: string): void;
  getAttribute?(name: string): string | null;
}

export interface ARIALiveRegionState {
  readonly priority: ARIAPriority;
  readonly message: string;
  readonly updatedAt: number | null;
}

export interface ARIAManagerConfig {
  readonly selectionMessageBuilder?: (selection: ReadonlyArray<string>) => string;
  readonly zoomMessageBuilder?: (scale: number) => string;
}

const DEFAULT_LIVE_REGION: Record<ARIAPriority, ARIALiveRegionState> = {
  polite: {
    priority: 'polite',
    message: '',
    updatedAt: null,
  },
  assertive: {
    priority: 'assertive',
    message: '',
    updatedAt: null,
  },
};

export class ARIAManager {
  private readonly config: ARIAManagerConfig;
  private liveRegions: Record<ARIAPriority, ARIALiveRegionState> = { ...DEFAULT_LIVE_REGION };

  public constructor(config: ARIAManagerConfig = {}) {
    this.config = config;
  }

  public setRole(element: ARIAElementLike, role: string): void {
    element.setAttribute?.('role', role);
  }

  public setLabel(element: ARIAElementLike, label: string): void {
    element.setAttribute?.('aria-label', label);
  }

  public setDescription(element: ARIAElementLike, description: string): void {
    element.setAttribute?.('aria-description', description);
  }

  public announce(message: string, priority: ARIAPriority = 'polite'): ARIALiveRegionState {
    const nextState: ARIALiveRegionState = {
      priority,
      message,
      updatedAt: Date.now(),
    };

    this.liveRegions = {
      ...this.liveRegions,
      [priority]: nextState,
    };

    return nextState;
  }

  public announceSelectionChange(selection: ReadonlyArray<string>): ARIALiveRegionState {
    const message = this.config.selectionMessageBuilder?.(selection)
      ?? (selection.length === 0
        ? 'Selection cleared'
        : `Selected ${selection.length} element${selection.length === 1 ? '' : 's'}`);

    return this.announce(message, 'polite');
  }

  public announceZoomLevel(scale: number): ARIALiveRegionState {
    const percentage = Math.round(Math.max(0, scale) * 100);
    const message = this.config.zoomMessageBuilder?.(scale) ?? `Zoom level ${percentage}%`;

    return this.announce(message, 'polite');
  }

  public getLiveRegion(priority: ARIAPriority): ARIALiveRegionState {
    return { ...this.liveRegions[priority] };
  }
}
