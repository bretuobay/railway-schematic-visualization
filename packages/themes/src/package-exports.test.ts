import {
  BUILT_IN_THEMES,
  DEFAULT_THEME,
  PACKAGE_METADATA,
  ThemeManager,
  getPackageMetadata,
  themeToStylingConfiguration,
} from './index';

describe('@rail-schematic-viz/themes', () => {
  it('exposes stable package metadata and public theme helpers', () => {
    expect(PACKAGE_METADATA.packageName).toBe('@rail-schematic-viz/themes');
    expect(PACKAGE_METADATA.builtInThemeCount).toBe(4);
    expect(getPackageMetadata()).toEqual(PACKAGE_METADATA);
    expect(Object.keys(BUILT_IN_THEMES)).toHaveLength(4);
    expect(DEFAULT_THEME.name).toBe('default');
    expect(ThemeManager).toBeTypeOf('function');
    expect(themeToStylingConfiguration(DEFAULT_THEME).track?.strokeColor).toBe(
      DEFAULT_THEME.colors.track.main,
    );
  });
});
