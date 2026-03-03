export type Result<T, E> =
  | {
      readonly ok: true;
      readonly value: T;
    }
  | {
      readonly ok: false;
      readonly error: E;
    };

export interface Parser<TInput, TOutput, TError> {
  parse(input: TInput): Result<TOutput, TError>;
}
