import {
  CoordinateBridge,
  CoordinateSystemType,
  inverseWebMercator,
  projectWebMercator,
  type Coordinate,
  type GeographicCoordinate,
  type LinearCoordinate,
  type ScreenCoordinate,
} from '@rail-schematic-viz/core';

export { CoordinateSystemType } from '@rail-schematic-viz/core';

export interface SelectionElement {
  readonly id: string;
  readonly coordinate?: Coordinate;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface ResolvedSelectionCoordinates {
  readonly source: Coordinate;
  readonly screen?: ScreenCoordinate;
  readonly geographic?: GeographicCoordinate;
  readonly linear?: LinearCoordinate;
}

export interface SelectionState {
  readonly changedAt: number;
  readonly coordinates: ReadonlyArray<ResolvedSelectionCoordinates>;
  readonly elementIds: ReadonlyArray<string>;
  readonly elements: ReadonlyArray<SelectionElement>;
  readonly sourceViewId?: string;
}

export interface SelectionChangeEvent {
  readonly state: SelectionState;
}

export interface ViewportSyncRequest<TViewport = unknown> {
  readonly coordinateSystem: CoordinateSystemType;
  readonly center?: Coordinate;
  readonly viewport: TViewport;
}

export interface ViewportSyncState<TViewport = unknown> {
  readonly center?: ResolvedSelectionCoordinates;
  readonly changedAt: number;
  readonly coordinateSystem: CoordinateSystemType;
  readonly sourceViewId?: string;
  readonly viewport: TViewport;
}

export interface ViewportChangeEvent<TViewport = unknown> {
  readonly state: ViewportSyncState<TViewport>;
}

export interface SelectionRequest {
  readonly elements: ReadonlyArray<SelectionElement>;
  readonly focalCoordinate?: Coordinate;
}

export interface LinkedView<TViewport = unknown> {
  readonly id: string;
  getCoordinateSystem(): CoordinateSystemType;
  onSelectionChange(event: SelectionChangeEvent): void | Promise<void>;
  onViewportChange(event: ViewportChangeEvent<TViewport>): void | Promise<void>;
}

export interface CoordinateTransformRegistry {
  readonly coordinateBridge?: CoordinateBridge;
  readonly geographicToLinear?: (coordinate: GeographicCoordinate) => LinearCoordinate;
  readonly geographicToScreen?: (coordinate: GeographicCoordinate) => ScreenCoordinate;
  readonly linearToGeographic?: (coordinate: LinearCoordinate) => GeographicCoordinate;
  readonly linearToScreen?: (coordinate: LinearCoordinate) => ScreenCoordinate;
  readonly screenToGeographic?: (coordinate: ScreenCoordinate) => GeographicCoordinate;
  readonly screenToLinear?: (coordinate: ScreenCoordinate) => LinearCoordinate;
}

export interface BrushingLinkingLogger {
  error(message: string, details?: Readonly<Record<string, unknown>>): void;
}

export interface BrushingLinkingCoordinatorOptions {
  readonly logger?: BrushingLinkingLogger;
  readonly transforms?: CoordinateTransformRegistry;
}

export interface BrushingLinkingPackageMetadata {
  readonly packageName: '@rail-schematic-viz/brushing-linking';
  readonly supportsBidirectionalTransforms: true;
}

export interface BrushingLinkingCoordinator<TViewport = unknown> {
  registerView(view: LinkedView<TViewport>): LinkedView<TViewport>;
  unregisterView(id: string): boolean;
  selectElements(
    request: SelectionRequest,
    sourceViewId?: string,
  ): Promise<SelectionState>;
  clearSelection(sourceViewId?: string): Promise<SelectionState>;
  syncViewport(
    request: ViewportSyncRequest<TViewport>,
    sourceViewId?: string,
  ): Promise<ViewportSyncState<TViewport>>;
}

export const PACKAGE_METADATA = {
  packageName: '@rail-schematic-viz/brushing-linking',
  supportsBidirectionalTransforms: true,
} as const satisfies BrushingLinkingPackageMetadata;

export function getPackageMetadata(): BrushingLinkingPackageMetadata {
  return PACKAGE_METADATA;
}

export class BrushingLinkingCoordinatorImpl<TViewport = unknown>
  implements BrushingLinkingCoordinator<TViewport>
{
  private readonly logger: BrushingLinkingLogger;
  private selectionState: SelectionState = {
    changedAt: Date.now(),
    coordinates: [],
    elementIds: [],
    elements: [],
  };
  private readonly transforms: CoordinateTransformRegistry;
  private readonly views = new Map<string, LinkedView<TViewport>>();
  private viewportState: ViewportSyncState<TViewport> | undefined;

  public constructor(options: BrushingLinkingCoordinatorOptions = {}) {
    this.transforms = options.transforms ?? {};
    this.logger = options.logger ?? {
      error: (message, details) => {
        console.error(message, details);
      },
    };
  }

  public registerView(view: LinkedView<TViewport>): LinkedView<TViewport> {
    if (this.views.has(view.id)) {
      throw new Error(`View "${view.id}" is already registered.`);
    }

    this.views.set(view.id, view);

    return view;
  }

  public unregisterView(id: string): boolean {
    return this.views.delete(id);
  }

  public async selectElements(
    request: SelectionRequest,
    sourceViewId?: string,
  ): Promise<SelectionState> {
    const focalCoordinate = request.focalCoordinate
      ?? request.elements.find((element) => element.coordinate)?.coordinate;
    const coordinates = focalCoordinate
      ? [this.resolveCoordinateSet(focalCoordinate)]
      : [];

    this.selectionState = {
      changedAt: Date.now(),
      coordinates,
      elementIds: request.elements.map((element) => element.id),
      elements: request.elements.map(cloneSelectionElement),
      ...(sourceViewId ? { sourceViewId } : {}),
    };

    await this.notifySelectionChange(sourceViewId);

    return this.getSelectionState();
  }

  public async clearSelection(sourceViewId?: string): Promise<SelectionState> {
    this.selectionState = {
      changedAt: Date.now(),
      coordinates: [],
      elementIds: [],
      elements: [],
      ...(sourceViewId ? { sourceViewId } : {}),
    };

    await this.notifySelectionChange(sourceViewId);

    return this.getSelectionState();
  }

  public async syncViewport(
    request: ViewportSyncRequest<TViewport>,
    sourceViewId?: string,
  ): Promise<ViewportSyncState<TViewport>> {
    this.viewportState = {
      changedAt: Date.now(),
      coordinateSystem: request.coordinateSystem,
      viewport: request.viewport,
      ...(request.center ? { center: this.resolveCoordinateSet(request.center) } : {}),
      ...(sourceViewId ? { sourceViewId } : {}),
    };

    await this.notifyViewportChange(sourceViewId);

    return this.getViewportState();
  }

  public getSelectionState(): SelectionState {
    return {
      changedAt: this.selectionState.changedAt,
      coordinates: this.selectionState.coordinates.map(cloneResolvedCoordinates),
      elementIds: [...this.selectionState.elementIds],
      elements: this.selectionState.elements.map(cloneSelectionElement),
      ...(this.selectionState.sourceViewId
        ? { sourceViewId: this.selectionState.sourceViewId }
        : {}),
    };
  }

  public getViewportState(): ViewportSyncState<TViewport> {
    if (!this.viewportState) {
      throw new Error('Viewport state is not initialized.');
    }

    return {
      changedAt: this.viewportState.changedAt,
      coordinateSystem: this.viewportState.coordinateSystem,
      viewport: this.viewportState.viewport,
      ...(this.viewportState.center
        ? { center: cloneResolvedCoordinates(this.viewportState.center) }
        : {}),
      ...(this.viewportState.sourceViewId
        ? { sourceViewId: this.viewportState.sourceViewId }
        : {}),
    };
  }

  public async highlightByGeographicCoordinate(
    coordinate: GeographicCoordinate,
    elementIds: ReadonlyArray<string> = [],
    sourceViewId?: string,
  ): Promise<SelectionState> {
    return this.selectElements(
      {
        elements: elementIds.map((id) => ({
          coordinate,
          id,
        })),
        focalCoordinate: coordinate,
      },
      sourceViewId,
    );
  }

  public async highlightByLinearCoordinate(
    coordinate: LinearCoordinate,
    elementIds: ReadonlyArray<string> = [],
    sourceViewId?: string,
  ): Promise<SelectionState> {
    return this.selectElements(
      {
        elements: elementIds.map((id) => ({
          coordinate,
          id,
        })),
        focalCoordinate: coordinate,
      },
      sourceViewId,
    );
  }

  private async notifySelectionChange(sourceViewId?: string): Promise<void> {
    const event: SelectionChangeEvent = {
      state: this.getSelectionState(),
    };

    await this.notifyViews(sourceViewId, (view) => view.onSelectionChange(event));
  }

  private async notifyViewportChange(sourceViewId?: string): Promise<void> {
    if (!this.viewportState) {
      return;
    }

    const event: ViewportChangeEvent<TViewport> = {
      state: this.getViewportState(),
    };

    await this.notifyViews(sourceViewId, (view) => view.onViewportChange(event));
  }

  private async notifyViews(
    sourceViewId: string | undefined,
    callback: (view: LinkedView<TViewport>) => void | Promise<void>,
  ): Promise<void> {
    for (const view of this.views.values()) {
      if (sourceViewId && view.id === sourceViewId) {
        continue;
      }

      try {
        await callback(view);
      } catch (error) {
        this.logger.error('Linked view notification failed.', {
          cause: error instanceof Error ? error.message : String(error),
          viewId: view.id,
        });
      }
    }
  }

  private resolveCoordinateSet(source: Coordinate): ResolvedSelectionCoordinates {
    const resolved: ResolvedSelectionCoordinates = {
      source,
      ...resolveKnownCoordinates(source),
    };

    if (!resolved.screen) {
      const screen = this.tryTransform(
        'screen',
        source,
        () => this.toScreen(source),
      );

      if (screen) {
        Object.assign(resolved, {
          screen,
        });
      }
    }

    if (!resolved.linear) {
      const linear = this.tryTransform(
        'linear',
        source,
        () => this.toLinear(source, resolved.screen),
      );

      if (linear) {
        Object.assign(resolved, {
          linear,
        });
      }
    }

    if (!resolved.geographic) {
      const geographic = this.tryTransform(
        'geographic',
        source,
        () => this.toGeographic(source, resolved.screen, resolved.linear),
      );

      if (geographic) {
        Object.assign(resolved, {
          geographic,
        });
      }
    }

    return cloneResolvedCoordinates(resolved);
  }

  private tryTransform<TResolved extends Coordinate>(
    target: 'geographic' | 'linear' | 'screen',
    source: Coordinate,
    transform: () => TResolved,
  ): TResolved | undefined {
    try {
      return transform();
    } catch (error) {
      this.logger.error(`Coordinate transform to ${target} failed.`, {
        cause: error instanceof Error ? error.message : String(error),
        sourceType: source.type,
      });

      return undefined;
    }
  }

  private toScreen(
    coordinate: Coordinate,
  ): ScreenCoordinate {
    switch (coordinate.type) {
      case CoordinateSystemType.Screen:
        return coordinate;
      case CoordinateSystemType.Geographic:
        return this.transforms.geographicToScreen
          ? this.transforms.geographicToScreen(coordinate)
          : projectWebMercator(coordinate);
      case CoordinateSystemType.Linear:
        if (this.transforms.linearToScreen) {
          return this.transforms.linearToScreen(coordinate);
        }

        if (this.transforms.coordinateBridge) {
          return this.transforms.coordinateBridge.projectToScreen(coordinate);
        }

        throw new Error('No linear-to-screen transform is available.');
    }
  }

  private toLinear(
    coordinate: Coordinate,
    screenCoordinate?: ScreenCoordinate,
  ): LinearCoordinate {
    switch (coordinate.type) {
      case CoordinateSystemType.Linear:
        return coordinate;
      case CoordinateSystemType.Screen:
        if (this.transforms.screenToLinear) {
          return this.transforms.screenToLinear(coordinate);
        }

        if (this.transforms.coordinateBridge) {
          return this.transforms.coordinateBridge.projectToLinear(coordinate);
        }

        throw new Error('No screen-to-linear transform is available.');
      case CoordinateSystemType.Geographic:
        if (this.transforms.geographicToLinear) {
          return this.transforms.geographicToLinear(coordinate);
        }

        if (screenCoordinate) {
          return this.toLinear(screenCoordinate);
        }

        throw new Error('No geographic-to-linear transform is available.');
    }
  }

  private toGeographic(
    coordinate: Coordinate,
    screenCoordinate?: ScreenCoordinate,
    linearCoordinate?: LinearCoordinate,
  ): GeographicCoordinate {
    switch (coordinate.type) {
      case CoordinateSystemType.Geographic:
        return coordinate;
      case CoordinateSystemType.Screen:
        return this.transforms.screenToGeographic
          ? this.transforms.screenToGeographic(coordinate)
          : inverseWebMercator(coordinate);
      case CoordinateSystemType.Linear:
        if (this.transforms.linearToGeographic) {
          return this.transforms.linearToGeographic(coordinate);
        }

        if (screenCoordinate) {
          return this.toGeographic(screenCoordinate);
        }

        if (linearCoordinate && this.transforms.linearToScreen) {
          return this.toGeographic(this.transforms.linearToScreen(linearCoordinate));
        }

        throw new Error('No linear-to-geographic transform is available.');
    }
  }
}

function resolveKnownCoordinates(
  coordinate: Coordinate,
): Partial<ResolvedSelectionCoordinates> {
  switch (coordinate.type) {
    case CoordinateSystemType.Screen:
      return {
        screen: coordinate,
      };
    case CoordinateSystemType.Geographic:
      return {
        geographic: coordinate,
      };
    case CoordinateSystemType.Linear:
      return {
        linear: coordinate,
      };
  }
}

function cloneSelectionElement(element: SelectionElement): SelectionElement {
  return {
    id: element.id,
    ...(element.coordinate ? { coordinate: cloneCoordinate(element.coordinate) } : {}),
    ...(element.metadata ? { metadata: { ...element.metadata } } : {}),
  };
}

function cloneResolvedCoordinates(
  coordinates: ResolvedSelectionCoordinates,
): ResolvedSelectionCoordinates {
  return {
    source: cloneCoordinate(coordinates.source),
    ...(coordinates.screen ? { screen: cloneCoordinate(coordinates.screen) } : {}),
    ...(coordinates.geographic
      ? { geographic: cloneCoordinate(coordinates.geographic) }
      : {}),
    ...(coordinates.linear ? { linear: cloneCoordinate(coordinates.linear) } : {}),
  } as ResolvedSelectionCoordinates;
}

function cloneCoordinate<TCoordinate extends Coordinate>(
  coordinate: TCoordinate,
): TCoordinate {
  return {
    ...coordinate,
  };
}
