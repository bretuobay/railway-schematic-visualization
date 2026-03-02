export class Debounce {
  public static debounce<TArgs extends ReadonlyArray<unknown>>(
    fn: (...args: TArgs) => void,
    waitMs: number,
  ): (...args: TArgs) => void {
    let handle: ReturnType<typeof setTimeout> | undefined;

    return (...args: TArgs) => {
      if (handle !== undefined) {
        clearTimeout(handle);
      }

      handle = setTimeout(() => {
        handle = undefined;
        fn(...args);
      }, waitMs);
    };
  }

  public static throttle<TArgs extends ReadonlyArray<unknown>>(
    fn: (...args: TArgs) => void,
    waitMs: number,
  ): (...args: TArgs) => void {
    let throttled = false;
    let trailingArgs: TArgs | undefined;
    let handle: ReturnType<typeof setTimeout> | undefined;

    const schedule = (): void => {
      throttled = true;
      handle = setTimeout(() => {
        handle = undefined;

        if (trailingArgs) {
          const bufferedArgs = trailingArgs;
          trailingArgs = undefined;
          fn(...bufferedArgs);
          schedule();
          return;
        }

        throttled = false;
      }, waitMs);
    };

    return (...args: TArgs) => {
      if (!throttled) {
        fn(...args);
        if (handle !== undefined) {
          clearTimeout(handle);
        }
        schedule();
        return;
      }

      trailingArgs = args;
    };
  }
}
