import type { Coordinate, NodeId } from '../coordinates/types';

export type NodeType = 'station' | 'junction' | 'signal' | 'endpoint';

export interface RailNode {
  readonly id: NodeId;
  readonly name: string;
  readonly type: NodeType;
  readonly coordinate: Coordinate;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
