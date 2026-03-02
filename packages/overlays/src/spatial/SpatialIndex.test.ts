import { describe, expect, it } from 'vitest';

import { SpatialIndex } from './SpatialIndex';

describe('SpatialIndex', () => {
  it('inserts and searches entries by bounding box', () => {
    const index = new SpatialIndex<string>();

    index.insert({
      minX: 0,
      minY: 0,
      maxX: 10,
      maxY: 10,
      value: 'inside',
    });
    index.insert({
      minX: 20,
      minY: 20,
      maxX: 30,
      maxY: 30,
      value: 'outside',
    });

    expect(index.search({ minX: 5, minY: 5, maxX: 15, maxY: 15 })).toEqual([
      {
        minX: 0,
        minY: 0,
        maxX: 10,
        maxY: 10,
        value: 'inside',
      },
    ]);
  });

  it('supports bulk loading and removal', () => {
    const index = new SpatialIndex<string>();
    const entry = {
      minX: 0,
      minY: 0,
      maxX: 5,
      maxY: 5,
      value: 'a',
    };

    index.bulkLoad([entry]);

    expect(index.size).toBe(1);
    expect(index.remove(entry)).toBe(true);
    expect(index.size).toBe(0);
  });
});
