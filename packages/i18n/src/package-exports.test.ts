import {
  AR_SA_TRANSLATIONS,
  COMMON_LOCALE_TRANSLATIONS,
  DEFAULT_LOCALE,
  EN_US_TRANSLATIONS,
  I18nManager,
  PACKAGE_METADATA,
  TRANSLATION_KEY_TEMPLATE,
  getPackageMetadata,
} from './index';

describe('@rail-schematic-viz/i18n', () => {
  it('exposes stable package metadata and built-in locale templates', () => {
    expect(PACKAGE_METADATA.packageName).toBe('@rail-schematic-viz/i18n');
    expect(PACKAGE_METADATA.defaultLocale).toBe(DEFAULT_LOCALE);
    expect(PACKAGE_METADATA.builtInLocaleCount).toBe(4);
    expect(getPackageMetadata()).toEqual(PACKAGE_METADATA);
    expect(EN_US_TRANSLATIONS.controls.zoom.in).toBe('Zoom in');
    expect(AR_SA_TRANSLATIONS.controls.minimap.title).toBe('الخريطة المصغرة');
    expect(COMMON_LOCALE_TRANSLATIONS['de-DE']).toBeDefined();
    expect(TRANSLATION_KEY_TEMPLATE.contextMenu.viewDetails).toBe('View details');
    expect(I18nManager).toBeTypeOf('function');
  });
});
