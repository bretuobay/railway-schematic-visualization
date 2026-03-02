import { describe, expect, it } from 'vitest';

import { CoordinateSystemType } from './types';
import { inverseWebMercator, projectWebMercator } from './projections';

describe('Web Mercator projections', () => {
  it('projects the origin to zero', () => {
    const projected = projectWebMercator({
      type: CoordinateSystemType.Geographic,
      latitude: 0,
      longitude: 0,
    });

    expect(projected.x).toBeCloseTo(0, 8);
    expect(projected.y).toBeCloseTo(0, 8);
  });

  it('inverts a projected coordinate back to latitude and longitude', () => {
    const original = {
      type: CoordinateSystemType.Geographic,
      latitude: 51.5007,
      longitude: -0.1246,
    } as const;

    const recovered = inverseWebMercator(projectWebMercator(original));

    expect(recovered.latitude).toBeCloseTo(original.latitude, 6);
    expect(recovered.longitude).toBeCloseTo(original.longitude, 6);
  });

  it('stays within a tight round-trip tolerance', () => {
    const original = {
      type: CoordinateSystemType.Geographic,
      latitude: 40.7128,
      longitude: -74.006,
    } as const;

    const recovered = inverseWebMercator(projectWebMercator(original));

    expect(Math.abs(recovered.latitude - original.latitude)).toBeLessThan(0.000001);
    expect(Math.abs(recovered.longitude - original.longitude)).toBeLessThan(0.000001);
  });
});
