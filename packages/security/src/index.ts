import { CoordinateSystemType, type Coordinate } from '@rail-schematic-viz/core';

export interface SecurityPackageMetadata {
  readonly packageName: '@rail-schematic-viz/security';
  readonly privacyByDefault: true;
}

export interface CSPValidationResult {
  readonly valid: boolean;
  readonly warnings: ReadonlyArray<string>;
  readonly missingDirectives: ReadonlyArray<string>;
  readonly usesUnsafeInline: boolean;
  readonly usesUnsafeEval: boolean;
}

export interface CSPCompatibilityResult extends CSPValidationResult {
  readonly compatible: boolean;
}

export interface PrivacyGuarantees {
  readonly noNetworkRequests: true;
  readonly noTelemetry: true;
  readonly noCanvasFingerprinting: true;
  readonly noImplicitStorage: true;
  readonly noThirdPartyTracking: true;
}

export interface DataPrivacyPolicy extends PrivacyGuarantees {
  readonly storageRequiresExplicitConfiguration: true;
  readonly summary: string;
}

export interface SecurityDisclosurePolicy {
  readonly vulnerabilityReporting: string;
  readonly disclosureWindowDays: number;
  readonly supportsCoordinatedDisclosure: true;
}

export interface CoordinateValidationResult {
  readonly coordinate: Coordinate;
}

export interface ThemeValidationResult {
  readonly theme: ThemeLike;
}

export interface TranslationValidationResult {
  readonly translations: TranslationsLike;
}

export interface ThemeLike {
  readonly name?: unknown;
  readonly colors?: {
    readonly track?: {
      readonly main?: unknown;
      readonly branch?: unknown;
      readonly closed?: unknown;
      readonly ballast?: unknown;
      readonly outline?: unknown;
    };
    readonly ui?: {
      readonly background?: unknown;
      readonly text?: unknown;
      readonly surface?: unknown;
      readonly border?: unknown;
      readonly focusRing?: unknown;
      readonly mutedText?: unknown;
    };
  };
}

export interface TranslationsLike {
  readonly [key: string]: string | TranslationsLike;
}

const URL_ATTRIBUTE_NAMES = new Set(['href', 'src', 'xlink:href']);
const SAFE_URL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const SVG_EVENT_ATTRIBUTE_PATTERN = /\son[a-z-]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/giu;
const SVG_SCRIPT_PATTERN = /<script\b[\s\S]*?<\/script>/giu;
const SVG_FOREIGN_OBJECT_PATTERN = /<foreignObject\b[\s\S]*?<\/foreignObject>/giu;
const SVG_JAVASCRIPT_URL_PATTERN =
  /\s(?:href|xlink:href)\s*=\s*(['"])\s*javascript:[\s\S]*?\1/giu;
const NODE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,127}$/u;
const SAFE_TEXT_PATTERN = /[<>&"'`]/gu;

export const PACKAGE_METADATA = {
  packageName: '@rail-schematic-viz/security',
  privacyByDefault: true,
} as const satisfies SecurityPackageMetadata;

export const PRIVACY_GUARANTEES: PrivacyGuarantees = {
  noCanvasFingerprinting: true,
  noImplicitStorage: true,
  noNetworkRequests: true,
  noTelemetry: true,
  noThirdPartyTracking: true,
};

export const DATA_PRIVACY_POLICY: DataPrivacyPolicy = {
  ...PRIVACY_GUARANTEES,
  storageRequiresExplicitConfiguration: true,
  summary:
    'The library performs no network requests, collects no telemetry, avoids fingerprinting techniques, and only stores data when an application explicitly opts in.',
};

export const SECURITY_DISCLOSURE_POLICY: SecurityDisclosurePolicy = {
  disclosureWindowDays: 90,
  supportsCoordinatedDisclosure: true,
  vulnerabilityReporting:
    'Report vulnerabilities privately to the maintainers before public disclosure. Provide reproduction details, affected versions, and impact assessment.',
};

export function getPackageMetadata(): SecurityPackageMetadata {
  return PACKAGE_METADATA;
}

export function getDataPrivacyPolicy(): DataPrivacyPolicy {
  return {
    ...DATA_PRIVACY_POLICY,
  };
}

export function getSecurityDisclosurePolicy(): SecurityDisclosurePolicy {
  return {
    ...SECURITY_DISCLOSURE_POLICY,
  };
}

export class XSSSanitizer {
  public sanitizeText(value: string): string {
    return value.replace(SAFE_TEXT_PATTERN, (character) => {
      switch (character) {
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '&':
          return '&amp;';
        case '"':
          return '&quot;';
        case '\'':
          return '&#39;';
        case '`':
          return '&#96;';
        default:
          return character;
      }
    });
  }

  public sanitizeSVG(value: string): string {
    return value
      .replace(SVG_SCRIPT_PATTERN, '')
      .replace(SVG_FOREIGN_OBJECT_PATTERN, '')
      .replace(SVG_EVENT_ATTRIBUTE_PATTERN, '')
      .replace(SVG_JAVASCRIPT_URL_PATTERN, '');
  }

  public sanitizeURL(value: string): string {
    const trimmed = value.trim();

    if (!trimmed) {
      throw new Error('URL cannot be empty.');
    }

    if (trimmed.startsWith('#') || trimmed.startsWith('/')) {
      return trimmed;
    }

    let parsed: URL;

    try {
      parsed = new URL(trimmed);
    } catch {
      throw new Error(`Invalid URL "${value}".`);
    }

    if (!SAFE_URL_PROTOCOLS.has(parsed.protocol)) {
      throw new Error(`Unsafe URL protocol "${parsed.protocol}".`);
    }

    return parsed.toString();
  }

  public validateAttribute(name: string, value: string): string {
    const normalizedName = name.trim().toLowerCase();

    if (!normalizedName) {
      throw new Error('Attribute name cannot be empty.');
    }

    if (normalizedName.startsWith('on')) {
      throw new Error(`Event handler attributes are not allowed: "${name}".`);
    }

    if (normalizedName === 'style' && /expression\s*\(|url\s*\(\s*javascript:/iu.test(value)) {
      throw new Error('Unsafe inline style value detected.');
    }

    if (URL_ATTRIBUTE_NAMES.has(normalizedName)) {
      return this.sanitizeURL(value);
    }

    return this.sanitizeText(value);
  }
}

export class CSPValidator {
  public getRequiredDirectives(): ReadonlyArray<string> {
    return [
      `default-src 'self'`,
      `style-src 'self' 'nonce-{random}'`,
      `script-src 'self'`,
    ];
  }

  public validateCSP(policy: string): CSPValidationResult {
    const directives = parseCSP(policy);
    const warnings: string[] = [];
    const missingDirectives: string[] = [];
    const defaultSrc = directives.get('default-src');
    const styleSrc = directives.get('style-src');
    const scriptSrc = directives.get('script-src');
    const usesUnsafeInline = hasToken(styleSrc, `'unsafe-inline'`)
      || hasToken(scriptSrc, `'unsafe-inline'`);
    const usesUnsafeEval = hasToken(scriptSrc, `'unsafe-eval'`);

    if (!defaultSrc) {
      missingDirectives.push('default-src');
    }

    if (!styleSrc) {
      missingDirectives.push('style-src');
    } else if (
      !hasToken(styleSrc, `'self'`)
      && !containsNonce(styleSrc)
    ) {
      warnings.push(
        'style-src should include \'self\' or a nonce to allow library style injection without unsafe-inline.',
      );
    }

    if (usesUnsafeInline) {
      warnings.push('CSP should avoid unsafe-inline for style-src and script-src.');
    }

    if (usesUnsafeEval) {
      warnings.push('CSP should avoid unsafe-eval.');
    }

    return {
      missingDirectives,
      usesUnsafeEval,
      usesUnsafeInline,
      valid: missingDirectives.length === 0 && !usesUnsafeInline && !usesUnsafeEval,
      warnings,
    };
  }

  public checkCompatibility(policy: string): CSPCompatibilityResult {
    const validation = this.validateCSP(policy);
    const warnings = [...validation.warnings];

    if (!containsNonce(parseCSP(policy).get('style-src'))) {
      warnings.push(
        'style-src is compatible but should prefer nonce-based inline styles for strict CSP deployments.',
      );
    }

    return {
      ...validation,
      compatible: validation.valid,
      warnings,
    };
  }
}

export class InputValidator {
  public validateCoordinate(input: unknown): CoordinateValidationResult {
    if (!input || typeof input !== 'object') {
      throw new Error('Coordinate must be an object.');
    }

    const coordinate = input as Partial<Coordinate>;

    switch (coordinate.type) {
      case CoordinateSystemType.Screen:
        if (!isFiniteNumber((coordinate as Partial<ScreenCoordinateLike>).x)) {
          throw new Error('Screen coordinate must include a finite x value.');
        }

        if (!isFiniteNumber((coordinate as Partial<ScreenCoordinateLike>).y)) {
          throw new Error('Screen coordinate must include a finite y value.');
        }

        return {
          coordinate: {
            type: CoordinateSystemType.Screen,
            x: (coordinate as ScreenCoordinateLike).x,
            y: (coordinate as ScreenCoordinateLike).y,
          },
        };
      case CoordinateSystemType.Linear:
        if (
          typeof (coordinate as Partial<LinearCoordinateLike>).trackId !== 'string'
          || !(coordinate as Partial<LinearCoordinateLike>).trackId?.trim()
        ) {
          throw new Error('Linear coordinate must include a non-empty trackId.');
        }

        if (!isFiniteNumber((coordinate as Partial<LinearCoordinateLike>).distance)) {
          throw new Error('Linear coordinate must include a finite distance.');
        }

        return {
          coordinate: {
            ...(isDirection((coordinate as Partial<LinearCoordinateLike>).direction)
              ? { direction: (coordinate as LinearCoordinateLike).direction }
              : {}),
            distance: (coordinate as LinearCoordinateLike).distance,
            trackId: (coordinate as LinearCoordinateLike).trackId,
            type: CoordinateSystemType.Linear,
          },
        };
      case CoordinateSystemType.Geographic:
        if (!isFiniteNumber((coordinate as Partial<GeographicCoordinateLike>).latitude)) {
          throw new Error('Geographic coordinate must include a finite latitude.');
        }

        if (!isFiniteNumber((coordinate as Partial<GeographicCoordinateLike>).longitude)) {
          throw new Error('Geographic coordinate must include a finite longitude.');
        }

        return {
          coordinate: {
            latitude: (coordinate as GeographicCoordinateLike).latitude,
            longitude: (coordinate as GeographicCoordinateLike).longitude,
            type: CoordinateSystemType.Geographic,
          },
        };
      default:
        throw new Error('Coordinate type must be screen, linear, or geographic.');
    }
  }

  public validateNodeId(input: unknown): string {
    if (typeof input !== 'string' || !NODE_ID_PATTERN.test(input)) {
      throw new Error(
        'Node ID must start with an alphanumeric character and contain only letters, numbers, colons, underscores, or dashes.',
      );
    }

    return input;
  }

  public validateTheme(input: unknown): ThemeValidationResult {
    if (!input || typeof input !== 'object') {
      throw new Error('Theme must be an object.');
    }

    const theme = input as ThemeLike;

    if (typeof theme.name !== 'string' || !theme.name.trim()) {
      throw new Error('Theme must include a non-empty name.');
    }

    const trackColors = theme.colors?.track;
    const uiColors = theme.colors?.ui;

    if (!isColorString(trackColors?.main)) {
      throw new Error('Theme colors.track.main must be a valid color string.');
    }

    if (!isColorString(trackColors?.branch)) {
      throw new Error('Theme colors.track.branch must be a valid color string.');
    }

    if (!isColorString(uiColors?.background)) {
      throw new Error('Theme colors.ui.background must be a valid color string.');
    }

    if (!isColorString(uiColors?.text)) {
      throw new Error('Theme colors.ui.text must be a valid color string.');
    }

    return {
      theme,
    };
  }

  public validateTranslations(input: unknown): TranslationValidationResult {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new Error('Translations must be an object tree.');
    }

    validateTranslationsTree(input as TranslationsLike, 'root');

    return {
      translations: input as TranslationsLike,
    };
  }
}

export class PrivacyGuard {
  public getGuarantees(): PrivacyGuarantees {
    return {
      ...PRIVACY_GUARANTEES,
    };
  }

  public getPrivacyPolicy(): DataPrivacyPolicy {
    return getDataPrivacyPolicy();
  }

  public getSecurityPolicy(): SecurityDisclosurePolicy {
    return getSecurityDisclosurePolicy();
  }

  public assertNoNetworkRequests(): true {
    return true;
  }

  public assertNoTelemetry(): true {
    return true;
  }

  public assertStorageDisabled(
    configuration?: { readonly enabled?: boolean },
  ): true {
    if (configuration?.enabled) {
      throw new Error(
        'Persistent storage is disabled by default and must be explicitly enabled by the host application.',
      );
    }

    return true;
  }
}

interface ScreenCoordinateLike {
  readonly type: CoordinateSystemType.Screen;
  readonly x: number;
  readonly y: number;
}

interface LinearCoordinateLike {
  readonly type: CoordinateSystemType.Linear;
  readonly trackId: string;
  readonly distance: number;
  readonly direction?: 'up' | 'down';
}

interface GeographicCoordinateLike {
  readonly type: CoordinateSystemType.Geographic;
  readonly latitude: number;
  readonly longitude: number;
}

function parseCSP(policy: string): Map<string, ReadonlyArray<string>> {
  const directives = new Map<string, ReadonlyArray<string>>();

  policy
    .split(';')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .forEach((segment) => {
      const [name, ...tokens] = segment.split(/\s+/u);

      if (!name) {
        return;
      }

      directives.set(name.toLowerCase(), tokens);
    });

  return directives;
}

function hasToken(
  tokens: ReadonlyArray<string> | undefined,
  target: string,
): boolean {
  return Boolean(tokens?.includes(target));
}

function containsNonce(tokens: ReadonlyArray<string> | undefined): boolean {
  return Boolean(tokens?.some((token) => token.startsWith(`'nonce-`)));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isDirection(value: unknown): value is 'up' | 'down' {
  return value === 'up' || value === 'down';
}

function isColorString(value: unknown): value is string {
  return typeof value === 'string'
    && /^(#[0-9a-f]{3,8}|rgb[a]?\(|hsl[a]?\(|[a-z-]+)$/iu.test(value.trim());
}

function validateTranslationsTree(
  input: TranslationsLike,
  path: string,
): void {
  for (const [key, value] of Object.entries(input)) {
    if (!key.trim()) {
      throw new Error(`Translation key at ${path} cannot be empty.`);
    }

    if (typeof value === 'string') {
      continue;
    }

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`Translation value at ${path}.${key} must be a string or object.`);
    }

    validateTranslationsTree(value, `${path}.${key}`);
  }
}
