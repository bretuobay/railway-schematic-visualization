import {
  CoordinateSystemType,
  GraphBuilder,
  RailGraph,
  type Coordinate,
  type EdgeGeometry,
} from '@rail-schematic-viz/core';

type CsvColumnKey =
  | 'lineId'
  | 'startMileage'
  | 'endMileage'
  | 'stationName'
  | 'trackType'
  | 'speedLimit';

type CsvColumnReference = number | string;

export interface RegionalAdapterPackageMetadata {
  readonly packageName: '@rail-schematic-viz/adapters-regional';
  readonly adapterCount: 4;
}

export interface CSVColumnMappings {
  readonly lineId?: CsvColumnReference;
  readonly startMileage?: CsvColumnReference;
  readonly endMileage?: CsvColumnReference;
  readonly stationName?: CsvColumnReference;
  readonly trackType?: CsvColumnReference;
  readonly speedLimit?: CsvColumnReference;
}

export interface CSVAdapterOptions {
  readonly delimiter?: string;
  readonly hasHeaders?: boolean;
  readonly columnMappings?: CSVColumnMappings;
}

export interface CSVParseResult {
  readonly graph: RailGraph;
  readonly rowCount: number;
  readonly lineIds: ReadonlyArray<string>;
}

export interface GeoJSONAdapterOptions {
  readonly trackIdProperty?: string;
  readonly lineIdProperty?: string;
  readonly nameProperty?: string;
  readonly typeProperty?: string;
  readonly crsOverride?: string;
}

export interface GeoJSONFeatureCollection {
  readonly type: 'FeatureCollection';
  readonly features: ReadonlyArray<GeoJSONFeature>;
  readonly crs?: {
    readonly type?: string;
    readonly properties?: Readonly<Record<string, unknown>>;
  };
}

export interface GeoJSONFeature {
  readonly type: 'Feature';
  readonly id?: string | number;
  readonly geometry: {
    readonly type: string;
    readonly coordinates: ReadonlyArray<ReadonlyArray<number>>;
  };
  readonly properties?: Readonly<Record<string, unknown>>;
}

export interface GeoJSONParseResult {
  readonly graph: RailGraph;
  readonly featureCount: number;
  readonly crsName: string;
}

export interface ELRReference {
  readonly code: string;
  readonly trackId: string;
  readonly description?: string;
  readonly aliases?: ReadonlyArray<string>;
  readonly naptanId?: string;
}

export interface ParsedMileage {
  readonly miles: number;
  readonly chains: number;
  readonly totalChains: number;
  readonly metres: number;
}

export interface ELRLinearPosition {
  readonly type: CoordinateSystemType.Linear;
  readonly trackId: string;
  readonly distance: number;
  readonly direction: 'up' | 'down';
}

export interface ELRResolution extends ELRReference {}

export interface ELRSegmentInput {
  readonly elr: string;
  readonly startMileage: string | number;
  readonly endMileage: string | number;
  readonly direction?: 'up' | 'down';
  readonly stationId?: string;
  readonly name?: string;
}

export interface ELRAdapterOptions {
  readonly references?: ReadonlyArray<ELRReference>;
}

export interface ELRParseResult {
  readonly graph: RailGraph;
  readonly segmentCount: number;
}

export interface RINFSection {
  readonly id: string;
  readonly trackId: string;
  readonly name?: string;
  readonly startDistance: number;
  readonly endDistance: number;
  readonly startOperationalPointId?: string;
  readonly endOperationalPointId?: string;
}

export interface RINFOperationalPoint {
  readonly id: string;
  readonly name: string;
  readonly latitude?: number;
  readonly longitude?: number;
}

export interface RINFDocument {
  readonly sections?: ReadonlyArray<RINFSection>;
  readonly operationalPoints?: ReadonlyArray<RINFOperationalPoint>;
}

export interface RINFAdapterOptions {
  readonly sections?: ReadonlyArray<RINFSection>;
  readonly operationalPoints?: ReadonlyArray<RINFOperationalPoint>;
}

export interface RINFParseResult {
  readonly graph: RailGraph;
  readonly sectionCount: number;
  readonly operationalPointCount: number;
}

const DEFAULT_CSV_MAPPINGS_WITH_HEADERS: Record<CsvColumnKey, ReadonlyArray<string>> = {
  endMileage: ['end mileage', 'end_mileage', 'end', 'to'],
  lineId: ['line id', 'line_id', 'track id', 'track_id', 'line'],
  speedLimit: ['speed limit', 'speed_limit'],
  startMileage: ['start mileage', 'start_mileage', 'start', 'from'],
  stationName: ['station name', 'station_name', 'station'],
  trackType: ['track type', 'track_type', 'type'],
};

const DEFAULT_CSV_MAPPINGS_NO_HEADERS: Record<CsvColumnKey, number> = {
  endMileage: 2,
  lineId: 0,
  speedLimit: 5,
  startMileage: 1,
  stationName: 3,
  trackType: 4,
};

const DEFAULT_ELR_REFERENCES: ReadonlyArray<ELRReference> = [
  {
    aliases: ['ECML', 'EC'],
    code: 'ECM1',
    description: 'East Coast Main Line',
    naptanId: '9100KGX',
    trackId: 'uk-elr-ecm1',
  },
  {
    aliases: ['GWML', 'GW'],
    code: 'MLN1',
    description: 'Great Western Main Line',
    naptanId: '9100PAD',
    trackId: 'uk-elr-mln1',
  },
];

export const PACKAGE_METADATA = {
  adapterCount: 4,
  packageName: '@rail-schematic-viz/adapters-regional',
} as const satisfies RegionalAdapterPackageMetadata;

export function getPackageMetadata(): RegionalAdapterPackageMetadata {
  return PACKAGE_METADATA;
}

export class CSVAdapter {
  public parse(input: string, options: CSVAdapterOptions = {}): CSVParseResult {
    const delimiter = options.delimiter ?? ',';
    const hasHeaders = options.hasHeaders ?? true;
    const lines = input
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      throw new Error('CSV input is empty.');
    }

    const headers = hasHeaders ? parseDelimitedRow(lines[0] ?? '', delimiter) : undefined;
    const dataRows = hasHeaders ? lines.slice(1) : lines;
    const builder = new GraphBuilder();
    const lineEdges = new Map<string, string[]>();

    dataRows.forEach((row, rowIndex) => {
      const cells = parseDelimitedRow(row, delimiter);
      const csvRowNumber = rowIndex + (hasHeaders ? 2 : 1);
      const lineId = this.readCell(
        'lineId',
        cells,
        headers,
        options.columnMappings,
        hasHeaders,
        csvRowNumber,
      );
      const startMileage = this.parseMileageValue(
        this.readCell(
          'startMileage',
          cells,
          headers,
          options.columnMappings,
          hasHeaders,
          csvRowNumber,
        ),
        csvRowNumber,
        'startMileage',
      );
      const endMileage = this.parseMileageValue(
        this.readCell(
          'endMileage',
          cells,
          headers,
          options.columnMappings,
          hasHeaders,
          csvRowNumber,
        ),
        csvRowNumber,
        'endMileage',
      );
      const stationName = this.readOptionalCell(
        'stationName',
        cells,
        headers,
        options.columnMappings,
        hasHeaders,
      );
      const trackType = this.readOptionalCell(
        'trackType',
        cells,
        headers,
        options.columnMappings,
        hasHeaders,
      );
      const speedLimit = this.readOptionalCell(
        'speedLimit',
        cells,
        headers,
        options.columnMappings,
        hasHeaders,
      );
      const normalizedLineId = sanitizeIdentifier(lineId, `row-${csvRowNumber}`);
      const startNodeId = `${normalizedLineId}-start-${normalizeDistanceId(startMileage)}`;
      const endNodeId = `${normalizedLineId}-end-${normalizeDistanceId(endMileage)}`;
      const edgeId = `${normalizedLineId}-edge-${rowIndex + 1}`;
      const edgeMetadata = {
        csvRow: csvRowNumber,
        ...(trackType ? { trackType } : {}),
        ...(speedLimit ? { speedLimit } : {}),
      };

      builder.addNode({
        coordinate: {
          direction: startMileage <= endMileage ? 'up' : 'down',
          distance: startMileage,
          trackId: normalizedLineId,
          type: CoordinateSystemType.Linear,
        },
        id: startNodeId,
        metadata: {
          csvRow: csvRowNumber,
          ...(stationName ? { stationName } : {}),
        },
        name: stationName ?? `${lineId} start ${startMileage}`,
        type: 'station',
      });
      builder.addNode({
        coordinate: {
          direction: startMileage <= endMileage ? 'up' : 'down',
          distance: endMileage,
          trackId: normalizedLineId,
          type: CoordinateSystemType.Linear,
        },
        id: endNodeId,
        metadata: {
          csvRow: csvRowNumber,
          ...(stationName ? { stationName } : {}),
        },
        name: stationName ?? `${lineId} end ${endMileage}`,
        type: 'station',
      });
      builder.addEdge({
        geometry: createStraightGeometry(),
        id: edgeId,
        length: Math.abs(endMileage - startMileage),
        metadata: edgeMetadata,
        source: startNodeId,
        target: endNodeId,
      });

      const existingEdges = lineEdges.get(normalizedLineId) ?? [];
      existingEdges.push(edgeId);
      lineEdges.set(normalizedLineId, existingEdges);
    });

    for (const [lineId, edges] of lineEdges.entries()) {
      builder.addLine({
        edges,
        id: lineId,
        metadata: {
          source: 'csv',
        },
        name: lineId,
      });
    }

    return {
      graph: builder.build(),
      lineIds: Array.from(lineEdges.keys()),
      rowCount: dataRows.length,
    };
  }

  private readCell(
    key: CsvColumnKey,
    cells: ReadonlyArray<string>,
    headers: ReadonlyArray<string> | undefined,
    mappings: CSVColumnMappings | undefined,
    hasHeaders: boolean,
    rowNumber: number,
  ): string {
    const value = this.readOptionalCell(key, cells, headers, mappings, hasHeaders);

    if (!value) {
      throw new Error(`CSV row ${rowNumber} is missing required field "${key}".`);
    }

    return value;
  }

  private readOptionalCell(
    key: CsvColumnKey,
    cells: ReadonlyArray<string>,
    headers: ReadonlyArray<string> | undefined,
    mappings: CSVColumnMappings | undefined,
    hasHeaders: boolean,
  ): string | undefined {
    const reference = mappings?.[key]
      ?? (hasHeaders ? resolveHeaderReference(key, headers ?? []) : DEFAULT_CSV_MAPPINGS_NO_HEADERS[key]);

    if (reference === undefined) {
      return undefined;
    }

    if (typeof reference === 'number') {
      return normalizeOptionalString(cells[reference]);
    }

    const index = (headers ?? []).findIndex((header) => normalizeHeader(header) === normalizeHeader(reference));

    if (index < 0) {
      return undefined;
    }

    return normalizeOptionalString(cells[index]);
  }

  private parseMileageValue(
    value: string,
    rowNumber: number,
    fieldName: 'startMileage' | 'endMileage',
  ): number {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      throw new Error(`CSV row ${rowNumber} has invalid ${fieldName}: "${value}".`);
    }

    return numericValue;
  }
}

export class GeoJSONAdapter {
  public parse(
    input: GeoJSONFeatureCollection | string,
    options: GeoJSONAdapterOptions = {},
  ): GeoJSONParseResult {
    const featureCollection = parseGeoJSONInput(input);

    if (featureCollection.type !== 'FeatureCollection') {
      throw new Error('GeoJSON input must be a FeatureCollection.');
    }

    const builder = new GraphBuilder();
    const lineEdges = new Map<string, string[]>();
    const lineDefinitions = new Map<
      string,
      {
        readonly color?: string;
        readonly name: string;
      }
    >();
    const crsName = options.crsOverride ?? extractGeoJSONCrs(featureCollection);

    featureCollection.features.forEach((feature, featureIndex) => {
      const featureId = String(feature.id ?? `feature-${featureIndex + 1}`);

      if (feature.geometry.type !== 'LineString') {
        throw new Error(
          `GeoJSON feature "${featureId}" must use LineString geometry.`,
        );
      }

      const coordinates = feature.geometry.coordinates;

      if (coordinates.length < 2) {
        throw new Error(
          `GeoJSON feature "${featureId}" must contain at least two coordinates.`,
        );
      }

      const start = parseGeographicCoordinate(coordinates[0], featureId);
      const end = parseGeographicCoordinate(coordinates[coordinates.length - 1], featureId);
      const properties = feature.properties ?? {};
      const trackIdValue = asString(
        properties[options.trackIdProperty ?? 'trackId']
        ?? properties[options.lineIdProperty ?? 'lineId']
        ?? feature.id,
      ) ?? `track-${featureIndex + 1}`;
      const normalizedTrackId = sanitizeIdentifier(trackIdValue, `track-${featureIndex + 1}`);
      const nodeStartId = `${normalizedTrackId}-start`;
      const nodeEndId = `${normalizedTrackId}-end`;
      const edgeId = `${normalizedTrackId}-edge-${featureIndex + 1}`;
      const lineName = asString(properties[options.nameProperty ?? 'name']) ?? trackIdValue;
      const lineColor = asString(properties.color);
      const typeValue = asString(properties[options.typeProperty ?? 'type']);
      const pathPoints = coordinates.map((coordinate) =>
        parseGeographicCoordinate(coordinate, featureId),
      );
      const geometry = createStraightGeometry(pathPoints);

      builder.addNode({
        coordinate: start,
        id: nodeStartId,
        metadata: {
          featureId,
          position: 'start',
        },
        name: `${lineName} start`,
        type: 'endpoint',
      });
      builder.addNode({
        coordinate: end,
        id: nodeEndId,
        metadata: {
          featureId,
          position: 'end',
        },
        name: `${lineName} end`,
        type: 'endpoint',
      });
      builder.addEdge({
        geometry,
        id: edgeId,
        length: calculatePathLength(pathPoints),
        metadata: {
          crsName,
          featureId,
          ...(typeValue ? { trackType: typeValue } : {}),
        },
        source: nodeStartId,
        target: nodeEndId,
      });

      const existingEdges = lineEdges.get(normalizedTrackId) ?? [];
      existingEdges.push(edgeId);
      lineEdges.set(normalizedTrackId, existingEdges);
      lineDefinitions.set(normalizedTrackId, {
        ...(lineColor ? { color: lineColor } : {}),
        name: lineName,
      });
    });

    for (const [lineId, edges] of lineEdges.entries()) {
      const lineDefinition = lineDefinitions.get(lineId);

      builder.addLine({
        ...(lineDefinition?.color ? { color: lineDefinition.color } : {}),
        edges,
        id: lineId,
        metadata: {
          crsName,
          source: 'geojson',
        },
        name: lineDefinition?.name ?? lineId,
      });
    }

    return {
      crsName,
      featureCount: featureCollection.features.length,
      graph: builder.build(),
    };
  }
}

export class ELRAdapter {
  private readonly references: ReadonlyArray<ELRReference>;

  public constructor(options: ELRAdapterOptions = {}) {
    this.references = options.references ?? DEFAULT_ELR_REFERENCES;
  }

  public resolveELR(code: string): ELRResolution {
    const normalizedCode = code.trim().toUpperCase();
    const match = this.references.find((reference) => {
      if (reference.code.toUpperCase() === normalizedCode) {
        return true;
      }

      return (reference.aliases ?? []).some(
        (alias) => alias.trim().toUpperCase() === normalizedCode,
      );
    });

    if (!match) {
      throw new Error(`Unknown ELR code "${code}".`);
    }

    return {
      ...match,
      ...(match.aliases ? { aliases: [...match.aliases] } : {}),
    };
  }

  public parseMileage(value: string | number): ParsedMileage {
    if (typeof value === 'number') {
      return convertMileage(value, 0);
    }

    const match = value
      .trim()
      .match(/^(?<miles>\d+)\s*m(?:\s+(?<chains>\d+)\s*ch)?$/iu);

    if (!match?.groups?.miles) {
      throw new Error(`Invalid UK mileage value "${value}".`);
    }

    const miles = Number(match.groups.miles);
    const chains = Number(match.groups.chains ?? '0');

    if (!Number.isFinite(miles) || !Number.isFinite(chains) || chains >= 80) {
      throw new Error(`Invalid UK mileage value "${value}".`);
    }

    return convertMileage(miles, chains);
  }

  public toLinearPosition(
    code: string,
    mileage: string | number,
    direction: 'up' | 'down' = 'up',
  ): ELRLinearPosition {
    const resolution = this.resolveELR(code);
    const parsedMileage = this.parseMileage(mileage);

    return {
      direction,
      distance: parsedMileage.metres,
      trackId: resolution.trackId,
      type: CoordinateSystemType.Linear,
    };
  }

  public parse(input: ReadonlyArray<ELRSegmentInput>): ELRParseResult {
    const builder = new GraphBuilder();
    const lineEdges = new Map<string, string[]>();

    input.forEach((segment, index) => {
      const resolution = this.resolveELR(segment.elr);
      const start = this.toLinearPosition(
        segment.elr,
        segment.startMileage,
        segment.direction ?? 'up',
      );
      const end = this.toLinearPosition(
        segment.elr,
        segment.endMileage,
        segment.direction ?? 'up',
      );
      const startNodeId = `${resolution.trackId}-start-${index + 1}`;
      const endNodeId = `${resolution.trackId}-end-${index + 1}`;
      const edgeId = `${resolution.trackId}-edge-${index + 1}`;

      builder.addNode({
        coordinate: start,
        id: startNodeId,
        metadata: {
          elr: resolution.code,
          ...(resolution.naptanId ? { naptanId: resolution.naptanId } : {}),
        },
        name: segment.name ?? `${resolution.code} start`,
        type: 'station',
      });
      builder.addNode({
        coordinate: end,
        id: endNodeId,
        metadata: {
          elr: resolution.code,
          ...(segment.stationId ? { stationId: segment.stationId } : {}),
        },
        name: segment.name ?? `${resolution.code} end`,
        type: 'station',
      });
      builder.addEdge({
        geometry: createStraightGeometry(),
        id: edgeId,
        length: Math.abs(end.distance - start.distance),
        metadata: {
          direction: segment.direction ?? 'up',
          elr: resolution.code,
        },
        source: startNodeId,
        target: endNodeId,
      });

      const edges = lineEdges.get(resolution.trackId) ?? [];
      edges.push(edgeId);
      lineEdges.set(resolution.trackId, edges);
    });

    for (const [trackId, edges] of lineEdges.entries()) {
      builder.addLine({
        edges,
        id: trackId,
        metadata: {
          source: 'elr',
        },
        name: trackId,
      });
    }

    return {
      graph: builder.build(),
      segmentCount: input.length,
    };
  }
}

export class RINFAdapter {
  private readonly sections = new Map<string, RINFSection>();
  private readonly operationalPoints = new Map<string, RINFOperationalPoint>();

  public constructor(options: RINFAdapterOptions = {}) {
    (options.sections ?? []).forEach((section) => {
      this.sections.set(section.id, { ...section });
    });
    (options.operationalPoints ?? []).forEach((point) => {
      this.operationalPoints.set(point.id, { ...point });
    });
  }

  public resolveSectionOfLine(id: string): RINFSection {
    const section = this.sections.get(id);

    if (!section) {
      throw new Error(`Unknown RINF section-of-line "${id}".`);
    }

    return { ...section };
  }

  public resolveOperationalPoint(id: string): RINFOperationalPoint {
    const point = this.operationalPoints.get(id);

    if (!point) {
      throw new Error(`Unknown RINF operational point "${id}".`);
    }

    return { ...point };
  }

  public parse(input: RINFDocument | string): RINFParseResult {
    const document = typeof input === 'string'
      ? parseRINFString(input)
      : input;

    const mergedSections = [
      ...this.sections.values(),
      ...(document.sections ?? []),
    ];
    const mergedPoints = new Map(this.operationalPoints);

    (document.operationalPoints ?? []).forEach((point) => {
      mergedPoints.set(point.id, { ...point });
    });

    if (mergedSections.length === 0) {
      throw new Error('RINF input must contain at least one section.');
    }

    const builder = new GraphBuilder();
    const lineEdges = new Map<string, string[]>();

    mergedSections.forEach((section, index) => {
      const startPoint = section.startOperationalPointId
        ? mergedPoints.get(section.startOperationalPointId)
        : undefined;
      const endPoint = section.endOperationalPointId
        ? mergedPoints.get(section.endOperationalPointId)
        : undefined;
      const startNodeId = sanitizeIdentifier(
        section.startOperationalPointId ?? `${section.id}-start`,
        `${section.id}-start`,
      );
      const endNodeId = sanitizeIdentifier(
        section.endOperationalPointId ?? `${section.id}-end`,
        `${section.id}-end`,
      );
      const edgeId = `${sanitizeIdentifier(section.id, `section-${index + 1}`)}-edge`;

      builder.addNode({
        coordinate: createRINFNodeCoordinate(
          startPoint,
          section.trackId,
          section.startDistance,
        ),
        id: startNodeId,
        metadata: {
          sectionId: section.id,
        },
        name: startPoint?.name ?? `${section.name ?? section.id} start`,
        type: 'station',
      });
      builder.addNode({
        coordinate: createRINFNodeCoordinate(
          endPoint,
          section.trackId,
          section.endDistance,
        ),
        id: endNodeId,
        metadata: {
          sectionId: section.id,
        },
        name: endPoint?.name ?? `${section.name ?? section.id} end`,
        type: 'station',
      });
      builder.addEdge({
        geometry: createStraightGeometry(),
        id: edgeId,
        length: Math.abs(section.endDistance - section.startDistance),
        metadata: {
          rinfSectionId: section.id,
          trackId: section.trackId,
        },
        source: startNodeId,
        target: endNodeId,
      });

      const edges = lineEdges.get(section.trackId) ?? [];
      edges.push(edgeId);
      lineEdges.set(section.trackId, edges);
    });

    for (const [trackId, edges] of lineEdges.entries()) {
      builder.addLine({
        edges,
        id: sanitizeIdentifier(trackId, trackId),
        metadata: {
          source: 'rinf',
        },
        name: trackId,
      });
    }

    return {
      graph: builder.build(),
      operationalPointCount: mergedPoints.size,
      sectionCount: mergedSections.length,
    };
  }
}

function resolveHeaderReference(
  key: CsvColumnKey,
  headers: ReadonlyArray<string>,
): string | undefined {
  const normalizedHeaders = headers.map((header) => normalizeHeader(header));
  const alias = DEFAULT_CSV_MAPPINGS_WITH_HEADERS[key].find((candidate) =>
    normalizedHeaders.includes(candidate),
  );

  return alias;
}

function parseDelimitedRow(line: string, delimiter: string): ReadonlyArray<string> {
  const cells: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      const nextCharacter = line[index + 1];

      if (insideQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
        continue;
      }

      insideQuotes = !insideQuotes;
      continue;
    }

    if (!insideQuotes && line.startsWith(delimiter, index)) {
      cells.push(current.trim());
      current = '';
      index += delimiter.length - 1;
      continue;
    }

    current += character;
  }

  cells.push(current.trim());

  return cells;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
}

function sanitizeIdentifier(value: string, fallback: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '');

  return normalized || fallback;
}

function normalizeDistanceId(value: number): string {
  return value.toFixed(3).replace(/[^\d]+/gu, '-').replace(/^-+|-+$/gu, '');
}

function createStraightGeometry(
  points?: ReadonlyArray<Coordinate>,
): EdgeGeometry {
  return {
    ...(points && points.length > 0 ? { points } : {}),
    type: 'straight',
  } as EdgeGeometry;
}

function parseGeoJSONInput(input: GeoJSONFeatureCollection | string): GeoJSONFeatureCollection {
  if (typeof input === 'string') {
    try {
      return JSON.parse(input) as GeoJSONFeatureCollection;
    } catch {
      throw new Error('GeoJSON input must be valid JSON.');
    }
  }

  return input;
}

function extractGeoJSONCrs(featureCollection: GeoJSONFeatureCollection): string {
  const crsName = asString(featureCollection.crs?.properties?.name);

  return crsName ?? 'EPSG:4326';
}

function parseGeographicCoordinate(
  coordinate: ReadonlyArray<number> | undefined,
  featureId: string,
): {
  readonly type: CoordinateSystemType.Geographic;
  readonly latitude: number;
  readonly longitude: number;
} {
  const longitude = coordinate?.[0];
  const latitude = coordinate?.[1];

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    throw new Error(
      `GeoJSON feature "${featureId}" contains an invalid coordinate pair.`,
    );
  }

  return {
    latitude: latitude as number,
    longitude: longitude as number,
    type: CoordinateSystemType.Geographic,
  };
}

function calculatePathLength(
  points: ReadonlyArray<{
    readonly type: CoordinateSystemType;
    readonly latitude?: number;
    readonly longitude?: number;
  }>,
): number {
  let total = 0;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];

    if (
      previous?.type !== CoordinateSystemType.Geographic
      || current?.type !== CoordinateSystemType.Geographic
    ) {
      continue;
    }

    const previousPoint = previous;
    const currentPoint = current;

    total += haversineDistance(
      previousPoint.latitude,
      previousPoint.longitude,
      currentPoint.latitude,
      currentPoint.longitude,
    );
  }

  return total;
}

function haversineDistance(
  latitudeOne: number | undefined,
  longitudeOne: number | undefined,
  latitudeTwo: number | undefined,
  longitudeTwo: number | undefined,
): number {
  if (
    latitudeOne === undefined
    || longitudeOne === undefined
    || latitudeTwo === undefined
    || longitudeTwo === undefined
  ) {
    return 0;
  }

  const toRadians = (value: number): number => (value * Math.PI) / 180;
  const earthRadius = 6_371_000;
  const deltaLatitude = toRadians(latitudeTwo - latitudeOne);
  const deltaLongitude = toRadians(longitudeTwo - longitudeOne);
  const a = Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(toRadians(latitudeOne))
      * Math.cos(toRadians(latitudeTwo))
      * Math.sin(deltaLongitude / 2) ** 2;

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string'
    ? value
    : (typeof value === 'number' ? String(value) : undefined);
}

function convertMileage(miles: number, chains: number): ParsedMileage {
  const totalChains = (miles * 80) + chains;

  return {
    chains,
    metres: totalChains * 20.1168,
    miles,
    totalChains,
  };
}

function parseRINFString(input: string): RINFDocument {
  const trimmed = input.trim();

  if (trimmed.startsWith('<')) {
    return parseRINFXML(trimmed);
  }

  try {
    return JSON.parse(trimmed) as RINFDocument;
  } catch {
    throw new Error('RINF input must be valid JSON or XML.');
  }
}

function parseRINFXML(input: string): RINFDocument {
  const sectionMatches = Array.from(
    input.matchAll(/<section\s+([^>]+?)\s*\/>/giu),
    (match) => match[1] ?? '',
  );
  const pointMatches = Array.from(
    input.matchAll(/<operationalPoint\s+([^>]+?)\s*\/>/giu),
    (match) => match[1] ?? '',
  );

  return {
    operationalPoints: pointMatches.map((attributes) => {
      const values = parseXmlAttributes(attributes);
      const latitude = asFiniteNumber(values.lat);
      const longitude = asFiniteNumber(values.lon);

      return {
        ...(latitude !== undefined ? { latitude } : {}),
        ...(longitude !== undefined ? { longitude } : {}),
        id: values.id ?? 'unknown-point',
        name: values.name ?? values.id ?? 'Unknown',
      };
    }),
    sections: sectionMatches.map((attributes) => {
      const values = parseXmlAttributes(attributes);

      return {
        ...(values.name ? { name: values.name } : {}),
        ...(values.from ? { startOperationalPointId: values.from } : {}),
        ...(values.to ? { endOperationalPointId: values.to } : {}),
        endDistance: asFiniteNumber(values.end) ?? 0,
        id: values.id ?? 'unknown-section',
        startDistance: asFiniteNumber(values.start) ?? 0,
        trackId: values.trackId ?? values.track ?? values.id ?? 'unknown-track',
      };
    }),
  };
}

function parseXmlAttributes(input: string): Readonly<Record<string, string>> {
  const attributes: Record<string, string> = {};

  for (const match of input.matchAll(/([a-zA-Z0-9:_-]+)="([^"]*)"/gu)) {
    const key = match[1];
    const value = match[2] ?? '';

    if (key) {
      attributes[key] = value;
    }
  }

  return attributes;
}

function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function createRINFNodeCoordinate(
  point: RINFOperationalPoint | undefined,
  trackId: string,
  distance: number,
):
  | {
      readonly type: CoordinateSystemType.Geographic;
      readonly latitude: number;
      readonly longitude: number;
    }
  | {
      readonly type: CoordinateSystemType.Linear;
      readonly trackId: string;
      readonly distance: number;
    } {
  if (
    point?.latitude !== undefined
    && point.longitude !== undefined
  ) {
    return {
      latitude: point.latitude,
      longitude: point.longitude,
      type: CoordinateSystemType.Geographic,
    };
  }

  return {
    distance,
    trackId,
    type: CoordinateSystemType.Linear,
  };
}

export { DEFAULT_ELR_REFERENCES };
