import { describe, expect, it, vi } from 'vitest';

import {
  BUILT_IN_THEMES,
  COLOR_BLIND_SAFE_THEME_NAME,
  DEFAULT_THEME_NAME,
  HIGH_CONTRAST_THEME_NAME,
  ThemeManager,
  type ThemeChangeEvent,
} from './index';

class MockCssTarget {
  public readonly properties = new Map<string, string>();

  public setProperty(name: string, value: string): void {
    this.properties.set(name, value);
  }
}

describe('ThemeManager', () => {
  it('applies the default theme automatically and exposes all built-in themes', () => {
    const cssTarget = new MockCssTarget();
    const manager = new ThemeManager({
      cssTarget,
    });

    expect(manager.getCurrentThemeName()).toBe(DEFAULT_THEME_NAME);
    expect(manager.listThemes()).toEqual([
      'default',
      'dark',
      'high-contrast',
      'color-blind-safe',
    ]);
    expect(cssTarget.properties.get('--rail-name')).toBe('default');
    expect(cssTarget.properties.get('--rail-colors-track-main')).toBe(
      BUILT_IN_THEMES.default.colors.track.main,
    );
  });

  it('switches themes, updates CSS variables, and emits theme-change events synchronously', () => {
    const cssTarget = new MockCssTarget();
    const manager = new ThemeManager({
      cssTarget,
    });
    const listener = vi.fn<(event: ThemeChangeEvent) => void>();
    const unsubscribe = manager.onThemeChange(listener);
    const start = Date.now();

    const theme = manager.setTheme(COLOR_BLIND_SAFE_THEME_NAME);

    expect(theme.name).toBe(COLOR_BLIND_SAFE_THEME_NAME);
    expect(manager.getCurrentThemeName()).toBe(COLOR_BLIND_SAFE_THEME_NAME);
    expect(cssTarget.properties.get('--rail-colors-track-branch')).toBe(
      BUILT_IN_THEMES[COLOR_BLIND_SAFE_THEME_NAME].colors.track.branch,
    );
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        currentThemeName: COLOR_BLIND_SAFE_THEME_NAME,
        previousThemeName: DEFAULT_THEME_NAME,
      }),
    );
    expect(listener.mock.calls[0]?.[0].appliedAt).toBeLessThanOrEqual(start + 100);

    unsubscribe();
    manager.setTheme(HIGH_CONTRAST_THEME_NAME);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('creates and registers extended themes without mutating the base theme', () => {
    const manager = new ThemeManager();
    const customTheme = manager.createTheme(
      'ops-console',
      {
        colors: {
          track: {
            main: '#0f766e',
          },
          ui: {
            background: '#ecfeff',
          },
        },
        sizing: {
          trackWidth: 6,
        },
        typography: {
          fontSize: {
            label: 15,
          },
        },
      },
      DEFAULT_THEME_NAME,
    );

    expect(customTheme.colors.track.main).toBe('#0f766e');
    expect(customTheme.colors.ui.background).toBe('#ecfeff');
    expect(customTheme.sizing.trackWidth).toBe(6);
    expect(customTheme.typography.fontSize.label).toBe(15);
    expect(BUILT_IN_THEMES.default.colors.track.main).toBe('#2563eb');

    manager.registerTheme(customTheme);

    expect(manager.getTheme('ops-console')).toEqual(customTheme);
    expect(manager.listThemes()).toContain('ops-console');
  });

  it('validates contrast requirements and rejects inaccessible themes during registration', () => {
    const manager = new ThemeManager();
    const invalidTheme = manager.createTheme('invalid-theme', {
      accessibility: {
        contrastRatio: {
          normalText: 7,
        },
      },
      colors: {
        element: {
          signalFill: '#888888',
          signalStroke: '#999999',
          stationFill: '#ffffff',
          stationStroke: '#f5f5f5',
        },
        ui: {
          background: '#ffffff',
          mutedText: '#f5f5f5',
          text: '#eeeeee',
        },
      },
    });
    const validation = manager.validateTheme(invalidTheme);

    expect(validation.isValid).toBe(false);
    expect(validation.violations.map((violation) => violation.token)).toContain(
      'colors.ui.text',
    );
    expect(() => manager.registerTheme(invalidTheme)).toThrow(
      'does not meet contrast requirements',
    );
  });

  it('keeps all built-in themes contrast-valid and maps them to core styling', () => {
    const manager = new ThemeManager();

    for (const builtInTheme of Object.values(BUILT_IN_THEMES)) {
      expect(manager.validateTheme(builtInTheme).isValid).toBe(true);

      const styling = manager.getTheme(builtInTheme.name);

      expect(styling).toBeDefined();
      expect(manager.getCSSVariables(builtInTheme.name)).toHaveProperty(
        '--rail-accessibility-focus-indicator-color',
      );
    }

    expect(manager.getCurrentStylingConfiguration()).toEqual(
      expect.objectContaining({
        track: expect.objectContaining({
          strokeColor: BUILT_IN_THEMES.default.colors.track.main,
        }),
      }),
    );
  });
});
