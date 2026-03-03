export type TranslationKey = string;

export type TranslationValue = string | Translations;

export interface Translations {
  readonly [key: string]: TranslationValue;
}

export interface NumberFormatOptions extends Intl.NumberFormatOptions {}

export interface DateFormatOptions extends Intl.DateTimeFormatOptions {}

export interface TranslationOptions {
  readonly locale?: string;
}

export interface TranslationParameters {
  readonly [key: string]: string | number | boolean | Date | null | undefined;
}

export interface LocaleDirections {
  readonly locale: string;
  readonly uiDirection: 'ltr' | 'rtl';
  readonly schematicDirection: 'ltr';
}

export interface MissingTranslationWarning {
  readonly key: TranslationKey;
  readonly locale: string;
  readonly fallbackLocale: string;
}

export interface I18nManagerOptions {
  readonly defaultLocale?: string;
  readonly warningHandler?: (warning: MissingTranslationWarning) => void;
}

export interface I18nPackageMetadata {
  readonly packageName: '@rail-schematic-viz/i18n';
  readonly defaultLocale: string;
  readonly builtInLocaleCount: number;
}

const BCP47_PATTERN = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

const RTL_LANGUAGE_SUBTAGS = new Set(['ar', 'fa', 'he', 'ur']);

export const DEFAULT_LOCALE = 'en-US';

export const EN_US_TRANSLATIONS = {
  controls: {
    zoom: {
      in: 'Zoom in',
      out: 'Zoom out',
      reset: 'Reset zoom',
      fitToView: 'Fit to view',
    },
    minimap: {
      title: 'Minimap',
      toggle: 'Toggle minimap',
      open: 'Open minimap',
      close: 'Close minimap',
    },
    overlays: {
      title: 'Overlay controls',
      showAll: 'Show all overlays',
      hideAll: 'Hide all overlays',
      toggle: 'Toggle overlay',
    },
  },
  contextMenu: {
    viewDetails: 'View details',
    selectConnected: 'Select connected',
    exportSelection: 'Export selection',
    copyCoordinates: 'Copy coordinates',
    zoomToElement: 'Zoom to element',
    hideElement: 'Hide element',
  },
  shortcuts: {
    zoomIn: 'Zoom in ({shortcut})',
    zoomOut: 'Zoom out ({shortcut})',
    fitToView: 'Fit to view ({shortcut})',
    openContextMenu: 'Open context menu ({shortcut})',
  },
  export: {
    svgReady: 'SVG export is ready',
    pngReady: 'PNG export is ready',
    printReady: 'Print preview is ready',
  },
  errors: {
    initializationFailed: 'Initialization failed.',
    invalidData: 'The provided data is invalid.',
    exportFailed: 'The export operation failed.',
    themeInvalid: 'The selected theme is invalid.',
  },
  validation: {
    missingKey: 'Missing translation key: {key}',
    unsupportedLocale: 'Unsupported locale: {locale}',
    invalidFormat: 'Invalid format for {field}',
  },
} as const satisfies Translations;

export const DE_DE_TRANSLATIONS = {
  controls: {
    zoom: {
      in: 'Vergrößern',
      out: 'Verkleinern',
      fitToView: 'Auf Ansicht anpassen',
    },
    minimap: {
      title: 'Minikarte',
      toggle: 'Minikarte umschalten',
    },
  },
  contextMenu: {
    viewDetails: 'Details anzeigen',
    selectConnected: 'Verbundene auswählen',
  },
  errors: {
    initializationFailed: 'Initialisierung fehlgeschlagen.',
  },
} as const satisfies Translations;

export const FR_FR_TRANSLATIONS = {
  controls: {
    zoom: {
      in: 'Agrandir',
      out: 'Rétrécir',
      fitToView: 'Ajuster à la vue',
    },
    minimap: {
      title: 'Mini-carte',
      toggle: 'Basculer la mini-carte',
    },
  },
  contextMenu: {
    viewDetails: 'Voir les détails',
    selectConnected: 'Sélectionner les éléments liés',
  },
  errors: {
    initializationFailed: 'Échec de l’initialisation.',
  },
} as const satisfies Translations;

export const AR_SA_TRANSLATIONS = {
  controls: {
    zoom: {
      in: 'تكبير',
      out: 'تصغير',
      fitToView: 'ملاءمة العرض',
    },
    minimap: {
      title: 'الخريطة المصغرة',
      toggle: 'تبديل الخريطة المصغرة',
    },
  },
  contextMenu: {
    viewDetails: 'عرض التفاصيل',
    selectConnected: 'تحديد العناصر المرتبطة',
  },
  errors: {
    initializationFailed: 'فشلت التهيئة.',
  },
} as const satisfies Translations;

export const COMMON_LOCALE_TRANSLATIONS = {
  'ar-SA': AR_SA_TRANSLATIONS,
  'de-DE': DE_DE_TRANSLATIONS,
  'fr-FR': FR_FR_TRANSLATIONS,
} as const;

export const TRANSLATION_KEY_TEMPLATE = EN_US_TRANSLATIONS;

export const PACKAGE_METADATA = {
  packageName: '@rail-schematic-viz/i18n',
  defaultLocale: DEFAULT_LOCALE,
  builtInLocaleCount: 1 + Object.keys(COMMON_LOCALE_TRANSLATIONS).length,
} as const satisfies I18nPackageMetadata;

export function getPackageMetadata(): I18nPackageMetadata {
  return PACKAGE_METADATA;
}

export class I18nManager {
  private currentLocale: string;
  private readonly defaultLocale: string;
  private readonly localeMap = new Map<string, Translations>();
  private readonly warningHandler: (warning: MissingTranslationWarning) => void;

  public constructor(options: I18nManagerOptions = {}) {
    const defaultLocale = options.defaultLocale ?? DEFAULT_LOCALE;

    assertValidLocale(defaultLocale);

    this.defaultLocale = defaultLocale;
    this.currentLocale = defaultLocale;
    this.warningHandler = options.warningHandler ?? ((warning) => {
      console.warn(
        `Missing translation key "${warning.key}" for locale "${warning.locale}". Falling back to "${warning.fallbackLocale}".`,
      );
    });

    this.registerLocale(DEFAULT_LOCALE, EN_US_TRANSLATIONS);

    for (const [locale, translations] of Object.entries(COMMON_LOCALE_TRANSLATIONS)) {
      this.registerLocale(locale, translations);
    }

    if (defaultLocale !== DEFAULT_LOCALE && !this.localeMap.has(defaultLocale)) {
      this.registerLocale(defaultLocale, EN_US_TRANSLATIONS);
    }
  }

  public registerLocale(locale: string, translations: Translations): void {
    assertValidLocale(locale);
    this.localeMap.set(locale, cloneTranslations(translations));
  }

  public setLocale(locale: string): void {
    assertValidLocale(locale);

    if (!this.localeMap.has(locale)) {
      throw new Error(`Locale "${locale}" has not been registered.`);
    }

    this.currentLocale = locale;
  }

  public getLocale(): string {
    return this.currentLocale;
  }

  public listLocales(): ReadonlyArray<string> {
    return [...this.localeMap.keys()];
  }

  public t(
    key: TranslationKey,
    parameters: TranslationParameters = {},
    options: TranslationOptions = {},
  ): string {
    const locale = options.locale ?? this.currentLocale;
    const localizedValue = lookupTranslation(this.localeMap.get(locale), key);

    if (typeof localizedValue === 'string') {
      return interpolate(localizedValue, parameters);
    }

    const fallbackValue = lookupTranslation(this.localeMap.get(this.defaultLocale), key);

    if (typeof fallbackValue === 'string') {
      this.warningHandler({
        fallbackLocale: this.defaultLocale,
        key,
        locale,
      });

      return interpolate(fallbackValue, parameters);
    }

    this.warningHandler({
      fallbackLocale: this.defaultLocale,
      key,
      locale,
    });

    return key;
  }

  public formatNumber(
    value: number,
    options: NumberFormatOptions = {},
    locale = this.currentLocale,
  ): string {
    return new Intl.NumberFormat(locale, options).format(value);
  }

  public formatDate(
    value: Date | string | number,
    options: DateFormatOptions = {},
    locale = this.currentLocale,
  ): string {
    const date = value instanceof Date ? value : new Date(value);

    return new Intl.DateTimeFormat(locale, options).format(date);
  }

  public isRTL(locale = this.currentLocale): boolean {
    const primarySubtag = locale.split('-')[0]?.toLowerCase() ?? '';

    return RTL_LANGUAGE_SUBTAGS.has(primarySubtag);
  }

  public getDirections(locale = this.currentLocale): LocaleDirections {
    return {
      locale,
      schematicDirection: 'ltr',
      uiDirection: this.isRTL(locale) ? 'rtl' : 'ltr',
    };
  }
}

function assertValidLocale(locale: string): void {
  if (!BCP47_PATTERN.test(locale)) {
    throw new Error(`Locale "${locale}" is not a valid BCP 47 identifier.`);
  }
}

function cloneTranslations(translations: Translations): Translations {
  const output: Record<string, TranslationValue> = {};

  for (const [key, value] of Object.entries(translations)) {
    output[key] =
      typeof value === 'string'
        ? value
        : cloneTranslations(value);
  }

  return output;
}

function lookupTranslation(
  translations: Translations | undefined,
  key: TranslationKey,
): string | undefined {
  if (!translations) {
    return undefined;
  }

  let current: TranslationValue | undefined = translations;

  for (const segment of key.split('.')) {
    if (!current || typeof current === 'string') {
      return undefined;
    }

    current = current[segment];
  }

  return typeof current === 'string' ? current : undefined;
}

function interpolate(
  template: string,
  parameters: TranslationParameters,
): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, token: string) => {
    const value = parameters[token];

    if (value === undefined || value === null) {
      return `{${token}}`;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    return String(value);
  });
}
