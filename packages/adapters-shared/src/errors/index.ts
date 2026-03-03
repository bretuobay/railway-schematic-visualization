export const ERROR_CODES = {
  ADAPTER_UNIMPLEMENTED: 'ADAPTER_UNIMPLEMENTED',
  EXPORT_NOT_READY: 'EXPORT_NOT_READY',
  LIFECYCLE_NOT_READY: 'LIFECYCLE_NOT_READY',
} as const;

export type AdapterErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export class AdapterError extends Error {
  public readonly code: AdapterErrorCode;
  public readonly context: Readonly<Record<string, unknown>> | undefined;

  public constructor(
    message: string,
    code: AdapterErrorCode,
    context?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = 'AdapterError';
    this.code = code;
    this.context = context;
  }
}

export class ExportError extends AdapterError {
  public constructor(
    message: string,
    context?: Readonly<Record<string, unknown>>,
  ) {
    super(message, ERROR_CODES.EXPORT_NOT_READY, context);
    this.name = 'ExportError';
  }
}

export class LifecycleError extends AdapterError {
  public constructor(
    message: string,
    context?: Readonly<Record<string, unknown>>,
  ) {
    super(message, ERROR_CODES.LIFECYCLE_NOT_READY, context);
    this.name = 'LifecycleError';
  }
}
