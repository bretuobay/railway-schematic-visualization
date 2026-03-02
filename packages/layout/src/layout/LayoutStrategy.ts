import type {
  EdgeId,
  NodeId,
  RailGraph,
  ScreenCoordinate,
} from '@rail-schematic-viz/core';

export interface LayoutWarning {
  readonly message: string;
  readonly edgeId?: EdgeId;
}

export interface LayoutConfiguration {
  readonly padding: number;
  readonly orientation: 'horizontal' | 'vertical' | 'auto';
  readonly overlapThreshold: number;
  readonly manualOverrides?: ReadonlyMap<NodeId, ScreenCoordinate>;
}

export interface LayoutData {
  readonly mode: string;
  readonly nodePositions: Record<string, { x: number; y: number }>;
  readonly edgeGeometries: Record<string, Array<{ x: number; y: number }>>;
  readonly timestamp: string;
}

export interface LayoutValidationResult {
  readonly valid: boolean;
  readonly errors: ReadonlyArray<string>;
}

export interface LayoutStrategy {
  readonly name: string;
  readonly warnings: ReadonlyArray<LayoutWarning>;
  computePositions(
    graph: RailGraph,
    config: LayoutConfiguration,
  ): Promise<ReadonlyMap<NodeId, ScreenCoordinate>>;
  computeGeometries(
    graph: RailGraph,
    positions: ReadonlyMap<NodeId, ScreenCoordinate>,
    config: LayoutConfiguration,
  ): ReadonlyMap<EdgeId, ReadonlyArray<ScreenCoordinate>>;
  validate(graph: RailGraph): LayoutValidationResult;
}
