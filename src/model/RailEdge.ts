import type { Coordinate, EdgeId, NodeId } from '../coordinates/types';

export interface StraightGeometry {
  readonly type: 'straight';
  readonly points?: ReadonlyArray<Coordinate>;
}

export interface CurveGeometry {
  readonly type: 'curve';
  readonly curvature: number;
  readonly points?: ReadonlyArray<Coordinate>;
}

export type SwitchType =
  | 'left_turnout'
  | 'right_turnout'
  | 'double_crossover'
  | 'single_crossover';

export interface SwitchGeometry {
  readonly type: 'switch';
  readonly switchType: SwitchType;
  readonly orientation: number;
}

export type EdgeGeometry = StraightGeometry | CurveGeometry | SwitchGeometry;

export interface RailEdge {
  readonly id: EdgeId;
  readonly source: NodeId;
  readonly target: NodeId;
  readonly length: number;
  readonly geometry: EdgeGeometry;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
