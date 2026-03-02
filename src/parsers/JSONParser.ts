import { asEdgeId, asLineId, asNodeId, CoordinateSystemType } from '../coordinates';
import { ParseError } from '../errors';
import { RailGraph } from '../model';
import type {
  Coordinate,
  EdgeGeometry,
  GeographicCoordinate,
  LinearCoordinate,
  RailEdge,
  RailLine,
  RailNode,
  ScreenCoordinate,
} from '../types';

import type { Parser, Result } from './Parser';
import type {
  RailSchematicJsonDocument,
  RailSchematicJsonEdge,
  RailSchematicJsonLine,
  RailSchematicJsonNode,
} from './schema';

function ok<T, E>(value: T): Result<T, E> {
  return { ok: true, value };
}

function err<T, E>(error: E): Result<T, E> {
  return { ok: false, error };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMetadata(value: unknown): value is Readonly<Record<string, unknown>> {
  return value === undefined || isRecord(value);
}

function isCoordinate(value: unknown, path: string): Result<Coordinate, ParseError> {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return err(new ParseError('Coordinate must be an object with a valid type.', { fieldPath: path }));
  }

  switch (value.type) {
    case CoordinateSystemType.Screen:
      if (typeof value.x !== 'number' || typeof value.y !== 'number') {
        return err(new ParseError('Screen coordinates require numeric x and y values.', { fieldPath: path }));
      }

      return ok<ScreenCoordinate, ParseError>({
        type: CoordinateSystemType.Screen,
        x: value.x,
        y: value.y,
      });
    case CoordinateSystemType.Linear:
      if (typeof value.trackId !== 'string' || typeof value.distance !== 'number') {
        return err(
          new ParseError('Linear coordinates require a trackId and numeric distance.', {
            fieldPath: path,
          }),
        );
      }

      if (
        value.endDistance !== undefined &&
        typeof value.endDistance !== 'number'
      ) {
        return err(
          new ParseError('Linear coordinate endDistance must be numeric when provided.', {
            fieldPath: path,
          }),
        );
      }

      if (
        value.direction !== undefined &&
        value.direction !== 'up' &&
        value.direction !== 'down'
      ) {
        return err(
          new ParseError('Linear coordinate direction must be "up" or "down".', {
            fieldPath: path,
          }),
        );
      }

      return ok<LinearCoordinate, ParseError>({
        type: CoordinateSystemType.Linear,
        trackId: value.trackId,
        distance: value.distance,
        ...(value.endDistance !== undefined ? { endDistance: value.endDistance } : {}),
        ...(value.direction !== undefined ? { direction: value.direction } : {}),
      });
    case CoordinateSystemType.Geographic:
      if (typeof value.latitude !== 'number' || typeof value.longitude !== 'number') {
        return err(
          new ParseError('Geographic coordinates require numeric latitude and longitude.', {
            fieldPath: path,
          }),
        );
      }

      return ok<GeographicCoordinate, ParseError>({
        type: CoordinateSystemType.Geographic,
        latitude: value.latitude,
        longitude: value.longitude,
      });
    default:
      return err(new ParseError('Unsupported coordinate type.', { fieldPath: path }));
  }
}

function isGeometry(value: unknown, path: string): Result<EdgeGeometry, ParseError> {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return err(new ParseError('Geometry must be an object with a valid type.', { fieldPath: path }));
  }

  if (value.type === 'straight') {
    return ok({ type: 'straight' });
  }

  if (value.type === 'curve') {
    if (typeof value.curvature !== 'number') {
      return err(new ParseError('Curve geometry requires a numeric curvature.', { fieldPath: path }));
    }

    return ok({
      type: 'curve',
      curvature: value.curvature,
    });
  }

  if (value.type === 'switch') {
    if (
      (value.switchType !== 'left_turnout' &&
        value.switchType !== 'right_turnout' &&
        value.switchType !== 'double_crossover' &&
        value.switchType !== 'single_crossover') ||
      typeof value.orientation !== 'number'
    ) {
      return err(
        new ParseError('Switch geometry requires a valid switchType and numeric orientation.', {
          fieldPath: path,
        }),
      );
    }

    return ok({
      type: 'switch',
      switchType: value.switchType,
      orientation: value.orientation,
    });
  }

  return err(new ParseError('Unsupported geometry type.', { fieldPath: path }));
}

export class JSONParser
  implements Parser<string, RailGraph, ParseError>
{
  public parse(input: string): Result<RailGraph, ParseError> {
    let parsed: unknown;

    try {
      parsed = JSON.parse(input) as unknown;
    } catch {
      return err(
        new ParseError('Input is not valid JSON.', {
          source: 'json',
        }),
      );
    }

    if (!isRecord(parsed)) {
      return err(new ParseError('JSON root must be an object.', { fieldPath: '$' }));
    }

    const documentResult = this.parseDocument(parsed);
    if (!documentResult.ok) {
      return documentResult;
    }

    const nodes = documentResult.value.nodes.map((node) => this.toRailNode(node));
    const edges = documentResult.value.edges.map((edge) => this.toRailEdge(edge));
    const lines = documentResult.value.lines.map((line) => this.toRailLine(line));
    const graph = new RailGraph({ nodes, edges, lines });
    const validation = graph.validate();

    if (!validation.valid) {
      return err(
        new ParseError('JSON document does not describe a valid rail graph.', {
          fieldPath: validation.errors.join('; '),
        }),
      );
    }

    return ok(graph);
  }

  private parseDocument(input: Record<string, unknown>): Result<RailSchematicJsonDocument, ParseError> {
    if (!Array.isArray(input.nodes)) {
      return err(new ParseError('nodes must be an array.', { fieldPath: 'nodes' }));
    }

    if (!Array.isArray(input.edges)) {
      return err(new ParseError('edges must be an array.', { fieldPath: 'edges' }));
    }

    if (!Array.isArray(input.lines)) {
      return err(new ParseError('lines must be an array.', { fieldPath: 'lines' }));
    }

    const nodes: RailSchematicJsonNode[] = [];
    const edges: RailSchematicJsonEdge[] = [];
    const lines: RailSchematicJsonLine[] = [];

    for (const [index, node] of input.nodes.entries()) {
      const result = this.parseNode(node, `nodes[${index}]`);
      if (!result.ok) {
        return result;
      }

      nodes.push(result.value);
    }

    for (const [index, edge] of input.edges.entries()) {
      const result = this.parseEdge(edge, `edges[${index}]`);
      if (!result.ok) {
        return result;
      }

      edges.push(result.value);
    }

    for (const [index, line] of input.lines.entries()) {
      const result = this.parseLine(line, `lines[${index}]`);
      if (!result.ok) {
        return result;
      }

      lines.push(result.value);
    }

    return ok({ nodes, edges, lines });
  }

  private parseNode(input: unknown, path: string): Result<RailSchematicJsonNode, ParseError> {
    if (!isRecord(input)) {
      return err(new ParseError('Node must be an object.', { fieldPath: path }));
    }

    if (typeof input.id !== 'string') {
      return err(new ParseError('Node id must be a string.', { fieldPath: `${path}.id` }));
    }

    if (typeof input.name !== 'string') {
      return err(new ParseError('Node name must be a string.', { fieldPath: `${path}.name` }));
    }

    if (
      input.type !== 'station' &&
      input.type !== 'junction' &&
      input.type !== 'signal' &&
      input.type !== 'endpoint'
    ) {
      return err(new ParseError('Node type is invalid.', { fieldPath: `${path}.type` }));
    }

    const coordinate = isCoordinate(input.coordinate, `${path}.coordinate`);
    if (!coordinate.ok) {
      return coordinate;
    }

    if (!isMetadata(input.metadata)) {
      return err(new ParseError('Node metadata must be an object when provided.', { fieldPath: `${path}.metadata` }));
    }

    return ok({
      id: input.id,
      name: input.name,
      type: input.type,
      coordinate: coordinate.value,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    });
  }

  private parseEdge(input: unknown, path: string): Result<RailSchematicJsonEdge, ParseError> {
    if (!isRecord(input)) {
      return err(new ParseError('Edge must be an object.', { fieldPath: path }));
    }

    if (typeof input.id !== 'string') {
      return err(new ParseError('Edge id must be a string.', { fieldPath: `${path}.id` }));
    }

    if (typeof input.source !== 'string') {
      return err(new ParseError('Edge source must be a string.', { fieldPath: `${path}.source` }));
    }

    if (typeof input.target !== 'string') {
      return err(new ParseError('Edge target must be a string.', { fieldPath: `${path}.target` }));
    }

    if (typeof input.length !== 'number') {
      return err(new ParseError('Edge length must be numeric.', { fieldPath: `${path}.length` }));
    }

    const geometry = isGeometry(input.geometry, `${path}.geometry`);
    if (!geometry.ok) {
      return geometry;
    }

    if (!isMetadata(input.metadata)) {
      return err(new ParseError('Edge metadata must be an object when provided.', { fieldPath: `${path}.metadata` }));
    }

    return ok({
      id: input.id,
      source: input.source,
      target: input.target,
      length: input.length,
      geometry: geometry.value,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    });
  }

  private parseLine(input: unknown, path: string): Result<RailSchematicJsonLine, ParseError> {
    if (!isRecord(input)) {
      return err(new ParseError('Line must be an object.', { fieldPath: path }));
    }

    if (typeof input.id !== 'string') {
      return err(new ParseError('Line id must be a string.', { fieldPath: `${path}.id` }));
    }

    if (typeof input.name !== 'string') {
      return err(new ParseError('Line name must be a string.', { fieldPath: `${path}.name` }));
    }

    if (!Array.isArray(input.edges) || !input.edges.every((edgeId) => typeof edgeId === 'string')) {
      return err(new ParseError('Line edges must be an array of strings.', { fieldPath: `${path}.edges` }));
    }

    if (input.color !== undefined && typeof input.color !== 'string') {
      return err(new ParseError('Line color must be a string when provided.', { fieldPath: `${path}.color` }));
    }

    if (!isMetadata(input.metadata)) {
      return err(new ParseError('Line metadata must be an object when provided.', { fieldPath: `${path}.metadata` }));
    }

    return ok({
      id: input.id,
      name: input.name,
      edges: input.edges,
      ...(input.color ? { color: input.color } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
    });
  }

  private toRailNode(node: RailSchematicJsonNode): RailNode {
    return {
      id: asNodeId(node.id),
      name: node.name,
      type: node.type,
      coordinate: node.coordinate,
      ...(node.metadata ? { metadata: node.metadata } : {}),
    };
  }

  private toRailEdge(edge: RailSchematicJsonEdge): RailEdge {
    return {
      id: asEdgeId(edge.id),
      source: asNodeId(edge.source),
      target: asNodeId(edge.target),
      length: edge.length,
      geometry: edge.geometry,
      ...(edge.metadata ? { metadata: edge.metadata } : {}),
    };
  }

  private toRailLine(line: RailSchematicJsonLine): RailLine {
    return {
      id: asLineId(line.id),
      name: line.name,
      edges: line.edges.map((edgeId) => asEdgeId(edgeId)),
      ...(line.color ? { color: line.color } : {}),
      ...(line.metadata ? { metadata: line.metadata } : {}),
    };
  }
}

export class JSONSerializer {
  public serialize(graph: RailGraph): string {
    const document: RailSchematicJsonDocument = {
      nodes: Array.from(graph.nodes.values()).map((node) => ({
        id: node.id,
        name: node.name,
        type: node.type,
        coordinate: node.coordinate,
        ...(node.metadata ? { metadata: node.metadata } : {}),
      })),
      edges: Array.from(graph.edges.values()).map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        length: edge.length,
        geometry: edge.geometry,
        ...(edge.metadata ? { metadata: edge.metadata } : {}),
      })),
      lines: Array.from(graph.lines.values()).map((line) => ({
        id: line.id,
        name: line.name,
        edges: line.edges.map((edgeId) => edgeId),
        ...(line.color ? { color: line.color } : {}),
        ...(line.metadata ? { metadata: line.metadata } : {}),
      })),
    };

    return JSON.stringify(document, null, 2);
  }
}
