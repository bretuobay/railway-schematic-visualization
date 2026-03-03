import {
  CSVAdapter,
  ELRAdapter,
  GeoJSONAdapter,
  PACKAGE_METADATA,
  RINFAdapter,
  getPackageMetadata,
} from './index';

describe('@rail-schematic-viz/adapters-regional', () => {
  it('exposes stable package metadata and public regional adapters', () => {
    expect(PACKAGE_METADATA.packageName).toBe('@rail-schematic-viz/adapters-regional');
    expect(PACKAGE_METADATA.adapterCount).toBe(4);
    expect(getPackageMetadata()).toEqual(PACKAGE_METADATA);
    expect(CSVAdapter).toBeTypeOf('function');
    expect(GeoJSONAdapter).toBeTypeOf('function');
    expect(ELRAdapter).toBeTypeOf('function');
    expect(RINFAdapter).toBeTypeOf('function');
  });
});
