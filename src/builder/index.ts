import { asEdgeId, asLineId, asNodeId } from '../coordinates';
import { BuildError } from '../errors';
import type { EdgeGeometry, NodeType, RailEdge, RailLine, RailNode } from '../types';
import { RailGraph } from '../model';

export interface GraphNodeInput {
  readonly id: string;
  readonly name: string;
  readonly type: NodeType;
  readonly coordinate: RailNode['coordinate'];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface GraphEdgeInput {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly length: number;
  readonly geometry: EdgeGeometry;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface GraphLineInput {
  readonly id: string;
  readonly name: string;
  readonly edges: ReadonlyArray<string>;
  readonly color?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export class GraphBuilder {
  private readonly nodes = new Map<string, RailNode>();
  private readonly edges = new Map<string, RailEdge>();
  private readonly lines = new Map<string, RailLine>();

  public addNode(input: GraphNodeInput): this {
    const node: RailNode = {
      id: asNodeId(input.id),
      name: input.name,
      type: input.type,
      coordinate: input.coordinate,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    };

    this.nodes.set(input.id, node);

    return this;
  }

  public addEdge(input: GraphEdgeInput): this {
    this.ensureNodeExists(input.source);
    this.ensureNodeExists(input.target);

    const edge: RailEdge = {
      id: asEdgeId(input.id),
      source: asNodeId(input.source),
      target: asNodeId(input.target),
      length: input.length,
      geometry: input.geometry,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    };

    this.edges.set(input.id, edge);

    return this;
  }

  public addLine(input: GraphLineInput): this {
    for (const edgeId of input.edges) {
      this.ensureEdgeExists(edgeId);
    }

    const line: RailLine = {
      id: asLineId(input.id),
      name: input.name,
      edges: input.edges.map((edgeId) => asEdgeId(edgeId)),
      ...(input.color ? { color: input.color } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
    };

    this.lines.set(input.id, line);

    return this;
  }

  public build(): RailGraph {
    const graph = new RailGraph({
      nodes: this.nodes.values(),
      edges: this.edges.values(),
      lines: this.lines.values(),
    });

    const validation = graph.validate();

    if (!validation.valid) {
      throw new BuildError('Graph validation failed.', {
        fieldPath: validation.errors.join('; '),
      });
    }

    return graph;
  }

  private ensureNodeExists(nodeId: string): void {
    if (!this.nodes.has(nodeId)) {
      throw new BuildError(`Unknown node reference "${nodeId}".`, {
        identifier: nodeId,
      });
    }
  }

  private ensureEdgeExists(edgeId: string): void {
    if (!this.edges.has(edgeId)) {
      throw new BuildError(`Unknown edge reference "${edgeId}".`, {
        identifier: edgeId,
      });
    }
  }
}
