import { describe, expect, it } from 'vitest';

import { CoordinateSystemType } from '../coordinates';
import { generateCurvePath, generateStraightPath } from './primitives';
import { generateSwitchPath } from './switches';

const start = { type: CoordinateSystemType.Screen, x: 0, y: 0 } as const;
const end = { type: CoordinateSystemType.Screen, x: 100, y: 0 } as const;

describe('track primitives', () => {
  it('renders straight track geometry as a line path', () => {
    expect(generateStraightPath(start, end)).toContain('L 100 0');
  });

  it('renders curve geometry as a cubic bezier path', () => {
    expect(generateCurvePath(start, end, { type: 'curve', curvature: 1 })).toContain('C');
  });

  it('renders switch templates for switch geometries', () => {
    expect(
      generateSwitchPath(
        start,
        end,
        { type: 'switch', switchType: 'left_turnout', orientation: 0 },
        1,
      ),
    ).toContain('M 0 0');
  });
});
