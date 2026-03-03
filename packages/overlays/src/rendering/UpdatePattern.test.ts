import { describe, expect, it } from 'vitest';

import { UpdatePattern, sortByRenderOrder } from './UpdatePattern';

describe('UpdatePattern', () => {
  it('tracks enter, update, and exit states', () => {
    const pattern = new UpdatePattern<{ readonly id: string }>();

    expect(pattern.apply([{ id: 'a' }])).toEqual({
      enter: [{ id: 'a' }],
      update: [],
      exit: [],
    });
    expect(pattern.apply([{ id: 'a' }, { id: 'b' }])).toEqual({
      enter: [{ id: 'b' }],
      update: [{ id: 'a' }, { id: 'b' }].filter((item) => item.id === 'a'),
      exit: [],
    });
    expect(pattern.apply([{ id: 'b' }])).toEqual({
      enter: [],
      update: [{ id: 'b' }],
      exit: [{ id: 'a' }],
    });
  });

  it('resets previous state', () => {
    const pattern = new UpdatePattern<{ readonly id: string }>();

    pattern.apply([{ id: 'a' }]);
    pattern.reset();

    expect(pattern.apply([{ id: 'a' }]).enter).toEqual([{ id: 'a' }]);
  });

  it('sorts by z-index and id', () => {
    const ordered = sortByRenderOrder([
      { id: 'b', geometry: { type: 'point', x: 0, y: 0 }, zIndex: 1 },
      { id: 'a', geometry: { type: 'point', x: 0, y: 0 }, zIndex: 1 },
      { id: 'c', geometry: { type: 'point', x: 0, y: 0 }, zIndex: 0 },
    ]);

    expect(ordered.map((element) => element.id)).toEqual(['c', 'a', 'b']);
  });
});
