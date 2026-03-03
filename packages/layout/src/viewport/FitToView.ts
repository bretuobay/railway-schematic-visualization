import {
  expandBoundingBox,
  mergeBoundingBoxes,
  type BoundingBox,
} from '../spatial';

import {
  type ViewportTransform,
  type ViewportTransitionOptions,
  ViewportController,
} from './ViewportController';

export interface FitToViewConfig {
  readonly padding?: number;
  readonly minWorldSpan?: number;
}

const DEFAULT_CONFIG: Required<FitToViewConfig> = {
  padding: 24,
  minWorldSpan: 1,
};

export class FitToView {
  private readonly controller: ViewportController;
  private readonly config: Required<FitToViewConfig>;

  public constructor(
    controller: ViewportController,
    config: FitToViewConfig = {},
  ) {
    this.controller = controller;
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  public async fitToView(
    bounds: BoundingBox | ReadonlyArray<BoundingBox>,
    options: ViewportTransitionOptions = {},
  ): Promise<ViewportTransform> {
    const resolvedBounds = this.resolveBounds(bounds);

    if (!resolvedBounds) {
      return this.controller.getTransform();
    }

    return this.applyFit(resolvedBounds, options);
  }

  public async fitSelection(
    selection: ReadonlyArray<BoundingBox>,
    options: ViewportTransitionOptions = {},
  ): Promise<ViewportTransform> {
    if (selection.length === 0) {
      return this.controller.getTransform();
    }

    return this.applyFit(mergeBoundingBoxes(selection), options);
  }

  private async applyFit(
    targetBounds: BoundingBox,
    options: ViewportTransitionOptions,
  ): Promise<ViewportTransform> {
    const { width, height } = this.getViewportSize();
    const padding = this.config.padding;
    const availableWidth = Math.max(1, width - padding * 2);
    const availableHeight = Math.max(1, height - padding * 2);
    const worldWidth = Math.max(
      this.config.minWorldSpan,
      targetBounds.maxX - targetBounds.minX,
    );
    const worldHeight = Math.max(
      this.config.minWorldSpan,
      targetBounds.maxY - targetBounds.minY,
    );
    const requestedScale = Math.min(
      availableWidth / worldWidth,
      availableHeight / worldHeight,
    );
    const zoomOptions = this.resolvePhaseOptions(options);

    await this.controller.zoomTo(requestedScale, zoomOptions);

    const { scale } = this.controller.getTransform();
    const x =
      padding +
      (availableWidth - worldWidth * scale) / 2 -
      targetBounds.minX * scale;
    const y =
      padding +
      (availableHeight - worldHeight * scale) / 2 -
      targetBounds.minY * scale;

    return this.controller.panTo(x, y, this.resolvePhaseOptions(options));
  }

  private resolveBounds(
    bounds: BoundingBox | ReadonlyArray<BoundingBox>,
  ): BoundingBox | undefined {
    if (Array.isArray(bounds)) {
      if (bounds.length === 0) {
        return undefined;
      }

      return mergeBoundingBoxes(bounds);
    }

    return bounds as BoundingBox;
  }

  private getViewportSize(): { width: number; height: number } {
    const visibleBounds = this.controller.getVisibleBounds();
    const transform = this.controller.getTransform();

    return {
      width: Math.max(
        1,
        (visibleBounds.maxX - visibleBounds.minX) * transform.scale,
      ),
      height: Math.max(
        1,
        (visibleBounds.maxY - visibleBounds.minY) * transform.scale,
      ),
    };
  }

  private resolvePhaseOptions(
    options: ViewportTransitionOptions,
  ): ViewportTransitionOptions {
    if (!options.animated) {
      return options;
    }

    if (options.duration === undefined) {
      return { animated: true };
    }

    return {
      animated: true,
      duration: Math.max(1, Math.ceil(options.duration / 2)),
    };
  }
}

export function fitBoundsWithPadding(
  bounds: BoundingBox,
  paddingInWorldUnits: number,
): BoundingBox {
  return expandBoundingBox(bounds, paddingInWorldUnits);
}
