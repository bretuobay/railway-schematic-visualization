import type {
  EdgeId,
  NodeId,
  RailGraph,
  ScreenCoordinate,
} from '@rail-schematic-viz/core';

import type {
  LayoutConfiguration,
  LayoutStrategy,
  LayoutValidationResult,
  LayoutWarning,
} from './LayoutStrategy';
import { ProportionalLayout } from './ProportionalLayout';

export interface CompressedLayoutOptions {
  readonly compressionStrength?: number;
  readonly minSeparation?: number;
}

export class CompressedLayout implements LayoutStrategy {
  public readonly name = 'compressed';
  public readonly warnings: LayoutWarning[] = [];
  private readonly compressionStrength: number;
  private readonly minSeparation: number;

  public constructor(options: CompressedLayoutOptions = {}) {
    this.compressionStrength = options.compressionStrength ?? 50;
    this.minSeparation = options.minSeparation ?? 24;
  }

  public async computePositions(
    graph: RailGraph,
    config: LayoutConfiguration,
  ): Promise<ReadonlyMap<NodeId, ScreenCoordinate>> {
    const proportional = new ProportionalLayout({ scaleFactor: 1 });
    const basePositions = await proportional.computePositions(graph, config);
    this.warnings.length = 0;
    this.warnings.push(...proportional.warnings);
    const compressedPositions = new Map<NodeId, ScreenCoordinate>();
    const nodeEntries = Array.from(basePositions.entries());
    const orientation = config.orientation === 'vertical' ? 'vertical' : 'horizontal';
    let previousMainAxis = config.padding;

    for (const [index, [nodeId, coordinate]] of nodeEntries.entries()) {
      if (index === 0) {
        compressedPositions.set(nodeId, coordinate);
        previousMainAxis = orientation === 'vertical' ? coordinate.y : coordinate.x;
        continue;
      }

      const previous = nodeEntries[index - 1]![1];
      const rawLength =
        orientation === 'vertical'
          ? Math.abs(coordinate.y - previous.y)
          : Math.abs(coordinate.x - previous.x);
      const compressedLength = Math.max(
        this.minSeparation,
        this.compressionStrength *
          Math.log(1 + rawLength / Math.max(this.compressionStrength, 1)),
      );
      previousMainAxis += compressedLength;

      compressedPositions.set(nodeId, {
        type: coordinate.type,
        x: orientation === 'vertical' ? coordinate.x : previousMainAxis,
        y: orientation === 'vertical' ? previousMainAxis : coordinate.y,
      });
    }

    return compressedPositions;
  }

  public computeGeometries(
    graph: RailGraph,
    positions: ReadonlyMap<NodeId, ScreenCoordinate>,
  ): ReadonlyMap<EdgeId, ReadonlyArray<ScreenCoordinate>> {
    return new ProportionalLayout().computeGeometries(graph, positions);
  }

  public validate(graph: RailGraph): LayoutValidationResult {
    return new ProportionalLayout().validate(graph);
  }
}
