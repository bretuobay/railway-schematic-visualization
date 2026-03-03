import { ProjectionError } from '../errors';
import type { RailGraph } from '../model';
import type {
  LinearCoordinate,
  RailEdge,
  ScreenCoordinate,
} from '../types';

import { CoordinateSystemType } from './types';

interface SegmentIndexEntry {
  readonly edge: RailEdge;
  readonly trackId: string;
  readonly distanceStart: number;
  readonly distanceEnd: number;
  readonly rangeStart: number;
  readonly rangeEnd: number;
  readonly screenStart: ScreenCoordinate;
  readonly screenEnd: ScreenCoordinate;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

function distanceSquared(
  point: ScreenCoordinate,
  x: number,
  y: number,
): number {
  const dx = point.x - x;
  const dy = point.y - y;

  return dx * dx + dy * dy;
}

export class CoordinateBridge {
  private readonly segmentsByTrack = new Map<string, ReadonlyArray<SegmentIndexEntry>>();
  private readonly segments: ReadonlyArray<SegmentIndexEntry>;

  public constructor(
    private readonly linearGraph: RailGraph,
    private readonly screenGraph: RailGraph,
  ) {
    this.validateGraphPair();
    this.segments = this.buildSegmentIndex();
  }

  public projectToScreen(coordinate: LinearCoordinate): ScreenCoordinate {
    const segments = this.segmentsByTrack.get(coordinate.trackId);

    if (!segments || segments.length === 0) {
      throw new ProjectionError(`Unknown track "${coordinate.trackId}".`, {
        identifier: coordinate.trackId,
      });
    }

    const segment = this.findSegment(segments, coordinate.distance);

    if (!segment) {
      throw new ProjectionError(
        `Coordinate ${coordinate.distance} falls outside the valid track range.`,
        {
          identifier: coordinate.trackId,
          range: {
            min: segments[0]!.rangeStart,
            max: segments[segments.length - 1]!.rangeEnd,
          },
        },
      );
    }

    const span = segment.distanceEnd - segment.distanceStart;
    const factor = span === 0 ? 0 : (coordinate.distance - segment.distanceStart) / span;

    return this.interpolateScreen(segment, clamp(factor, 0, 1));
  }

  public projectToLinear(coordinate: ScreenCoordinate): LinearCoordinate {
    let bestMatch:
      | {
          readonly segment: SegmentIndexEntry;
          readonly factor: number;
          readonly distance: number;
        }
      | undefined;

    for (const segment of this.segments) {
      const match =
        segment.edge.geometry.type === 'curve'
          ? this.projectOntoCurve(segment, coordinate)
          : this.projectOntoStraight(segment, coordinate);

      if (!bestMatch || match.distance < bestMatch.distance) {
        bestMatch = {
          segment,
          factor: match.factor,
          distance: match.distance,
        };
      }
    }

    if (!bestMatch) {
      throw new ProjectionError('Cannot project a screen coordinate without indexed segments.');
    }

    return {
      type: CoordinateSystemType.Linear,
      trackId: bestMatch.segment.trackId,
      distance: lerp(
        bestMatch.segment.distanceStart,
        bestMatch.segment.distanceEnd,
        bestMatch.factor,
      ),
    };
  }

  private validateGraphPair(): void {
    if (this.linearGraph.coordinateSystem !== CoordinateSystemType.Linear) {
      throw new ProjectionError('Linear graph must use linear coordinates.');
    }

    if (this.screenGraph.coordinateSystem !== CoordinateSystemType.Screen) {
      throw new ProjectionError('Screen graph must use screen coordinates.');
    }

    if (this.linearGraph.edges.size !== this.screenGraph.edges.size) {
      throw new ProjectionError('Linear and screen graphs must have identical topology.');
    }

    for (const [edgeId, linearEdge] of this.linearGraph.edges) {
      const screenEdge = this.screenGraph.getEdge(edgeId);

      if (
        !screenEdge ||
        screenEdge.source !== linearEdge.source ||
        screenEdge.target !== linearEdge.target
      ) {
        throw new ProjectionError('Linear and screen graphs must have identical topology.', {
          identifier: edgeId,
        });
      }
    }
  }

  private buildSegmentIndex(): ReadonlyArray<SegmentIndexEntry> {
    const segments: SegmentIndexEntry[] = [];

    for (const linearEdge of this.linearGraph.edges.values()) {
      const screenEdge = this.screenGraph.getEdge(linearEdge.id);
      const linearSource = this.linearGraph.getNode(linearEdge.source);
      const linearTarget = this.linearGraph.getNode(linearEdge.target);
      const screenSource = this.screenGraph.getNode(linearEdge.source);
      const screenTarget = this.screenGraph.getNode(linearEdge.target);

      if (!screenEdge || !linearSource || !linearTarget || !screenSource || !screenTarget) {
        throw new ProjectionError('CoordinateBridge requires matching nodes and edges.');
      }

      if (
        linearSource.coordinate.type !== CoordinateSystemType.Linear ||
        linearTarget.coordinate.type !== CoordinateSystemType.Linear
      ) {
        throw new ProjectionError('Linear graph nodes must use linear coordinates.', {
          identifier: linearEdge.id,
        });
      }

      if (
        screenSource.coordinate.type !== CoordinateSystemType.Screen ||
        screenTarget.coordinate.type !== CoordinateSystemType.Screen
      ) {
        throw new ProjectionError('Screen graph nodes must use screen coordinates.', {
          identifier: linearEdge.id,
        });
      }

      if (linearSource.coordinate.trackId !== linearTarget.coordinate.trackId) {
        throw new ProjectionError('Linear edge endpoints must share the same trackId.', {
          identifier: linearEdge.id,
        });
      }

      segments.push({
        edge: screenEdge,
        trackId: linearSource.coordinate.trackId,
        distanceStart: linearSource.coordinate.distance,
        distanceEnd: linearTarget.coordinate.distance,
        rangeStart: Math.min(
          linearSource.coordinate.distance,
          linearTarget.coordinate.distance,
        ),
        rangeEnd: Math.max(
          linearSource.coordinate.distance,
          linearTarget.coordinate.distance,
        ),
        screenStart: screenSource.coordinate,
        screenEnd: screenTarget.coordinate,
      });
    }

    segments.sort((left, right) =>
      left.trackId.localeCompare(right.trackId) || left.rangeStart - right.rangeStart,
    );

    for (const segment of segments) {
      const existing = this.segmentsByTrack.get(segment.trackId) ?? [];
      this.segmentsByTrack.set(segment.trackId, [...existing, segment]);
    }

    return segments;
  }

  private findSegment(
    segments: ReadonlyArray<SegmentIndexEntry>,
    distance: number,
  ): SegmentIndexEntry | undefined {
    let low = 0;
    let high = segments.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const segment = segments[mid]!;

      if (distance < segment.rangeStart) {
        high = mid - 1;
        continue;
      }

      if (distance > segment.rangeEnd) {
        low = mid + 1;
        continue;
      }

      return segment;
    }

    return undefined;
  }

  private interpolateScreen(
    segment: SegmentIndexEntry,
    factor: number,
  ): ScreenCoordinate {
    if (segment.edge.geometry.type === 'curve') {
      const point = this.evaluateCurve(segment, factor);

      return {
        type: CoordinateSystemType.Screen,
        x: point.x,
        y: point.y,
      };
    }

    return {
      type: CoordinateSystemType.Screen,
      x: lerp(segment.screenStart.x, segment.screenEnd.x, factor),
      y: lerp(segment.screenStart.y, segment.screenEnd.y, factor),
    };
  }

  private evaluateCurve(
    segment: SegmentIndexEntry,
    factor: number,
  ): { readonly x: number; readonly y: number } {
    const control = this.curveControlPoint(segment);
    const inverse = 1 - factor;

    return {
      x:
        inverse * inverse * segment.screenStart.x +
        2 * inverse * factor * control.x +
        factor * factor * segment.screenEnd.x,
      y:
        inverse * inverse * segment.screenStart.y +
        2 * inverse * factor * control.y +
        factor * factor * segment.screenEnd.y,
    };
  }

  private curveControlPoint(
    segment: SegmentIndexEntry,
  ): { readonly x: number; readonly y: number } {
    const geometry = segment.edge.geometry;

    if (geometry.type !== 'curve') {
      return {
        x: lerp(segment.screenStart.x, segment.screenEnd.x, 0.5),
        y: lerp(segment.screenStart.y, segment.screenEnd.y, 0.5),
      };
    }

    const dx = segment.screenEnd.x - segment.screenStart.x;
    const dy = segment.screenEnd.y - segment.screenStart.y;
    const length = Math.hypot(dx, dy) || 1;
    const normalX = -dy / length;
    const normalY = dx / length;
    const offset = geometry.curvature * 10;

    return {
      x: lerp(segment.screenStart.x, segment.screenEnd.x, 0.5) + normalX * offset,
      y: lerp(segment.screenStart.y, segment.screenEnd.y, 0.5) + normalY * offset,
    };
  }

  private projectOntoStraight(
    segment: SegmentIndexEntry,
    coordinate: ScreenCoordinate,
  ): { readonly factor: number; readonly distance: number } {
    const dx = segment.screenEnd.x - segment.screenStart.x;
    const dy = segment.screenEnd.y - segment.screenStart.y;
    const lengthSquared = dx * dx + dy * dy || 1;
    const rawFactor =
      ((coordinate.x - segment.screenStart.x) * dx +
        (coordinate.y - segment.screenStart.y) * dy) /
      lengthSquared;
    const factor = clamp(rawFactor, 0, 1);
    const projectedX = lerp(segment.screenStart.x, segment.screenEnd.x, factor);
    const projectedY = lerp(segment.screenStart.y, segment.screenEnd.y, factor);

    return {
      factor,
      distance: distanceSquared(coordinate, projectedX, projectedY),
    };
  }

  private projectOntoCurve(
    segment: SegmentIndexEntry,
    coordinate: ScreenCoordinate,
  ): { readonly factor: number; readonly distance: number } {
    let bestFactor = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let step = 0; step <= 40; step += 1) {
      const factor = step / 40;
      const projected = this.evaluateCurve(segment, factor);
      const currentDistance = distanceSquared(coordinate, projected.x, projected.y);

      if (currentDistance < bestDistance) {
        bestFactor = factor;
        bestDistance = currentDistance;
      }
    }

    return {
      factor: bestFactor,
      distance: bestDistance,
    };
  }
}
