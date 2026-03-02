import type { ScreenCoordinate, SwitchGeometry } from '../types';

function baseVector(start: ScreenCoordinate, end: ScreenCoordinate): {
  readonly x: number;
  readonly y: number;
  readonly normalX: number;
  readonly normalY: number;
} {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;

  return {
    x: dx / length,
    y: dy / length,
    normalX: -dy / length,
    normalY: dx / length,
  };
}

export function generateSwitchPath(
  start: ScreenCoordinate,
  end: ScreenCoordinate,
  geometry: SwitchGeometry,
  scaleFactor: number,
): string {
  const basis = baseVector(start, end);
  const branchLength = 20 * scaleFactor;
  const branchOffset = 10 * scaleFactor;
  const direction =
    geometry.switchType === 'right_turnout' ? -1 : 1;
  const branchX =
    start.x + basis.x * branchLength + basis.normalX * branchOffset * direction;
  const branchY =
    start.y + basis.y * branchLength + basis.normalY * branchOffset * direction;

  if (geometry.switchType === 'double_crossover') {
    const oppositeBranchX =
      start.x + basis.x * branchLength - basis.normalX * branchOffset;
    const oppositeBranchY =
      start.y + basis.y * branchLength - basis.normalY * branchOffset;

    return `M ${start.x} ${start.y} L ${end.x} ${end.y} M ${start.x} ${start.y} L ${branchX} ${branchY} M ${start.x} ${start.y} L ${oppositeBranchX} ${oppositeBranchY}`;
  }

  if (geometry.switchType === 'single_crossover') {
    return `M ${start.x} ${start.y} L ${end.x} ${end.y} M ${start.x} ${start.y} L ${branchX} ${branchY}`;
  }

  return `M ${start.x} ${start.y} L ${end.x} ${end.y} M ${start.x} ${start.y} L ${branchX} ${branchY}`;
}
