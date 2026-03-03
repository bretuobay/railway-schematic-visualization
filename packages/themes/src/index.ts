import type { StylingConfiguration } from '@rail-schematic-viz/core';

export interface ThemeColors {
  readonly track: {
    readonly main: string;
    readonly branch: string;
    readonly closed: string;
    readonly ballast: string;
    readonly outline: string;
  };
  readonly element: {
    readonly stationFill: string;
    readonly stationStroke: string;
    readonly signalFill: string;
    readonly signalStroke: string;
    readonly switchFill: string;
  };
  readonly ui: {
    readonly background: string;
    readonly surface: string;
    readonly text: string;
    readonly mutedText: string;
    readonly border: string;
    readonly focusRing: string;
  };
  readonly state: {
    readonly selection: string;
    readonly hover: string;
    readonly success: string;
    readonly warning: string;
    readonly danger: string;
    readonly disabled: string;
  };
}

export interface ThemeTypography {
  readonly fontFamily: string;
  readonly fontSize: {
    readonly base: number;
    readonly label: number;
    readonly caption: number;
  };
  readonly fontWeight: {
    readonly regular: number;
    readonly medium: number;
    readonly bold: number;
  };
}

export interface ThemeSizing {
  readonly trackWidth: number;
  readonly markerSize: number;
  readonly iconSize: number;
  readonly lineWidth: number;
}

export interface ThemeAccessibility {
  readonly contrastRatio: {
    readonly normalText: number;
    readonly largeText: number;
    readonly interactive: number;
  };
  readonly focusIndicator: {
    readonly color: string;
    readonly width: number;
    readonly offset: number;
  };
  readonly patterns: {
    readonly branch: string;
    readonly closed: string;
    readonly highEmphasis: string;
  };
}

export interface Theme {
  readonly name: string;
  readonly description: string;
  readonly builtIn: boolean;
  readonly isDark: boolean;
  readonly colors: ThemeColors;
  readonly typography: ThemeTypography;
  readonly sizing: ThemeSizing;
  readonly accessibility: ThemeAccessibility;
}

type Primitive = string | number | boolean;

type DeepPartial<T> = {
  readonly [Key in keyof T]?: T[Key] extends Primitive
    ? T[Key]
    : T[Key] extends object
      ? DeepPartial<T[Key]>
      : T[Key];
};

export type ThemeOverrides = DeepPartial<Omit<Theme, 'name'>>;

export interface ContrastViolation {
  readonly token: string;
  readonly foreground: string;
  readonly background: string;
  readonly ratio: number;
  readonly required: number;
  readonly message: string;
}

export interface ValidationResult {
  readonly isValid: boolean;
  readonly violations: ReadonlyArray<ContrastViolation>;
}

export interface ThemeCssTarget {
  setProperty(name: string, value: string): void;
}

export interface ThemeChangeEvent {
  readonly previousThemeName: string | null;
  readonly currentThemeName: string;
  readonly theme: Theme;
  readonly cssVariables: Readonly<Record<string, string>>;
  readonly appliedAt: number;
}

export interface ThemeManagerOptions {
  readonly cssTarget?: ThemeCssTarget;
  readonly initialTheme?: string;
}

export interface ThemesPackageMetadata {
  readonly packageName: '@rail-schematic-viz/themes';
  readonly builtInThemeCount: number;
}

type ThemeChangeListener = (event: ThemeChangeEvent) => void;

const DEFAULT_FONT_FAMILY = '"IBM Plex Sans", "Segoe UI", sans-serif';

export const DEFAULT_THEME_NAME = 'default';
export const DARK_THEME_NAME = 'dark';
export const HIGH_CONTRAST_THEME_NAME = 'high-contrast';
export const COLOR_BLIND_SAFE_THEME_NAME = 'color-blind-safe';

export const DEFAULT_THEME: Theme = {
  name: DEFAULT_THEME_NAME,
  description: 'Balanced railway schematic theme for default light-mode rendering.',
  builtIn: true,
  isDark: false,
  colors: {
    track: {
      main: '#2563eb',
      branch: '#059669',
      closed: '#dc2626',
      ballast: '#cbd5e1',
      outline: '#1e293b',
    },
    element: {
      stationFill: '#ffffff',
      stationStroke: '#0f172a',
      signalFill: '#991b1b',
      signalStroke: '#ffffff',
      switchFill: '#475569',
    },
    ui: {
      background: '#f8fafc',
      surface: '#ffffff',
      text: '#0f172a',
      mutedText: '#334155',
      border: '#cbd5e1',
      focusRing: '#1d4ed8',
    },
    state: {
      selection: '#ea580c',
      hover: '#0284c7',
      success: '#15803d',
      warning: '#b45309',
      danger: '#b91c1c',
      disabled: '#94a3b8',
    },
  },
  typography: {
    fontFamily: DEFAULT_FONT_FAMILY,
    fontSize: {
      base: 14,
      label: 13,
      caption: 12,
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      bold: 700,
    },
  },
  sizing: {
    trackWidth: 4,
    markerSize: 6,
    iconSize: 16,
    lineWidth: 2,
  },
  accessibility: {
    contrastRatio: {
      normalText: 4.5,
      largeText: 3,
      interactive: 3,
    },
    focusIndicator: {
      color: '#1d4ed8',
      width: 2,
      offset: 2,
    },
    patterns: {
      branch: 'solid-branch',
      closed: 'diagonal-stripes',
      highEmphasis: 'solid-ring',
    },
  },
};

export const DARK_THEME: Theme = {
  name: DARK_THEME_NAME,
  description: 'Low-light theme with high legibility on dark surfaces.',
  builtIn: true,
  isDark: true,
  colors: {
    track: {
      main: '#60a5fa',
      branch: '#34d399',
      closed: '#f87171',
      ballast: '#334155',
      outline: '#e2e8f0',
    },
    element: {
      stationFill: '#0f172a',
      stationStroke: '#f8fafc',
      signalFill: '#fb7185',
      signalStroke: '#0f172a',
      switchFill: '#94a3b8',
    },
    ui: {
      background: '#020617',
      surface: '#0f172a',
      text: '#e2e8f0',
      mutedText: '#cbd5e1',
      border: '#334155',
      focusRing: '#f8fafc',
    },
    state: {
      selection: '#f59e0b',
      hover: '#38bdf8',
      success: '#4ade80',
      warning: '#fbbf24',
      danger: '#f87171',
      disabled: '#64748b',
    },
  },
  typography: DEFAULT_THEME.typography,
  sizing: DEFAULT_THEME.sizing,
  accessibility: {
    contrastRatio: {
      normalText: 4.5,
      largeText: 3,
      interactive: 3,
    },
    focusIndicator: {
      color: '#f8fafc',
      width: 2,
      offset: 2,
    },
    patterns: {
      branch: 'solid-branch',
      closed: 'diagonal-stripes',
      highEmphasis: 'soft-grid',
    },
  },
};

export const HIGH_CONTRAST_THEME: Theme = {
  name: HIGH_CONTRAST_THEME_NAME,
  description: 'WCAG AAA-oriented theme using stark contrast and redundant patterns.',
  builtIn: true,
  isDark: false,
  colors: {
    track: {
      main: '#ffffff',
      branch: '#00ffff',
      closed: '#ffff00',
      ballast: '#000000',
      outline: '#ffffff',
    },
    element: {
      stationFill: '#000000',
      stationStroke: '#ffffff',
      signalFill: '#ffff00',
      signalStroke: '#000000',
      switchFill: '#ffffff',
    },
    ui: {
      background: '#000000',
      surface: '#000000',
      text: '#ffffff',
      mutedText: '#ffffff',
      border: '#ffffff',
      focusRing: '#ffff00',
    },
    state: {
      selection: '#00ffff',
      hover: '#ffffff',
      success: '#00ff00',
      warning: '#ffff00',
      danger: '#ff4d4d',
      disabled: '#808080',
    },
  },
  typography: DEFAULT_THEME.typography,
  sizing: {
    ...DEFAULT_THEME.sizing,
    lineWidth: 3,
    trackWidth: 5,
  },
  accessibility: {
    contrastRatio: {
      normalText: 7,
      largeText: 4.5,
      interactive: 4.5,
    },
    focusIndicator: {
      color: '#ffff00',
      width: 3,
      offset: 3,
    },
    patterns: {
      branch: 'solid-double-line',
      closed: 'thick-crosshatch',
      highEmphasis: 'checkerboard',
    },
  },
};

export const COLOR_BLIND_SAFE_THEME: Theme = {
  name: COLOR_BLIND_SAFE_THEME_NAME,
  description: 'Color-blind safe theme using Okabe-Ito-inspired track colors and texture cues.',
  builtIn: true,
  isDark: false,
  colors: {
    track: {
      main: '#0072b2',
      branch: '#009e73',
      closed: '#d55e00',
      ballast: '#d1d5db',
      outline: '#111827',
    },
    element: {
      stationFill: '#ffffff',
      stationStroke: '#111827',
      signalFill: '#cc79a7',
      signalStroke: '#111827',
      switchFill: '#56b4e9',
    },
    ui: {
      background: '#f9fafb',
      surface: '#ffffff',
      text: '#111827',
      mutedText: '#374151',
      border: '#d1d5db',
      focusRing: '#0072b2',
    },
    state: {
      selection: '#e69f00',
      hover: '#56b4e9',
      success: '#009e73',
      warning: '#e69f00',
      danger: '#d55e00',
      disabled: '#9ca3af',
    },
  },
  typography: DEFAULT_THEME.typography,
  sizing: DEFAULT_THEME.sizing,
  accessibility: {
    contrastRatio: {
      normalText: 4.5,
      largeText: 3,
      interactive: 3,
    },
    focusIndicator: {
      color: '#0072b2',
      width: 2,
      offset: 2,
    },
    patterns: {
      branch: 'dense-dots',
      closed: 'wide-diagonal-stripes',
      highEmphasis: 'cross-grid',
    },
  },
};

export const BUILT_IN_THEMES = {
  [DEFAULT_THEME_NAME]: DEFAULT_THEME,
  [DARK_THEME_NAME]: DARK_THEME,
  [HIGH_CONTRAST_THEME_NAME]: HIGH_CONTRAST_THEME,
  [COLOR_BLIND_SAFE_THEME_NAME]: COLOR_BLIND_SAFE_THEME,
} as const;

export const PACKAGE_METADATA = {
  packageName: '@rail-schematic-viz/themes',
  builtInThemeCount: Object.keys(BUILT_IN_THEMES).length,
} as const satisfies ThemesPackageMetadata;

export function getPackageMetadata(): ThemesPackageMetadata {
  return PACKAGE_METADATA;
}

export function themeToStylingConfiguration(
  theme: Theme,
): Partial<StylingConfiguration> {
  return {
    signal: {
      fillColor: theme.colors.element.signalFill,
      size: Math.max(theme.sizing.markerSize, 1),
    },
    station: {
      fillColor: theme.colors.element.stationFill,
      radius: Math.max(theme.sizing.markerSize, 1),
      strokeColor: theme.colors.element.stationStroke,
    },
    switch: {
      scaleFactor: Math.max(theme.sizing.lineWidth / 2, 1),
    },
    track: {
      fillColor: theme.colors.track.ballast,
      strokeColor: theme.colors.track.main,
      strokeWidth: Math.max(theme.sizing.trackWidth, 1),
    },
  };
}

export class ThemeManager {
  private readonly cssTarget: ThemeCssTarget | undefined;
  private readonly listeners = new Set<ThemeChangeListener>();
  private readonly themes = new Map<string, Theme>();
  private currentThemeName: string = DEFAULT_THEME_NAME;

  public constructor(options: ThemeManagerOptions = {}) {
    this.cssTarget = options.cssTarget ?? resolveDefaultCssTarget();

    for (const theme of Object.values(BUILT_IN_THEMES)) {
      this.themes.set(theme.name, cloneTheme(theme));
    }

    const initialThemeName = options.initialTheme ?? DEFAULT_THEME_NAME;

    if (!this.themes.has(initialThemeName)) {
      throw new Error(`Unknown initial theme "${initialThemeName}".`);
    }

    this.currentThemeName = initialThemeName;
    this.applyTheme(this.requireTheme(this.currentThemeName), null);
  }

  public onThemeChange(listener: ThemeChangeListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  public registerTheme(theme: Theme): Theme {
    const validation = this.validateTheme(theme);

    if (!validation.isValid) {
      const violations = validation.violations
        .map((violation) => violation.token)
        .join(', ');

      throw new Error(`Theme "${theme.name}" does not meet contrast requirements: ${violations}.`);
    }

    const clonedTheme = cloneTheme(theme);

    this.themes.set(clonedTheme.name, clonedTheme);

    if (clonedTheme.name === this.currentThemeName) {
      this.applyTheme(clonedTheme, this.currentThemeName);
    }

    return cloneTheme(clonedTheme);
  }

  public setTheme(name: string): Theme {
    const nextTheme = this.requireTheme(name);
    const previousThemeName = this.currentThemeName;

    this.currentThemeName = nextTheme.name;
    this.applyTheme(nextTheme, previousThemeName);

    return cloneTheme(nextTheme);
  }

  public getTheme(name: string): Theme | undefined {
    const theme = this.themes.get(name);

    return theme ? cloneTheme(theme) : undefined;
  }

  public getCurrentTheme(): Theme {
    return cloneTheme(this.requireTheme(this.currentThemeName));
  }

  public getCurrentThemeName(): string {
    return this.currentThemeName;
  }

  public listThemes(): ReadonlyArray<string> {
    return [...this.themes.keys()];
  }

  public createTheme(
    name: string,
    overrides: ThemeOverrides = {},
    baseThemeName = DEFAULT_THEME_NAME,
  ): Theme {
    const baseTheme = this.requireTheme(baseThemeName);

    return mergeTheme(baseTheme, overrides, name);
  }

  public validateTheme(theme: Theme): ValidationResult {
    const checks = [
      {
        background: theme.colors.ui.background,
        foreground: theme.colors.ui.text,
        required: theme.accessibility.contrastRatio.normalText,
        token: 'colors.ui.text',
      },
      {
        background: theme.colors.ui.surface,
        foreground: theme.colors.ui.mutedText,
        required: theme.accessibility.contrastRatio.normalText,
        token: 'colors.ui.mutedText',
      },
      {
        background: theme.colors.ui.background,
        foreground: theme.accessibility.focusIndicator.color,
        required: theme.accessibility.contrastRatio.interactive,
        token: 'accessibility.focusIndicator.color',
      },
      {
        background: theme.colors.element.stationFill,
        foreground: theme.colors.element.stationStroke,
        required: theme.accessibility.contrastRatio.interactive,
        token: 'colors.element.stationStroke',
      },
      {
        background: theme.colors.element.signalFill,
        foreground: theme.colors.element.signalStroke,
        required: theme.accessibility.contrastRatio.interactive,
        token: 'colors.element.signalStroke',
      },
    ];
    const violations = checks.flatMap((check) => {
      const ratio = contrastRatio(check.foreground, check.background);

      if (ratio >= check.required) {
        return [];
      }

      return [
        {
          background: check.background,
          foreground: check.foreground,
          message: `${check.token} contrast ratio ${ratio.toFixed(2)} is below required ${check.required.toFixed(2)}.`,
          ratio,
          required: check.required,
          token: check.token,
        } satisfies ContrastViolation,
      ];
    });

    return {
      isValid: violations.length === 0,
      violations,
    };
  }

  public getCSSVariables(themeName = this.currentThemeName): Readonly<Record<string, string>> {
    return buildCssVariables(this.requireTheme(themeName));
  }

  public getCurrentStylingConfiguration(): Partial<StylingConfiguration> {
    return themeToStylingConfiguration(this.requireTheme(this.currentThemeName));
  }

  private applyTheme(theme: Theme, previousThemeName: string | null): void {
    const appliedAt = Date.now();
    const cssVariables = buildCssVariables(theme);

    for (const [name, value] of Object.entries(cssVariables)) {
      this.cssTarget?.setProperty(name, value);
    }

    const event: ThemeChangeEvent = {
      appliedAt,
      cssVariables,
      currentThemeName: theme.name,
      previousThemeName,
      theme: cloneTheme(theme),
    };

    this.listeners.forEach((listener) => {
      listener(event);
    });
  }

  private requireTheme(name: string): Theme {
    const theme = this.themes.get(name);

    if (!theme) {
      throw new Error(`Unknown theme "${name}".`);
    }

    return theme;
  }
}

function resolveDefaultCssTarget(): ThemeCssTarget | undefined {
  const documentElementStyle = globalThis.document?.documentElement?.style;

  return documentElementStyle && typeof documentElementStyle.setProperty === 'function'
    ? documentElementStyle
    : undefined;
}

function cloneTheme(theme: Theme): Theme {
  return {
    accessibility: {
      contrastRatio: {
        interactive: theme.accessibility.contrastRatio.interactive,
        largeText: theme.accessibility.contrastRatio.largeText,
        normalText: theme.accessibility.contrastRatio.normalText,
      },
      focusIndicator: {
        color: theme.accessibility.focusIndicator.color,
        offset: theme.accessibility.focusIndicator.offset,
        width: theme.accessibility.focusIndicator.width,
      },
      patterns: {
        branch: theme.accessibility.patterns.branch,
        closed: theme.accessibility.patterns.closed,
        highEmphasis: theme.accessibility.patterns.highEmphasis,
      },
    },
    builtIn: theme.builtIn,
    colors: {
      element: {
        signalFill: theme.colors.element.signalFill,
        signalStroke: theme.colors.element.signalStroke,
        stationFill: theme.colors.element.stationFill,
        stationStroke: theme.colors.element.stationStroke,
        switchFill: theme.colors.element.switchFill,
      },
      state: {
        danger: theme.colors.state.danger,
        disabled: theme.colors.state.disabled,
        hover: theme.colors.state.hover,
        selection: theme.colors.state.selection,
        success: theme.colors.state.success,
        warning: theme.colors.state.warning,
      },
      track: {
        ballast: theme.colors.track.ballast,
        branch: theme.colors.track.branch,
        closed: theme.colors.track.closed,
        main: theme.colors.track.main,
        outline: theme.colors.track.outline,
      },
      ui: {
        background: theme.colors.ui.background,
        border: theme.colors.ui.border,
        focusRing: theme.colors.ui.focusRing,
        mutedText: theme.colors.ui.mutedText,
        surface: theme.colors.ui.surface,
        text: theme.colors.ui.text,
      },
    },
    description: theme.description,
    isDark: theme.isDark,
    name: theme.name,
    sizing: {
      iconSize: theme.sizing.iconSize,
      lineWidth: theme.sizing.lineWidth,
      markerSize: theme.sizing.markerSize,
      trackWidth: theme.sizing.trackWidth,
    },
    typography: {
      fontFamily: theme.typography.fontFamily,
      fontSize: {
        base: theme.typography.fontSize.base,
        caption: theme.typography.fontSize.caption,
        label: theme.typography.fontSize.label,
      },
      fontWeight: {
        bold: theme.typography.fontWeight.bold,
        medium: theme.typography.fontWeight.medium,
        regular: theme.typography.fontWeight.regular,
      },
    },
  };
}

function mergeTheme(
  baseTheme: Theme,
  overrides: ThemeOverrides,
  name: string,
): Theme {
  return {
    accessibility: {
      contrastRatio: {
        interactive: overrides.accessibility?.contrastRatio?.interactive ?? baseTheme.accessibility.contrastRatio.interactive,
        largeText: overrides.accessibility?.contrastRatio?.largeText ?? baseTheme.accessibility.contrastRatio.largeText,
        normalText: overrides.accessibility?.contrastRatio?.normalText ?? baseTheme.accessibility.contrastRatio.normalText,
      },
      focusIndicator: {
        color: overrides.accessibility?.focusIndicator?.color ?? baseTheme.accessibility.focusIndicator.color,
        offset: overrides.accessibility?.focusIndicator?.offset ?? baseTheme.accessibility.focusIndicator.offset,
        width: overrides.accessibility?.focusIndicator?.width ?? baseTheme.accessibility.focusIndicator.width,
      },
      patterns: {
        branch: overrides.accessibility?.patterns?.branch ?? baseTheme.accessibility.patterns.branch,
        closed: overrides.accessibility?.patterns?.closed ?? baseTheme.accessibility.patterns.closed,
        highEmphasis: overrides.accessibility?.patterns?.highEmphasis ?? baseTheme.accessibility.patterns.highEmphasis,
      },
    },
    builtIn: overrides.builtIn ?? false,
    colors: {
      element: {
        signalFill: overrides.colors?.element?.signalFill ?? baseTheme.colors.element.signalFill,
        signalStroke: overrides.colors?.element?.signalStroke ?? baseTheme.colors.element.signalStroke,
        stationFill: overrides.colors?.element?.stationFill ?? baseTheme.colors.element.stationFill,
        stationStroke: overrides.colors?.element?.stationStroke ?? baseTheme.colors.element.stationStroke,
        switchFill: overrides.colors?.element?.switchFill ?? baseTheme.colors.element.switchFill,
      },
      state: {
        danger: overrides.colors?.state?.danger ?? baseTheme.colors.state.danger,
        disabled: overrides.colors?.state?.disabled ?? baseTheme.colors.state.disabled,
        hover: overrides.colors?.state?.hover ?? baseTheme.colors.state.hover,
        selection: overrides.colors?.state?.selection ?? baseTheme.colors.state.selection,
        success: overrides.colors?.state?.success ?? baseTheme.colors.state.success,
        warning: overrides.colors?.state?.warning ?? baseTheme.colors.state.warning,
      },
      track: {
        ballast: overrides.colors?.track?.ballast ?? baseTheme.colors.track.ballast,
        branch: overrides.colors?.track?.branch ?? baseTheme.colors.track.branch,
        closed: overrides.colors?.track?.closed ?? baseTheme.colors.track.closed,
        main: overrides.colors?.track?.main ?? baseTheme.colors.track.main,
        outline: overrides.colors?.track?.outline ?? baseTheme.colors.track.outline,
      },
      ui: {
        background: overrides.colors?.ui?.background ?? baseTheme.colors.ui.background,
        border: overrides.colors?.ui?.border ?? baseTheme.colors.ui.border,
        focusRing: overrides.colors?.ui?.focusRing ?? baseTheme.colors.ui.focusRing,
        mutedText: overrides.colors?.ui?.mutedText ?? baseTheme.colors.ui.mutedText,
        surface: overrides.colors?.ui?.surface ?? baseTheme.colors.ui.surface,
        text: overrides.colors?.ui?.text ?? baseTheme.colors.ui.text,
      },
    },
    description: overrides.description ?? baseTheme.description,
    isDark: overrides.isDark ?? baseTheme.isDark,
    name,
    sizing: {
      iconSize: overrides.sizing?.iconSize ?? baseTheme.sizing.iconSize,
      lineWidth: overrides.sizing?.lineWidth ?? baseTheme.sizing.lineWidth,
      markerSize: overrides.sizing?.markerSize ?? baseTheme.sizing.markerSize,
      trackWidth: overrides.sizing?.trackWidth ?? baseTheme.sizing.trackWidth,
    },
    typography: {
      fontFamily: overrides.typography?.fontFamily ?? baseTheme.typography.fontFamily,
      fontSize: {
        base: overrides.typography?.fontSize?.base ?? baseTheme.typography.fontSize.base,
        caption: overrides.typography?.fontSize?.caption ?? baseTheme.typography.fontSize.caption,
        label: overrides.typography?.fontSize?.label ?? baseTheme.typography.fontSize.label,
      },
      fontWeight: {
        bold: overrides.typography?.fontWeight?.bold ?? baseTheme.typography.fontWeight.bold,
        medium: overrides.typography?.fontWeight?.medium ?? baseTheme.typography.fontWeight.medium,
        regular: overrides.typography?.fontWeight?.regular ?? baseTheme.typography.fontWeight.regular,
      },
    },
  };
}

function buildCssVariables(theme: Theme): Readonly<Record<string, string>> {
  const variables: Record<string, string> = {};

  flattenCssValue(theme, [], variables);

  return variables;
}

function flattenCssValue(
  value: unknown,
  path: ReadonlyArray<string>,
  variables: Record<string, string>,
): void {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    const cssName = `--rail-${path.map(toKebabCase).join('-')}`;

    variables[cssName] = String(value);
    return;
  }

  if (!value || typeof value !== 'object') {
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    flattenCssValue(nestedValue, [...path, key], variables);
  }
}

function toKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .toLowerCase();
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(parseHexColor(foreground));
  const backgroundLuminance = relativeLuminance(parseHexColor(background));
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function parseHexColor(value: string): readonly [number, number, number] {
  const normalized = value.startsWith('#') ? value.slice(1) : value;
  const expanded = normalized.length === 3
    ? normalized
      .split('')
      .map((character) => `${character}${character}`)
      .join('')
    : normalized.padEnd(6, '0').slice(0, 6);

  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
  ];
}

function relativeLuminance(
  [red, green, blue]: readonly [number, number, number],
): number {
  const r = normalizeChannel(red);
  const g = normalizeChannel(green);
  const b = normalizeChannel(blue);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function normalizeChannel(channel: number): number {
  const normalized = channel / 255;

  return normalized <= 0.03928
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
}
