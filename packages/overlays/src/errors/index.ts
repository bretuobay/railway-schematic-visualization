export const overlayErrorCodes = [
  'OVERLAY_DUPLICATE',
  'OVERLAY_INVALID',
  'OVERLAY_LIFECYCLE',
  'OVERLAY_NOT_FOUND',
  'OVERLAY_OPACITY',
  'OVERLAY_REGISTRATION',
  'OVERLAY_RENDER',
  'OVERLAY_UPDATE',
] as const;

export type OverlayErrorCode = typeof overlayErrorCodes[number];

export class OverlayError extends Error {
  public readonly code: OverlayErrorCode;
  public readonly details: Readonly<Record<string, unknown>> | undefined;

  public constructor(
    message: string,
    code: OverlayErrorCode,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(`${code}: ${message}`);
    this.name = 'OverlayError';
    this.code = code;
    this.details = details;
  }
}

export class RegistryError extends OverlayError {
  public constructor(
    message: string,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(message, 'OVERLAY_REGISTRATION', details);
    this.name = 'RegistryError';
  }
}
