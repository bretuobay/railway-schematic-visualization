import {
  BrushingLinkingCoordinatorImpl,
  CoordinateSystemType,
  PACKAGE_METADATA,
  getPackageMetadata,
} from './index';

describe('@rail-schematic-viz/brushing-linking', () => {
  it('exposes stable package metadata and the public coordinator', () => {
    expect(PACKAGE_METADATA.packageName).toBe('@rail-schematic-viz/brushing-linking');
    expect(PACKAGE_METADATA.supportsBidirectionalTransforms).toBe(true);
    expect(getPackageMetadata()).toEqual(PACKAGE_METADATA);
    expect(BrushingLinkingCoordinatorImpl).toBeTypeOf('function');
    expect(CoordinateSystemType.Screen).toBe('screen');
  });
});
