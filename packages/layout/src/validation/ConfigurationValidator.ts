export interface ValidationWarning {
  readonly field: string;
  readonly message: string;
}

export interface ValidationResult<T> {
  readonly config: T;
  readonly warnings: ReadonlyArray<ValidationWarning>;
}

export interface ValidatedLayoutConfig {
  readonly padding: number;
  readonly overlapThreshold: number;
  readonly orientation: 'horizontal' | 'vertical' | 'auto';
}

export interface ValidatedViewportConfig {
  readonly minScale: number;
  readonly maxScale: number;
  readonly width: number;
  readonly height: number;
  readonly animationFrameMs: number;
}

export interface ValidatedInteractionConfig {
  readonly hoverDelay: number;
  readonly longPressDurationMs: number;
  readonly tapMaxDurationMs: number;
  readonly movementThresholdPx: number;
}

const DEFAULT_LAYOUT_CONFIG: ValidatedLayoutConfig = {
  padding: 16,
  overlapThreshold: 8,
  orientation: 'auto',
};

const DEFAULT_VIEWPORT_CONFIG: ValidatedViewportConfig = {
  minScale: 0.25,
  maxScale: 8,
  width: 800,
  height: 600,
  animationFrameMs: 16,
};

const DEFAULT_INTERACTION_CONFIG: ValidatedInteractionConfig = {
  hoverDelay: 150,
  longPressDurationMs: 500,
  tapMaxDurationMs: 250,
  movementThresholdPx: 8,
};

export class ConfigurationValidator {
  public validateLayoutConfig(
    input: Partial<ValidatedLayoutConfig>,
  ): ValidationResult<ValidatedLayoutConfig> {
    const warnings: ValidationWarning[] = [];
    const orientation = normalizeOrientation(input.orientation, warnings);

    return {
      config: {
        padding: normalizeNonNegativeNumber(
          input.padding,
          DEFAULT_LAYOUT_CONFIG.padding,
          'padding',
          warnings,
        ),
        overlapThreshold: normalizeNonNegativeNumber(
          input.overlapThreshold,
          DEFAULT_LAYOUT_CONFIG.overlapThreshold,
          'overlapThreshold',
          warnings,
        ),
        orientation,
      },
      warnings,
    };
  }

  public validateViewportConfig(
    input: Partial<ValidatedViewportConfig>,
  ): ValidationResult<ValidatedViewportConfig> {
    const warnings: ValidationWarning[] = [];
    const minScale = normalizePositiveNumber(
      input.minScale,
      DEFAULT_VIEWPORT_CONFIG.minScale,
      'minScale',
      warnings,
    );
    const requestedMaxScale = normalizePositiveNumber(
      input.maxScale,
      DEFAULT_VIEWPORT_CONFIG.maxScale,
      'maxScale',
      warnings,
    );
    const maxScale = requestedMaxScale >= minScale
      ? requestedMaxScale
      : addWarningAndReturn(
        warnings,
        'maxScale',
        'maxScale must be greater than or equal to minScale. Using a safe fallback.',
        Math.max(DEFAULT_VIEWPORT_CONFIG.maxScale, minScale),
      );

    return {
      config: {
        minScale,
        maxScale,
        width: normalizePositiveInteger(input.width, DEFAULT_VIEWPORT_CONFIG.width, 'width', warnings),
        height: normalizePositiveInteger(input.height, DEFAULT_VIEWPORT_CONFIG.height, 'height', warnings),
        animationFrameMs: normalizePositiveInteger(
          input.animationFrameMs,
          DEFAULT_VIEWPORT_CONFIG.animationFrameMs,
          'animationFrameMs',
          warnings,
        ),
      },
      warnings,
    };
  }

  public validateInteractionConfig(
    input: Partial<ValidatedInteractionConfig>,
  ): ValidationResult<ValidatedInteractionConfig> {
    const warnings: ValidationWarning[] = [];

    return {
      config: {
        hoverDelay: normalizeNonNegativeNumber(
          input.hoverDelay,
          DEFAULT_INTERACTION_CONFIG.hoverDelay,
          'hoverDelay',
          warnings,
        ),
        longPressDurationMs: normalizeNonNegativeNumber(
          input.longPressDurationMs,
          DEFAULT_INTERACTION_CONFIG.longPressDurationMs,
          'longPressDurationMs',
          warnings,
        ),
        tapMaxDurationMs: normalizeNonNegativeNumber(
          input.tapMaxDurationMs,
          DEFAULT_INTERACTION_CONFIG.tapMaxDurationMs,
          'tapMaxDurationMs',
          warnings,
        ),
        movementThresholdPx: normalizeNonNegativeNumber(
          input.movementThresholdPx,
          DEFAULT_INTERACTION_CONFIG.movementThresholdPx,
          'movementThresholdPx',
          warnings,
        ),
      },
      warnings,
    };
  }
}

function normalizeOrientation(
  value: string | undefined,
  warnings: ValidationWarning[],
): ValidatedLayoutConfig['orientation'] {
  if (value === 'horizontal' || value === 'vertical' || value === 'auto') {
    return value;
  }

  if (value !== undefined) {
    warnings.push({
      field: 'orientation',
      message: 'Invalid orientation. Falling back to auto.',
    });
  }

  return DEFAULT_LAYOUT_CONFIG.orientation;
}

function normalizeNonNegativeNumber(
  value: number | undefined,
  fallback: number,
  field: string,
  warnings: ValidationWarning[],
): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value;
  }

  if (value !== undefined) {
    warnings.push({
      field,
      message: `Invalid ${field}. Falling back to ${fallback}.`,
    });
  }

  return fallback;
}

function normalizePositiveNumber(
  value: number | undefined,
  fallback: number,
  field: string,
  warnings: ValidationWarning[],
): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (value !== undefined) {
    warnings.push({
      field,
      message: `Invalid ${field}. Falling back to ${fallback}.`,
    });
  }

  return fallback;
}

function normalizePositiveInteger(
  value: number | undefined,
  fallback: number,
  field: string,
  warnings: ValidationWarning[],
): number {
  return Math.round(normalizePositiveNumber(value, fallback, field, warnings));
}

function addWarningAndReturn(
  warnings: ValidationWarning[],
  field: string,
  message: string,
  fallback: number,
): number {
  warnings.push({ field, message });

  return fallback;
}
