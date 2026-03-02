import { describe, expect, it } from 'vitest';

import { ConfigurationValidator } from './ConfigurationValidator';

describe('ConfigurationValidator', () => {
  it('falls back to defaults for invalid layout config values', () => {
    const validator = new ConfigurationValidator();
    const result = validator.validateLayoutConfig({
      padding: -1,
      overlapThreshold: Number.NaN,
      orientation: 'diagonal' as 'auto',
    });

    expect(result.config).toEqual({
      padding: 16,
      overlapThreshold: 8,
      orientation: 'auto',
    });
    expect(result.warnings).toHaveLength(3);
  });

  it('falls back to defaults for invalid viewport config values', () => {
    const validator = new ConfigurationValidator();
    const result = validator.validateViewportConfig({
      minScale: -1,
      maxScale: 0.1,
      width: 0,
      height: -100,
      animationFrameMs: -16,
    });

    expect(result.config).toEqual({
      minScale: 0.25,
      maxScale: 8,
      width: 800,
      height: 600,
      animationFrameMs: 16,
    });
    expect(result.warnings.length).toBeGreaterThanOrEqual(5);
  });

  it('falls back to defaults for invalid interaction config values', () => {
    const validator = new ConfigurationValidator();
    const result = validator.validateInteractionConfig({
      hoverDelay: -10,
      longPressDurationMs: -20,
      tapMaxDurationMs: -30,
      movementThresholdPx: -40,
    });

    expect(result.config).toEqual({
      hoverDelay: 150,
      longPressDurationMs: 500,
      tapMaxDurationMs: 250,
      movementThresholdPx: 8,
    });
    expect(result.warnings).toHaveLength(4);
  });

  it('passes valid configuration through without warnings', () => {
    const validator = new ConfigurationValidator();
    const result = validator.validateViewportConfig({
      minScale: 1,
      maxScale: 3,
      width: 1200,
      height: 900,
      animationFrameMs: 24,
    });

    expect(result.config).toEqual({
      minScale: 1,
      maxScale: 3,
      width: 1200,
      height: 900,
      animationFrameMs: 24,
    });
    expect(result.warnings).toHaveLength(0);
  });
});
