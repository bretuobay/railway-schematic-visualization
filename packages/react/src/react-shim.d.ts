declare module 'react' {
  export interface ReactElement<P = Record<string, unknown>, T = unknown> {
    readonly type: T;
    readonly props: P;
    readonly key: string | number | null;
  }

  export interface MutableRefObject<T> {
    current: T;
  }

  export interface RefObject<T> {
    current: T | null;
  }

  export type RefCallback<T> = (instance: T | null) => void;
  export type ForwardedRef<T> = RefCallback<T> | RefObject<T> | null;

  export function createElement(
    type: unknown,
    props?: Record<string, unknown> | null,
    ...children: unknown[]
  ): ReactElement;
  export function forwardRef<T, P = Record<string, unknown>>(
    render: (props: P, ref: ForwardedRef<T>) => ReactElement | null,
  ): (props: P & { ref?: ForwardedRef<T> }) => ReactElement | null;
  export function memo<T>(component: T): T;
  export function useEffect(
    effect: () => void | (() => void),
    deps?: ReadonlyArray<unknown>,
  ): void;
  export function useImperativeHandle<T, R extends T>(
    ref: ForwardedRef<T> | undefined,
    create: () => R,
    deps?: ReadonlyArray<unknown>,
  ): void;
  export function useMemo<T>(
    factory: () => T,
    deps?: ReadonlyArray<unknown>,
  ): T;
  export function useRef<T>(initialValue: T): MutableRefObject<T>;
}
