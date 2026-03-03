import {
  loadCSVAdapter,
  loadELRAdapter,
  loadGeoJSONAdapter,
  loadRINFAdapter,
} from './lazy';

describe('@rail-schematic-viz/adapters-regional/lazy', () => {
  it('lazy-loads the regional adapters', async () => {
    await expect(loadCSVAdapter()).resolves.toBeTypeOf('function');
    await expect(loadGeoJSONAdapter()).resolves.toBeTypeOf('function');
    await expect(loadELRAdapter()).resolves.toBeTypeOf('function');
    await expect(loadRINFAdapter()).resolves.toBeTypeOf('function');
  });
});
