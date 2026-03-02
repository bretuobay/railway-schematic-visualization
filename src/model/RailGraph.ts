import { CoordinateSystemType, type EdgeId, type LineId, type NodeId } from '../coordinates/types';
import type { RailEdge } from './RailEdge';
import type { RailLine } from './RailLine';
import type { RailNode } from './RailNode';

export interface RailGraphInit {
  readonly nodes: Iterable<RailNode>;
  readonly edges: Iterable<RailEdge>;
  readonly lines: Iterable<RailLine>;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly coordinateSystem?: CoordinateSystemType;
  readonly errors: ReadonlyArray<string>;
}

export class RailGraph {
  public readonly nodes: ReadonlyMap<NodeId, RailNode>;
  public readonly edges: ReadonlyMap<EdgeId, RailEdge>;
  public readonly lines: ReadonlyMap<LineId, RailLine>;
  public readonly coordinateSystem: CoordinateSystemType;

  public constructor({ nodes, edges, lines }: RailGraphInit) {
    this.nodes = new Map(Array.from(nodes, (node) => [node.id, node] as const));
    this.edges = new Map(Array.from(edges, (edge) => [edge.id, edge] as const));
    this.lines = new Map(Array.from(lines, (line) => [line.id, line] as const));
    this.coordinateSystem = this.inferCoordinateSystem();
  }

  public getNode(id: NodeId): RailNode | undefined {
    return this.nodes.get(id);
  }

  public getEdge(id: EdgeId): RailEdge | undefined {
    return this.edges.get(id);
  }

  public getLine(id: LineId): RailLine | undefined {
    return this.lines.get(id);
  }

  public getEdgesFrom(nodeId: NodeId): ReadonlyArray<RailEdge> {
    return Array.from(this.edges.values()).filter((edge) => edge.source === nodeId);
  }

  public getEdgesTo(nodeId: NodeId): ReadonlyArray<RailEdge> {
    return Array.from(this.edges.values()).filter((edge) => edge.target === nodeId);
  }

  public getConnectedNodes(nodeId: NodeId): ReadonlyArray<RailNode> {
    const connectedIds = new Set<NodeId>();

    for (const edge of this.getEdgesFrom(nodeId)) {
      connectedIds.add(edge.target);
    }

    for (const edge of this.getEdgesTo(nodeId)) {
      connectedIds.add(edge.source);
    }

    return Array.from(connectedIds)
      .map((id) => this.getNode(id))
      .filter((node): node is RailNode => node !== undefined);
  }

  public validate(): ValidationResult {
    const errors: string[] = [];
    const coordinateTypes = new Set(
      Array.from(this.nodes.values(), (node) => node.coordinate.type),
    );

    if (coordinateTypes.size > 1) {
      errors.push('All nodes must use the same coordinate system.');
    }

    for (const edge of this.edges.values()) {
      if (!this.nodes.has(edge.source)) {
        errors.push(`Edge ${edge.id} references missing source node ${edge.source}.`);
      }

      if (!this.nodes.has(edge.target)) {
        errors.push(`Edge ${edge.id} references missing target node ${edge.target}.`);
      }
    }

    for (const line of this.lines.values()) {
      for (const edgeId of line.edges) {
        if (!this.edges.has(edgeId)) {
          errors.push(`Line ${line.id} references missing edge ${edgeId}.`);
        }
      }
    }

    if (coordinateTypes.size === 1) {
      return {
        valid: errors.length === 0,
        coordinateSystem: this.coordinateSystem,
        errors,
      };
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private inferCoordinateSystem(): CoordinateSystemType {
    const firstNode = this.nodes.values().next().value;

    return firstNode?.coordinate.type ?? CoordinateSystemType.Screen;
  }
}
