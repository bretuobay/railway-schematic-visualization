import type { CurveGeometry, ScreenCoordinate, StraightGeometry } from '../types';

function controlPoints(
  start: ScreenCoordinate,
  end: ScreenCoordinate,
  curvature: number,
): {
  readonly c1x: number;
  readonly c1y: number;
  readonly c2x: number;
  readonly c2y: number;
} {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const normalX = -dy / length;
  const normalY = dx / length;
  const offset = curvature * 10;

  return {
    c1x: start.x + dx / 3 + normalX * offset,
    c1y: start.y + dy / 3 + normalY * offset,
    c2x: start.x + (2 * dx) / 3 + normalX * offset,
    c2y: start.y + (2 * dy) / 3 + normalY * offset,
  };
}

export function generateStraightPath(
  start: ScreenCoordinate,
  end: ScreenCoordinate,
  _geometry?: StraightGeometry,
): string {
  return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
}

export function generateCurvePath(
  start: ScreenCoordinate,
  end: ScreenCoordinate,
  geometry: CurveGeometry,
): string {
  const controls = controlPoints(start, end, geometry.curvature);

  return `M ${start.x} ${start.y} C ${controls.c1x} ${controls.c1y}, ${controls.c2x} ${controls.c2y}, ${end.x} ${end.y}`;
}
