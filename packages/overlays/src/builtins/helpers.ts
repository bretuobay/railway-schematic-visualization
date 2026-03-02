import {
  CoordinateSystemType,
  type CoordinateBridge,
  type LinearCoordinate,
  type ScreenCoordinate,
} from '@rail-schematic-viz/core';

import { OverlayError } from '../errors';
import type { OverlayBounds, OverlayContext, OverlayDimensions, RenderContext } from '../types';

export type OverlayCoordinate = LinearCoordinate | ScreenCoordinate;

export function isScreenCoordinate(
  coordinate: OverlayCoordinate,
): coordinate is ScreenCoordinate {
  return coordinate.type === CoordinateSystemType.Screen;
}

export function projectCoordinate(
  coordinate: OverlayCoordinate,
  context: OverlayContext,
): ScreenCoordinate {
  if (isScreenCoordinate(coordinate)) {
    return coordinate;
  }

  const coordinateBridge = context.coordinateBridge as CoordinateBridge | undefined;

  if (!coordinateBridge) {
    throw new OverlayError(
      'A CoordinateBridge is required to render linear overlay coordinates.',
      'OVERLAY_RENDER',
    );
  }

  return coordinateBridge.projectToScreen(coordinate);
}

export function getOverlayDimensions(
  context: OverlayContext | undefined,
  renderContext: RenderContext,
): OverlayDimensions {
  return renderContext.dimensions ?? context?.dimensions ?? { width: 0, height: 0 };
}

export function midpoint(
  start: ScreenCoordinate,
  end: ScreenCoordinate,
): ScreenCoordinate {
  return {
    type: CoordinateSystemType.Screen,
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };
}

export function boundsAroundPoint(
  x: number,
  y: number,
  radius: number,
): OverlayBounds {
  return {
    minX: x - radius,
    minY: y - radius,
    maxX: x + radius,
    maxY: y + radius,
  };
}

export function intersectsBounds(
  left: OverlayBounds,
  right: OverlayBounds,
): boolean {
  return !(
    left.maxX < right.minX ||
    left.minX > right.maxX ||
    left.maxY < right.minY ||
    left.minY > right.maxY
  );
}

export function expandBounds(
  bounds: OverlayBounds,
  margin: number,
): OverlayBounds {
  return {
    minX: bounds.minX - margin,
    minY: bounds.minY - margin,
    maxX: bounds.maxX + margin,
    maxY: bounds.maxY + margin,
  };
}

export function isPointInBounds(
  x: number,
  y: number,
  bounds: OverlayBounds,
): boolean {
  return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function normalizeUnitInterval(
  value: number,
  min: number,
  max: number,
): number {
  if (min === max) {
    return 0;
  }

  return clamp((value - min) / (max - min), 0, 1);
}

export function withOpacity(hexColor: string, opacity: number): string {
  const alpha = Math.round(clamp(opacity, 0, 1) * 255)
    .toString(16)
    .padStart(2, '0');

  return `${hexColor}${alpha}`;
}
