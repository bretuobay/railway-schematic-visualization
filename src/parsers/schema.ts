import type { Coordinate, EdgeGeometry, NodeType } from '../types';

export interface RailSchematicJsonNode {
  readonly id: string;
  readonly name: string;
  readonly type: NodeType;
  readonly coordinate: Coordinate;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface RailSchematicJsonEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly length: number;
  readonly geometry: EdgeGeometry;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface RailSchematicJsonLine {
  readonly id: string;
  readonly name: string;
  readonly edges: ReadonlyArray<string>;
  readonly color?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface RailSchematicJsonDocument {
  readonly nodes: ReadonlyArray<RailSchematicJsonNode>;
  readonly edges: ReadonlyArray<RailSchematicJsonEdge>;
  readonly lines: ReadonlyArray<RailSchematicJsonLine>;
}
