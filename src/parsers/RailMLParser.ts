import { XMLParser, XMLValidator } from 'fast-xml-parser';

import { asEdgeId, asNodeId, CoordinateSystemType } from '../coordinates';
import { ParseError } from '../errors';
import { RailGraph } from '../model';
import type {
  Coordinate,
  EdgeGeometry,
  RailEdge,
  RailNode,
  SwitchGeometry,
  SwitchType,
} from '../types';

import type { Parser, Result } from './Parser';

type XmlRecord = Record<string, unknown>;

function ok<T, E>(value: T): Result<T, E> {
  return { ok: true, value };
}

function err<T, E>(error: E): Result<T, E> {
  return { ok: false, error };
}

function isRecord(value: unknown): value is XmlRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asArray<T>(value: T | ReadonlyArray<T> | undefined): ReadonlyArray<T> {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value as T];
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function inferNodeType(value: unknown): RailNode['type'] {
  if (
    value === 'station' ||
    value === 'junction' ||
    value === 'signal' ||
    value === 'endpoint'
  ) {
    return value;
  }

  return 'endpoint';
}

function inferSwitchType(value: unknown): SwitchType | undefined {
  if (
    value === 'left_turnout' ||
    value === 'right_turnout' ||
    value === 'double_crossover' ||
    value === 'single_crossover'
  ) {
    return value;
  }

  return undefined;
}

export class RailMLParser implements Parser<string, RailGraph, ParseError> {
  private readonly xmlParser = new XMLParser({
    attributeNamePrefix: '@_',
    ignoreAttributes: false,
  });

  public parse(input: string): Result<RailGraph, ParseError> {
    const validation = XMLValidator.validate(input);

    if (validation !== true) {
      return err(
        new ParseError(`Invalid XML: ${validation.err.msg}`, {
          column: validation.err.col,
          line: validation.err.line,
          source: 'railML',
        }),
      );
    }

    let document: unknown;

    try {
      document = this.xmlParser.parse(input) as unknown;
    } catch {
      return err(new ParseError('Unable to parse railML document.', { source: 'railML' }));
    }

    const root = this.resolveRoot(document);
    if (!root.ok) {
      return root;
    }

    const topology = this.resolveTopology(root.value);
    if (!topology.ok) {
      return topology;
    }

    const nodeResult = this.parseNetElements(topology.value);
    if (!nodeResult.ok) {
      return nodeResult;
    }

    const signalResult = this.parseSignals(topology.value, nodeResult.value);
    if (!signalResult.ok) {
      return signalResult;
    }

    const edgeResult = this.parseNetRelations(topology.value);
    if (!edgeResult.ok) {
      return edgeResult;
    }

    const graph = new RailGraph({
      nodes: [...nodeResult.value, ...signalResult.value],
      edges: edgeResult.value,
      lines: [],
    });
    const graphValidation = graph.validate();

    if (!graphValidation.valid) {
      return err(
        new ParseError('railML document does not describe a valid rail graph.', {
          fieldPath: graphValidation.errors.join('; '),
        }),
      );
    }

    return ok(graph);
  }

  private resolveRoot(document: unknown): Result<XmlRecord, ParseError> {
    if (!isRecord(document)) {
      return err(new ParseError('railML root document must be an object.', { fieldPath: '$' }));
    }

    const root = document.railml ?? document.railML;

    if (!isRecord(root)) {
      return err(new ParseError('Missing railML root element.', { fieldPath: 'railml' }));
    }

    return ok(root);
  }

  private resolveTopology(root: XmlRecord): Result<XmlRecord, ParseError> {
    const infrastructure = root.infrastructure;

    if (!isRecord(infrastructure)) {
      return err(new ParseError('Missing required elements: infrastructure.', { fieldPath: 'infrastructure' }));
    }

    const topology = infrastructure.topology;

    if (!isRecord(topology)) {
      return err(
        new ParseError('Missing required elements: topology.', {
          fieldPath: 'infrastructure.topology',
        }),
      );
    }

    const missing: string[] = [];

    if (!isRecord(topology.netElements)) {
      missing.push('netElements');
    }

    if (!isRecord(topology.netRelations)) {
      missing.push('netRelations');
    }

    if (missing.length > 0) {
      return err(
        new ParseError(`Missing required elements: ${missing.join(', ')}.`, {
          fieldPath: 'infrastructure.topology',
        }),
      );
    }

    return ok(topology);
  }

  private parseNetElements(topology: XmlRecord): Result<ReadonlyArray<RailNode>, ParseError> {
    const container = topology.netElements;

    if (!isRecord(container)) {
      return err(new ParseError('Missing netElements container.', { fieldPath: 'infrastructure.topology.netElements' }));
    }

    const elements = asArray(container.netElement);
    const nodes: RailNode[] = [];

    for (const [index, entry] of elements.entries()) {
      if (!isRecord(entry)) {
        return err(new ParseError('netElement must be an object.', { fieldPath: `netElements[${index}]` }));
      }

      const id = readString(entry['@_id']);
      if (!id) {
        return err(new ParseError('netElement id is required.', { fieldPath: `netElements[${index}].@_id` }));
      }

      const coordinate = this.extractCoordinate(entry, `netElements[${index}]`);
      if (!coordinate.ok) {
        return coordinate;
      }

      nodes.push({
        id: asNodeId(id),
        name: readString(entry['@_name']) ?? id,
        type: inferNodeType(entry['@_type']),
        coordinate: coordinate.value,
      });
    }

    return ok(nodes);
  }

  private parseSignals(
    topology: XmlRecord,
    netElements: ReadonlyArray<RailNode>,
  ): Result<ReadonlyArray<RailNode>, ParseError> {
    const signalsContainer = topology.signals;

    if (!isRecord(signalsContainer)) {
      return ok([]);
    }

    const referenceCoordinates = new Map(
      netElements.map((node) => [node.id, node.coordinate] as const),
    );
    const signals = asArray(signalsContainer.signal);
    const parsedSignals: RailNode[] = [];

    for (const [index, entry] of signals.entries()) {
      if (!isRecord(entry)) {
        return err(new ParseError('signal must be an object.', { fieldPath: `signals[${index}]` }));
      }

      const id = readString(entry['@_id']);
      if (!id) {
        return err(new ParseError('signal id is required.', { fieldPath: `signals[${index}].@_id` }));
      }

      let coordinateResult = this.extractCoordinate(entry, `signals[${index}]`);

      if (!coordinateResult.ok) {
        const nodeRef = readString(entry['@_nodeRef']);

        if (nodeRef) {
          const inherited = referenceCoordinates.get(asNodeId(nodeRef));

          if (inherited) {
            coordinateResult = ok(inherited);
          }
        }
      }

      if (!coordinateResult.ok) {
        return coordinateResult;
      }

      parsedSignals.push({
        id: asNodeId(id),
        name: readString(entry['@_name']) ?? id,
        type: 'signal',
        coordinate: coordinateResult.value,
      });
    }

    return ok(parsedSignals);
  }

  private parseNetRelations(topology: XmlRecord): Result<ReadonlyArray<RailEdge>, ParseError> {
    const container = topology.netRelations;

    if (!isRecord(container)) {
      return err(new ParseError('Missing netRelations container.', { fieldPath: 'infrastructure.topology.netRelations' }));
    }

    const relations = asArray(container.netRelation);
    const edges: RailEdge[] = [];

    for (const [index, entry] of relations.entries()) {
      if (!isRecord(entry)) {
        return err(new ParseError('netRelation must be an object.', { fieldPath: `netRelations[${index}]` }));
      }

      const id = readString(entry['@_id']);
      const source = readString(entry['@_source']);
      const target = readString(entry['@_target']);
      const length = readNumber(entry['@_length']);

      if (!id) {
        return err(new ParseError('netRelation id is required.', { fieldPath: `netRelations[${index}].@_id` }));
      }

      if (!source) {
        return err(new ParseError('netRelation source is required.', { fieldPath: `netRelations[${index}].@_source` }));
      }

      if (!target) {
        return err(new ParseError('netRelation target is required.', { fieldPath: `netRelations[${index}].@_target` }));
      }

      if (length === undefined) {
        return err(new ParseError('netRelation length is required.', { fieldPath: `netRelations[${index}].@_length` }));
      }

      const geometry = this.extractGeometry(entry, `netRelations[${index}]`);
      if (!geometry.ok) {
        return geometry;
      }

      edges.push({
        id: asEdgeId(id),
        source: asNodeId(source),
        target: asNodeId(target),
        length,
        geometry: geometry.value,
      });
    }

    return ok(edges);
  }

  private extractCoordinate(entry: XmlRecord, path: string): Result<Coordinate, ParseError> {
    if (isRecord(entry.screenPositioningSystem)) {
      const x = readNumber(entry.screenPositioningSystem['@_x']);
      const y = readNumber(entry.screenPositioningSystem['@_y']);

      if (x === undefined || y === undefined) {
        return err(
          new ParseError('screenPositioningSystem requires numeric x and y attributes.', {
            fieldPath: `${path}.screenPositioningSystem`,
          }),
        );
      }

      return ok({
        type: CoordinateSystemType.Screen,
        x,
        y,
      });
    }

    if (isRecord(entry.linearPositioningSystem)) {
      const trackId = readString(entry.linearPositioningSystem['@_trackId']);
      const distance = readNumber(entry.linearPositioningSystem['@_distance']);
      const endDistance = readNumber(entry.linearPositioningSystem['@_endDistance']);
      const direction = readString(entry.linearPositioningSystem['@_direction']);

      if (!trackId || distance === undefined) {
        return err(
          new ParseError('linearPositioningSystem requires trackId and numeric distance.', {
            fieldPath: `${path}.linearPositioningSystem`,
          }),
        );
      }

      return ok({
        type: CoordinateSystemType.Linear,
        trackId,
        distance,
        ...(endDistance !== undefined ? { endDistance } : {}),
        ...(direction === 'up' || direction === 'down' ? { direction } : {}),
      });
    }

    if (isRecord(entry.geometricPositioningSystem)) {
      const latitude = readNumber(entry.geometricPositioningSystem['@_latitude']);
      const longitude = readNumber(entry.geometricPositioningSystem['@_longitude']);

      if (latitude === undefined || longitude === undefined) {
        return err(
          new ParseError('geometricPositioningSystem requires numeric latitude and longitude.', {
            fieldPath: `${path}.geometricPositioningSystem`,
          }),
        );
      }

      return ok({
        type: CoordinateSystemType.Geographic,
        latitude,
        longitude,
      });
    }

    return err(
      new ParseError('Missing positioning system for element.', {
        fieldPath: path,
      }),
    );
  }

  private extractGeometry(entry: XmlRecord, path: string): Result<EdgeGeometry, ParseError> {
    if (isRecord(entry.switch)) {
      const switchType = inferSwitchType(entry.switch['@_switchType']);
      const orientation = readNumber(entry.switch['@_orientation']);

      if (!switchType || orientation === undefined) {
        return err(
          new ParseError('switch requires a valid switchType and numeric orientation.', {
            fieldPath: `${path}.switch`,
          }),
        );
      }

      const geometry: SwitchGeometry = {
        type: 'switch',
        switchType,
        orientation,
      };

      return ok(geometry);
    }

    if (isRecord(entry.geometry)) {
      const geometryType = readString(entry.geometry['@_type']) ?? 'straight';

      if (geometryType === 'curve') {
        const curvature = readNumber(entry.geometry['@_curvature']);

        if (curvature === undefined) {
          return err(
            new ParseError('curve geometry requires numeric curvature.', {
              fieldPath: `${path}.geometry`,
            }),
          );
        }

        return ok({
          type: 'curve',
          curvature,
        });
      }
    }

    return ok({
      type: 'straight',
    });
  }
}
