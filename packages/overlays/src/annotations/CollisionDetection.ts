import type { OverlayBounds } from '../types';

export interface AnnotationLabel {
  readonly id: string;
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly priority?: number;
  readonly fontSize?: number;
}

export interface AdjustedPosition {
  readonly x: number;
  readonly y: number;
  readonly hidden: boolean;
  readonly clusterWith?: string;
  readonly leaderLine?: {
    readonly fromX: number;
    readonly fromY: number;
    readonly toX: number;
    readonly toY: number;
  };
}

export interface CollisionConfig {
  readonly strategy?: 'adjust' | 'hide' | 'cluster';
  readonly padding?: number;
  readonly maxAdjustmentSteps?: number;
}

export interface CollisionResult {
  readonly id: string;
  readonly bounds: OverlayBounds;
  readonly position: AdjustedPosition;
}

function intersects(left: OverlayBounds, right: OverlayBounds): boolean {
  return !(
    left.maxX <= right.minX ||
    left.minX >= right.maxX ||
    left.maxY <= right.minY ||
    left.minY >= right.maxY
  );
}

const DEFAULT_CONFIG: Required<CollisionConfig> = {
  strategy: 'adjust',
  padding: 8,
  maxAdjustmentSteps: 12,
};

export class CollisionDetection {
  public detect(
    labels: ReadonlyArray<AnnotationLabel>,
    config: CollisionConfig = {},
  ): ReadonlyArray<CollisionResult> {
    return this.resolveCollisions(labels, config);
  }

  public computeBoundingBox(
    label: Pick<AnnotationLabel, 'text' | 'x' | 'y' | 'fontSize'>,
    padding = DEFAULT_CONFIG.padding,
  ): OverlayBounds {
    const fontSize = label.fontSize ?? 12;
    const width = Math.max(fontSize, label.text.length * fontSize * 0.6);
    const height = fontSize * 1.2;

    return {
      minX: label.x - padding,
      minY: label.y - height - padding,
      maxX: label.x + width + padding,
      maxY: label.y + padding,
    };
  }

  public resolveCollisions(
    labels: ReadonlyArray<AnnotationLabel>,
    config: CollisionConfig = {},
  ): ReadonlyArray<CollisionResult> {
    const resolvedConfig = {
      ...DEFAULT_CONFIG,
      ...config,
    };
    const placements: CollisionResult[] = [];
    const indexedLabels = labels.map((label, index) => ({ label, index }));

    indexedLabels
      .sort(
        (left, right) =>
          (right.label.priority ?? 0) - (left.label.priority ?? 0) || left.index - right.index,
      )
      .forEach(({ label }) => {
        const nextPlacement = this.placeLabel(label, placements, resolvedConfig);
        placements.push(nextPlacement);
      });

    return labels
      .map((label) => placements.find((placement) => placement.id === label.id))
      .filter((placement): placement is CollisionResult => placement !== undefined);
  }

  private placeLabel(
    label: AnnotationLabel,
    placements: ReadonlyArray<CollisionResult>,
    config: Required<CollisionConfig>,
  ): CollisionResult {
    const initialBounds = this.computeBoundingBox(label, config.padding);
    const collision = placements.find((placement) => intersects(initialBounds, placement.bounds));

    if (!collision) {
      return {
        id: label.id,
        bounds: initialBounds,
        position: {
          x: label.x,
          y: label.y,
          hidden: false,
        },
      };
    }

    switch (config.strategy) {
      case 'hide':
        return {
          id: label.id,
          bounds: initialBounds,
          position: {
            x: label.x,
            y: label.y,
            hidden: true,
          },
        };
      case 'cluster':
        return {
          id: label.id,
          bounds: initialBounds,
          position: {
            x: label.x,
            y: label.y,
            hidden: true,
            clusterWith: collision.id,
          },
        };
      case 'adjust':
      default:
        return this.adjustPlacement(label, placements, config);
    }
  }

  private adjustPlacement(
    label: AnnotationLabel,
    placements: ReadonlyArray<CollisionResult>,
    config: Required<CollisionConfig>,
  ): CollisionResult {
    const offsets: ReadonlyArray<readonly [number, number]> = [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ];

    for (let step = 1; step <= config.maxAdjustmentSteps; step += 1) {
      for (const offset of offsets) {
        const candidateX = label.x + offset[0] * config.padding * step;
        const candidateY = label.y + offset[1] * config.padding * step;
        const candidateBounds = this.computeBoundingBox(
          {
            ...label,
            x: candidateX,
            y: candidateY,
          },
          config.padding,
        );
        const hasCollision = placements.some((placement) =>
          intersects(candidateBounds, placement.bounds),
        );

        if (!hasCollision) {
          return {
            id: label.id,
            bounds: candidateBounds,
            position: {
              x: candidateX,
              y: candidateY,
              hidden: false,
              leaderLine: {
                fromX: label.x,
                fromY: label.y,
                toX: candidateX,
                toY: candidateY,
              },
            },
          };
        }
      }
    }

    const hiddenBounds = this.computeBoundingBox(label, config.padding);

    return {
      id: label.id,
      bounds: hiddenBounds,
      position: {
        x: label.x,
        y: label.y,
        hidden: true,
      },
    };
  }
}
