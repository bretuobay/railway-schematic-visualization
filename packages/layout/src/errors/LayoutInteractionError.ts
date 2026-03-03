import type { ViewportTransform } from '../viewport';

export const layoutErrorCodes = ['LAYOUT_OVERLAP', 'LAYOUT_INVALID_GRAPH', 'LAYOUT_TIMEOUT'] as const;
export const viewportErrorCodes = ['VIEWPORT_BOUNDS', 'VIEWPORT_SCALE', 'VIEWPORT_TRANSFORM'] as const;
export const interactionErrorCodes = ['INTERACTION_TARGET', 'INTERACTION_SELECTION', 'INTERACTION_GESTURE'] as const;
export const configurationErrorCodes = ['CONFIG_INVALID', 'CONFIG_RANGE', 'CONFIG_REQUIRED'] as const;

export type LayoutErrorCode = typeof layoutErrorCodes[number];
export type ViewportErrorCode = typeof viewportErrorCodes[number];
export type InteractionErrorCode = typeof interactionErrorCodes[number];
export type ConfigurationErrorCode = typeof configurationErrorCodes[number];

export class LayoutInteractionError extends Error {
  public readonly code: string;

  public constructor(message: string, code: string) {
    super(`${code}: ${message}`);
    this.name = 'LayoutInteractionError';
    this.code = code;
  }
}

export class LayoutError extends LayoutInteractionError {
  public readonly context: Record<string, unknown> | undefined;

  public constructor(
    message: string,
    code: LayoutErrorCode,
    context?: Record<string, unknown>,
  ) {
    super(message, code);
    this.name = 'LayoutError';
    this.context = context;
  }
}

export class ViewportError extends LayoutInteractionError {
  public readonly transform: Partial<ViewportTransform> | undefined;

  public constructor(
    message: string,
    code: ViewportErrorCode,
    transform?: Partial<ViewportTransform>,
  ) {
    super(message, code);
    this.name = 'ViewportError';
    this.transform = transform;
  }
}

export class InteractionError extends LayoutInteractionError {
  public readonly elementId: string | undefined;

  public constructor(
    message: string,
    code: InteractionErrorCode,
    elementId?: string,
  ) {
    super(message, code);
    this.name = 'InteractionError';
    this.elementId = elementId;
  }
}

export class ConfigurationError extends LayoutInteractionError {
  public readonly field: string | undefined;
  public readonly value: unknown;

  public constructor(
    message: string,
    code: ConfigurationErrorCode,
    field?: string,
    value?: unknown,
  ) {
    super(message, code);
    this.name = 'ConfigurationError';
    this.field = field;
    this.value = value;
  }
}
