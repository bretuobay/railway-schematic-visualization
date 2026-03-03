type Brand<K, T extends string> = K & { readonly __brand: T };

export enum CoordinateSystemType {
  Screen = 'screen',
  Linear = 'linear',
  Geographic = 'geographic',
}

export type NodeId = Brand<string, 'NodeId'>;
export type EdgeId = Brand<string, 'EdgeId'>;
export type LineId = Brand<string, 'LineId'>;

export function asNodeId(value: string): NodeId {
  return value as NodeId;
}

export function asEdgeId(value: string): EdgeId {
  return value as EdgeId;
}

export function asLineId(value: string): LineId {
  return value as LineId;
}

export interface ScreenCoordinate {
  readonly type: CoordinateSystemType.Screen;
  readonly x: number;
  readonly y: number;
}

export interface LinearCoordinate {
  readonly type: CoordinateSystemType.Linear;
  readonly trackId: string;
  readonly distance: number;
  readonly endDistance?: number;
  readonly direction?: 'up' | 'down';
}

export interface GeographicCoordinate {
  readonly type: CoordinateSystemType.Geographic;
  readonly latitude: number;
  readonly longitude: number;
}

export type Coordinate =
  | ScreenCoordinate
  | LinearCoordinate
  | GeographicCoordinate;
