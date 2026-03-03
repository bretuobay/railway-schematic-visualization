export const ERROR_CODES = {
  BUILD_ERROR: 'BUILD_ERROR',
  PARSE_ERROR: 'PARSE_ERROR',
  PROJECTION_ERROR: 'PROJECTION_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface ParseErrorContext {
  readonly source?: string;
  readonly fieldPath?: string;
  readonly line?: number;
  readonly column?: number;
  readonly identifier?: string;
  readonly range?: {
    readonly min: number;
    readonly max: number;
  };
}

export class RailSchematicError extends Error {
  public readonly code: ErrorCode;
  public readonly context: ParseErrorContext | undefined;

  public constructor(code: ErrorCode, message: string, context?: ParseErrorContext) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.context = context;
  }

  public override toString(): string {
    return `${this.code}: ${this.message}`;
  }
}

export class ParseError extends RailSchematicError {
  public constructor(message: string, context?: ParseErrorContext) {
    super(ERROR_CODES.PARSE_ERROR, message, context);
  }
}

export class ValidationError extends RailSchematicError {
  public constructor(message: string, context?: ParseErrorContext) {
    super(ERROR_CODES.VALIDATION_ERROR, message, context);
  }
}

export class ProjectionError extends RailSchematicError {
  public constructor(message: string, context?: ParseErrorContext) {
    super(ERROR_CODES.PROJECTION_ERROR, message, context);
  }
}

export class BuildError extends RailSchematicError {
  public constructor(message: string, context?: ParseErrorContext) {
    super(ERROR_CODES.BUILD_ERROR, message, context);
  }
}
