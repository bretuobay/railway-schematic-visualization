import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  AnimationSystem,
  LayoutEngine,
  Minimap,
  PerformanceMonitor,
  ViewportController,
} from './index';
import { ARIAManager } from './accessibility';
import { LayoutError } from './errors';
import { EventManager } from './interactions';
import { ProportionalLayout } from './layout';
import type {
  LayoutStrategy,
  ViewportControllerConfig,
} from './types';
import { ConfigurationValidator } from './validation';
import { SemanticZoom } from './viewport';

describe('package exports', () => {
  it('exposes the expected symbols from the main entry point', () => {
    expect(LayoutEngine).toBeTypeOf('function');
    expect(ViewportController).toBeTypeOf('function');
    expect(Minimap).toBeTypeOf('function');
    expect(PerformanceMonitor).toBeTypeOf('function');
    expect(AnimationSystem).toBeTypeOf('function');
  });

  it('exposes the expected submodule symbols', () => {
    expect(ProportionalLayout).toBeTypeOf('function');
    expect(SemanticZoom).toBeTypeOf('function');
    expect(EventManager).toBeTypeOf('function');
    expect(ARIAManager).toBeTypeOf('function');
    expect(ConfigurationValidator).toBeTypeOf('function');
    expect(LayoutError).toBeTypeOf('function');
  });

  it('provides public type definitions', () => {
    const strategy: LayoutStrategy | null = null;
    const viewportConfig: ViewportControllerConfig = {
      minScale: 1,
      maxScale: 2,
    };

    expect(strategy).toBeNull();
    expect(viewportConfig.maxScale).toBe(2);
  });

  it('declares package exports for all public submodules', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(import.meta.dirname, '../package.json'), 'utf8'),
    ) as {
      readonly exports: Record<string, unknown>;
    };

    expect(Object.keys(packageJson.exports)).toEqual(expect.arrayContaining([
      '.',
      './layout',
      './viewport',
      './interactions',
      './minimap',
      './performance',
      './animation',
      './accessibility',
      './validation',
      './errors',
      './types',
    ]));
  });
});
