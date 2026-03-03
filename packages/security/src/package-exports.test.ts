import {
  CSPValidator,
  InputValidator,
  PACKAGE_METADATA,
  PrivacyGuard,
  XSSSanitizer,
  getPackageMetadata,
} from './index';

describe('@rail-schematic-viz/security', () => {
  it('exposes stable package metadata and public security APIs', () => {
    expect(PACKAGE_METADATA.packageName).toBe('@rail-schematic-viz/security');
    expect(PACKAGE_METADATA.privacyByDefault).toBe(true);
    expect(getPackageMetadata()).toEqual(PACKAGE_METADATA);
    expect(XSSSanitizer).toBeTypeOf('function');
    expect(CSPValidator).toBeTypeOf('function');
    expect(InputValidator).toBeTypeOf('function');
    expect(PrivacyGuard).toBeTypeOf('function');
  });
});
