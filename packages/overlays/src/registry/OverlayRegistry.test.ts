import { describe, expect, it } from 'vitest';

import { OverlayRegistry } from './OverlayRegistry';

describe('OverlayRegistry behavior', () => {
  it('lists built-in overlay types', () => {
    const registry = new OverlayRegistry();

    expect(registry.listTypes()).toEqual([
      'annotation',
      'heat-map',
      'range-band',
      'time-series',
      'traffic-flow',
    ]);
  });

  it('does not unregister built-ins but removes custom registrations', () => {
    const registry = new OverlayRegistry();

    registry.register('custom', () => ({
      type: 'custom',
      initialize: () => undefined,
      render: () => ({ elementCount: 0, durationMs: 0 }),
      update: () => undefined,
      resize: () => undefined,
      destroy: () => undefined,
    }));

    expect(registry.unregister('heat-map')).toBe(false);
    expect(registry.unregister('custom')).toBe(true);
  });
});
