import { describe, expect, it } from 'vitest';

import { DEFAULT_STYLING } from './styling';

describe('DEFAULT_STYLING', () => {
  it('defines the default styling contract', () => {
    expect(DEFAULT_STYLING.track.strokeColor).toBeTypeOf('string');
    expect(DEFAULT_STYLING.track.strokeWidth).toBeGreaterThan(0);
    expect(DEFAULT_STYLING.station.radius).toBeGreaterThan(0);
    expect(DEFAULT_STYLING.signal.size).toBeGreaterThan(0);
    expect(DEFAULT_STYLING.switch.scaleFactor).toBeGreaterThan(0);
  });
});
