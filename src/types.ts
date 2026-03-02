export {
  asEdgeId,
  asLineId,
  asNodeId,
  CoordinateSystemType,
  type Coordinate,
  type EdgeId,
  type GeographicCoordinate,
  type LineId,
  type LinearCoordinate,
  type NodeId,
  type ScreenCoordinate,
} from './coordinates/types';
export type {
  CurveGeometry,
  EdgeGeometry,
  RailEdge,
  StraightGeometry,
  SwitchGeometry,
  SwitchType,
} from './model/RailEdge';
export type { RailLine } from './model/RailLine';
export type { NodeType, RailNode } from './model/RailNode';
export type { RailGraphInit, ValidationResult } from './model/RailGraph';
export type { StylingConfiguration } from './renderer/styling';
