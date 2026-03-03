import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_LOCALE,
  I18nManager,
  type MissingTranslationWarning,
} from './index';

describe('I18nManager', () => {
  it('registers locales, switches locales, and lists built-in entries', () => {
    const manager = new I18nManager();

    expect(manager.getLocale()).toBe(DEFAULT_LOCALE);
    expect(manager.listLocales()).toEqual(['en-US', 'ar-SA', 'de-DE', 'fr-FR']);

    manager.registerLocale('es-ES', {
      controls: {
        zoom: {
          in: 'Acercar',
        },
      },
    });
    manager.setLocale('es-ES');

    expect(manager.getLocale()).toBe('es-ES');
    expect(manager.listLocales()).toContain('es-ES');
    expect(manager.t('controls.zoom.in')).toBe('Acercar');
  });

  it('falls back to the default locale for partial translations and warns on misses', () => {
    const warningHandler = vi.fn<(warning: MissingTranslationWarning) => void>();
    const manager = new I18nManager({
      warningHandler,
    });

    manager.setLocale('de-DE');

    expect(manager.t('controls.zoom.fitToView')).toBe('Auf Ansicht anpassen');
    expect(manager.t('contextMenu.exportSelection')).toBe('Export selection');
    expect(warningHandler).toHaveBeenCalledWith({
      fallbackLocale: 'en-US',
      key: 'contextMenu.exportSelection',
      locale: 'de-DE',
    });
    expect(manager.t('unknown.section.key')).toBe('unknown.section.key');
    expect(warningHandler).toHaveBeenLastCalledWith({
      fallbackLocale: 'en-US',
      key: 'unknown.section.key',
      locale: 'de-DE',
    });
  });

  it('supports parameter substitution and locale-aware number/date formatting', () => {
    const manager = new I18nManager();

    expect(
      manager.t('shortcuts.zoomIn', {
        shortcut: 'Ctrl++',
      }),
    ).toBe('Zoom in (Ctrl++)');
    expect(manager.formatNumber(12345.67, { maximumFractionDigits: 1 }, 'de-DE')).toContain(',');
    expect(
      manager.formatDate('2026-03-03T00:00:00.000Z', { timeZone: 'UTC' }, 'en-US'),
    ).toContain('2026');
  });

  it('detects RTL locales while keeping schematic direction LTR', () => {
    const manager = new I18nManager();

    manager.setLocale('ar-SA');

    expect(manager.isRTL()).toBe(true);
    expect(manager.isRTL('he-IL')).toBe(true);
    expect(manager.isRTL('fr-FR')).toBe(false);
    expect(manager.getDirections()).toEqual({
      locale: 'ar-SA',
      schematicDirection: 'ltr',
      uiDirection: 'rtl',
    });
    expect(manager.getDirections('fr-FR')).toEqual({
      locale: 'fr-FR',
      schematicDirection: 'ltr',
      uiDirection: 'ltr',
    });
  });

  it('rejects invalid locale identifiers and unknown locale switches', () => {
    const manager = new I18nManager();

    expect(() =>
      manager.registerLocale('bad_locale', {
        test: 'invalid',
      }),
    ).toThrow('valid BCP 47');
    expect(() => manager.setLocale('pt-BR')).toThrow('has not been registered');
    expect(() => new I18nManager({ defaultLocale: 'also_bad!' })).toThrow('valid BCP 47');
  });
});
