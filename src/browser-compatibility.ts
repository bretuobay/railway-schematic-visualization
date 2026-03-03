export type SupportedBrowserName = 'chrome' | 'firefox' | 'safari' | 'edge' | 'unknown';

export interface BrowserSupportRule {
  readonly name: Exclude<SupportedBrowserName, 'unknown'>;
  readonly minimumVersion: number;
  readonly description: string;
}

export interface PolyfillRecommendation {
  readonly feature: string;
  readonly recommendation: string;
}

export interface BrowserFeatureSupport {
  readonly resizeObserver?: boolean;
  readonly structuredClone?: boolean;
  readonly offscreenCanvas?: boolean;
  readonly pointerEvents?: boolean;
  readonly intlSegmenter?: boolean;
}

export interface BrowserCompatibilityAssessment {
  readonly browser: SupportedBrowserName;
  readonly detectedVersion: number | null;
  readonly minimumVersion: number | null;
  readonly supported: boolean;
  readonly warnings: readonly string[];
  readonly polyfills: readonly PolyfillRecommendation[];
}

export interface BrowserEnvironmentLike {
  readonly userAgent?: string;
  readonly ResizeObserver?: unknown;
  readonly structuredClone?: unknown;
  readonly OffscreenCanvas?: unknown;
  readonly PointerEvent?: unknown;
  readonly Intl?: {
    readonly Segmenter?: unknown;
  };
}

const BROWSER_SUPPORT_MATRIX: readonly BrowserSupportRule[] = [
  {
    name: 'chrome',
    minimumVersion: 115,
    description: 'Chrome 115 and later',
  },
  {
    name: 'firefox',
    minimumVersion: 119,
    description: 'Firefox 119 and later',
  },
  {
    name: 'safari',
    minimumVersion: 17,
    description: 'Safari 17 and later',
  },
  {
    name: 'edge',
    minimumVersion: 115,
    description: 'Edge 115 and later',
  },
] as const;

interface ParsedBrowser {
  readonly browser: SupportedBrowserName;
  readonly version: number | null;
}

function parseMajorVersion(userAgent: string, pattern: RegExp): number | null {
  const match = userAgent.match(pattern);

  if (!match || !match[1]) {
    return null;
  }

  const parsedValue = Number.parseInt(match[1], 10);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function parseUserAgent(userAgent: string): ParsedBrowser {
  if (/Edg\/(\d+)/.test(userAgent)) {
    return {
      browser: 'edge',
      version: parseMajorVersion(userAgent, /Edg\/(\d+)/),
    };
  }

  if (/Firefox\/(\d+)/.test(userAgent)) {
    return {
      browser: 'firefox',
      version: parseMajorVersion(userAgent, /Firefox\/(\d+)/),
    };
  }

  if (/Chrome\/(\d+)/.test(userAgent) && !/Edg\/(\d+)/.test(userAgent)) {
    return {
      browser: 'chrome',
      version: parseMajorVersion(userAgent, /Chrome\/(\d+)/),
    };
  }

  if (/Version\/(\d+)/.test(userAgent) && /Safari\//.test(userAgent) && !/Chrome\/(\d+)/.test(userAgent)) {
    return {
      browser: 'safari',
      version: parseMajorVersion(userAgent, /Version\/(\d+)/),
    };
  }

  return {
    browser: 'unknown',
    version: null,
  };
}

export function getSupportedBrowserMatrix(): readonly BrowserSupportRule[] {
  return BROWSER_SUPPORT_MATRIX;
}

export function getPolyfillRecommendations(
  featureSupport: BrowserFeatureSupport = {},
): readonly PolyfillRecommendation[] {
  const recommendations: PolyfillRecommendation[] = [];

  if (featureSupport.resizeObserver === false) {
    recommendations.push({
      feature: 'ResizeObserver',
      recommendation: 'Load a ResizeObserver ponyfill before initializing responsive viewport features.',
    });
  }

  if (featureSupport.structuredClone === false) {
    recommendations.push({
      feature: 'structuredClone',
      recommendation: 'Provide a structuredClone ponyfill for deep-copy export and adapter state flows.',
    });
  }

  if (featureSupport.offscreenCanvas === false) {
    recommendations.push({
      feature: 'OffscreenCanvas',
      recommendation: 'Disable worker-backed canvas paths or fall back to main-thread canvas rendering.',
    });
  }

  if (featureSupport.pointerEvents === false) {
    recommendations.push({
      feature: 'PointerEvent',
      recommendation: 'Add a PointerEvent polyfill before enabling advanced drag or brushing interactions.',
    });
  }

  if (featureSupport.intlSegmenter === false) {
    recommendations.push({
      feature: 'Intl.Segmenter',
      recommendation: 'Provide an Intl.Segmenter polyfill when locale-aware label truncation is required.',
    });
  }

  return recommendations;
}

export function detectFeatureSupport(environment: BrowserEnvironmentLike = {}): BrowserFeatureSupport {
  return {
    resizeObserver: environment.ResizeObserver !== undefined,
    structuredClone: environment.structuredClone !== undefined,
    offscreenCanvas: environment.OffscreenCanvas !== undefined,
    pointerEvents: environment.PointerEvent !== undefined,
    intlSegmenter: environment.Intl?.Segmenter !== undefined,
  };
}

export function assessBrowserCompatibility(
  userAgent: string,
  featureSupport: BrowserFeatureSupport = {},
  onWarning?: (warning: string) => void,
): BrowserCompatibilityAssessment {
  const parsedBrowser = parseUserAgent(userAgent);
  const supportRule = BROWSER_SUPPORT_MATRIX.find((rule) => rule.name === parsedBrowser.browser);
  const warnings: string[] = [];

  if (!supportRule) {
    warnings.push('Unsupported browser detected. Supported browsers are Chrome 115+, Firefox 119+, Safari 17+, and Edge 115+.');
  } else if (parsedBrowser.version === null || parsedBrowser.version < supportRule.minimumVersion) {
    warnings.push(
      `${supportRule.name} ${parsedBrowser.version ?? 'unknown'} is below the supported baseline of ${supportRule.minimumVersion}.`,
    );
  }

  const polyfills = getPolyfillRecommendations(featureSupport);

  for (const polyfill of polyfills) {
    warnings.push(`Polyfill recommended for ${polyfill.feature}. ${polyfill.recommendation}`);
  }

  for (const warning of warnings) {
    onWarning?.(warning);
  }

  return {
    browser: parsedBrowser.browser,
    detectedVersion: parsedBrowser.version,
    minimumVersion: supportRule?.minimumVersion ?? null,
    supported:
      supportRule !== undefined
      && parsedBrowser.version !== null
      && parsedBrowser.version >= supportRule.minimumVersion,
    warnings,
    polyfills,
  };
}

export function detectUnsupportedBrowser(
  environment: BrowserEnvironmentLike = globalThis as BrowserEnvironmentLike,
  onWarning?: (warning: string) => void,
): BrowserCompatibilityAssessment {
  return assessBrowserCompatibility(
    environment.userAgent ?? '',
    detectFeatureSupport(environment),
    onWarning,
  );
}
