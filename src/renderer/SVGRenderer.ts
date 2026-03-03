import { ValidationError } from '../errors';
import type { RailGraph, RailNode } from '../model';
import type { RailEdge, ScreenCoordinate } from '../types';
import { CoordinateSystemType, projectWebMercator } from '../coordinates';

import { generateCurvePath, generateStraightPath } from './primitives';
import { DEFAULT_STYLING, type StylingConfiguration } from './styling';
import { generateSwitchPath } from './switches';

interface RenderPointMap extends Map<string, ScreenCoordinate> {}

function mergeStyling(
  styling?: Partial<StylingConfiguration>,
): StylingConfiguration {
  return {
    track: {
      ...DEFAULT_STYLING.track,
      ...styling?.track,
    },
    station: {
      ...DEFAULT_STYLING.station,
      ...styling?.station,
    },
    signal: {
      ...DEFAULT_STYLING.signal,
      ...styling?.signal,
    },
    switch: {
      ...DEFAULT_STYLING.switch,
      ...styling?.switch,
    },
  };
}

export class SVGRenderer {
  public render(
    graph: RailGraph,
    styling?: Partial<StylingConfiguration>,
  ): string {
    const resolvedStyling = mergeStyling(styling);
    const points = this.projectNodes(graph);
    const { minX, minY, width, height } = this.computeViewBox(points);
    const edgeMarkup = Array.from(graph.edges.values())
      .map((edge) => this.renderEdge(edge, points, resolvedStyling))
      .join('');
    const nodeMarkup = Array.from(graph.nodes.values())
      .map((node) => this.renderNode(node, points, resolvedStyling))
      .join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" class="rail-schematic">${edgeMarkup}${nodeMarkup}</svg>`;
  }

  private projectNodes(graph: RailGraph): RenderPointMap {
    const points: RenderPointMap = new Map();

    for (const node of graph.nodes.values()) {
      switch (node.coordinate.type) {
        case CoordinateSystemType.Screen:
          points.set(node.id, node.coordinate);
          break;
        case CoordinateSystemType.Geographic:
          points.set(node.id, projectWebMercator(node.coordinate));
          break;
        default:
          throw new ValidationError(
            'SVGRenderer supports screen and geographic coordinates only.',
          );
      }
    }

    return points;
  }

  private computeViewBox(points: RenderPointMap): {
    readonly minX: number;
    readonly minY: number;
    readonly width: number;
    readonly height: number;
  } {
    const values = Array.from(points.values());

    if (values.length === 0) {
      return { minX: 0, minY: 0, width: 100, height: 100 };
    }

    const margin = 20;
    const xs = values.map((point) => point.x);
    const ys = values.map((point) => point.y);
    const rawMinX = Math.min(...xs);
    const rawMaxX = Math.max(...xs);
    const rawMinY = Math.min(...ys);
    const rawMaxY = Math.max(...ys);

    return {
      minX: rawMinX - margin,
      minY: rawMinY - margin,
      width: Math.max(rawMaxX - rawMinX + margin * 2, 1),
      height: Math.max(rawMaxY - rawMinY + margin * 2, 1),
    };
  }

  private renderEdge(
    edge: RailEdge,
    points: RenderPointMap,
    styling: StylingConfiguration,
  ): string {
    const start = points.get(edge.source);
    const end = points.get(edge.target);

    if (!start || !end) {
      throw new ValidationError(`Missing projected coordinates for edge ${edge.id}.`, {
        identifier: edge.id,
      });
    }

    const path = this.pathForEdge(edge, start, end, styling);
    const ballast = `<path d="${path}" class="rail-edge rail-edge--ballast rail-edge--${edge.geometry.type}" fill="none" stroke="${styling.track.fillColor}" stroke-width="${styling.track.strokeWidth + 4}" stroke-linecap="round" stroke-linejoin="round" />`;
    const centerline = `<path d="${path}" class="rail-edge rail-edge--${edge.geometry.type}" fill="none" stroke="${styling.track.strokeColor}" stroke-width="${styling.track.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`;

    return ballast + centerline;
  }

  private pathForEdge(
    edge: RailEdge,
    start: ScreenCoordinate,
    end: ScreenCoordinate,
    styling: StylingConfiguration,
  ): string {
    switch (edge.geometry.type) {
      case 'straight':
        return generateStraightPath(start, end, edge.geometry);
      case 'curve':
        return generateCurvePath(start, end, edge.geometry);
      case 'switch':
        return generateSwitchPath(start, end, edge.geometry, styling.switch.scaleFactor);
      default:
        return generateStraightPath(start, end);
    }
  }

  private renderNode(
    node: RailNode,
    points: RenderPointMap,
    styling: StylingConfiguration,
  ): string {
    const point = points.get(node.id);

    if (!point) {
      throw new ValidationError(`Missing projected coordinates for node ${node.id}.`, {
        identifier: node.id,
      });
    }

    if (node.type === 'station') {
      return `<circle class="rail-node rail-node--station" cx="${point.x}" cy="${point.y}" r="${styling.station.radius}" fill="${styling.station.fillColor}" stroke="${styling.station.strokeColor}" stroke-width="2" />`;
    }

    if (node.type === 'signal') {
      const size = styling.signal.size;
      const pointsAttribute = `${point.x},${point.y - size} ${point.x + size},${point.y + size} ${point.x - size},${point.y + size}`;

      return `<polygon class="rail-node rail-node--signal" points="${pointsAttribute}" fill="${styling.signal.fillColor}" />`;
    }

    return `<circle class="rail-node rail-node--${node.type}" cx="${point.x}" cy="${point.y}" r="${Math.max(
      styling.station.radius / 2,
      2,
    )}" fill="${styling.station.strokeColor}" />`;
  }
}
