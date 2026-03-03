import { describe, expect, it, vi } from 'vitest';

import {
  assessBrowserCompatibility,
  detectFeatureSupport,
  detectUnsupportedBrowser,
  getPolyfillRecommendations,
  getSupportedBrowserMatrix,
} from './browser-compatibility';

describe('browser compatibility', () => {
  it('publishes the supported browser matrix', () => {
    expect(getSupportedBrowserMatrix()).toEqual([
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
    ]);
  });

  it('accepts supported target browsers', () => {
    const chromeAssessment = assessBrowserCompatibility(
      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
    );
    const firefoxAssessment = assessBrowserCompatibility(
      'Mozilla/5.0 Gecko/20100101 Firefox/120.0',
    );
    const safariAssessment = assessBrowserCompatibility(
      'Mozilla/5.0 AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
    );
    const edgeAssessment = assessBrowserCompatibility(
      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    );

    expect(chromeAssessment.supported).toBe(true);
    expect(firefoxAssessment.supported).toBe(true);
    expect(safariAssessment.supported).toBe(true);
    expect(edgeAssessment.supported).toBe(true);
  });

  it('warns for browsers below the supported baseline', () => {
    const onWarning = vi.fn();
    const assessment = assessBrowserCompatibility(
      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      {},
      onWarning,
    );

    expect(assessment.supported).toBe(false);
    expect(assessment.browser).toBe('chrome');
    expect(assessment.minimumVersion).toBe(115);
    expect(assessment.warnings[0]).toContain('below the supported baseline');
    expect(onWarning).toHaveBeenCalled();
  });

  it('returns polyfill recommendations for missing browser features', () => {
    const recommendations = getPolyfillRecommendations({
      resizeObserver: false,
      structuredClone: false,
      offscreenCanvas: false,
      pointerEvents: false,
      intlSegmenter: false,
    });

    expect(recommendations).toHaveLength(5);
    expect(recommendations.map((recommendation) => recommendation.feature)).toEqual([
      'ResizeObserver',
      'structuredClone',
      'OffscreenCanvas',
      'PointerEvent',
      'Intl.Segmenter',
    ]);
  });

  it('detects feature support from a browser-like environment', () => {
    const featureSupport = detectFeatureSupport({
      ResizeObserver: class ResizeObserver {},
      structuredClone: () => ({}),
      PointerEvent: class PointerEvent {},
      Intl: {
        Segmenter: class Segmenter {},
      },
    });

    expect(featureSupport.resizeObserver).toBe(true);
    expect(featureSupport.structuredClone).toBe(true);
    expect(featureSupport.offscreenCanvas).toBe(false);
    expect(featureSupport.pointerEvents).toBe(true);
    expect(featureSupport.intlSegmenter).toBe(true);
  });

  it('detects unsupported browsers and includes polyfill warnings', () => {
    const onWarning = vi.fn();
    const assessment = detectUnsupportedBrowser(
      {
        userAgent: 'ExampleBrowser/1.0',
        ResizeObserver: undefined,
        structuredClone: undefined,
        OffscreenCanvas: undefined,
        PointerEvent: undefined,
        Intl: {},
      },
      onWarning,
    );

    expect(assessment.supported).toBe(false);
    expect(assessment.browser).toBe('unknown');
    expect(assessment.warnings).toHaveLength(6);
    expect(onWarning).toHaveBeenCalledTimes(6);
  });
});
