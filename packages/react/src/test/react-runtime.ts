type Cleanup = () => void;

interface HookEntry {
  deps: ReadonlyArray<unknown> | undefined;
  value: unknown;
  cleanup: Cleanup | undefined;
}

interface HookState {
  entries: HookEntry[];
  cursor: number;
}

const hookStates = new WeakMap<Function, HookState>();
let currentState: HookState | undefined;

function areDepsEqual(
  previousDeps: ReadonlyArray<unknown> | undefined,
  nextDeps: ReadonlyArray<unknown> | undefined,
): boolean {
  if (!previousDeps || !nextDeps) {
    return false;
  }

  if (previousDeps.length !== nextDeps.length) {
    return false;
  }

  return previousDeps.every((value, index) => Object.is(value, nextDeps[index]));
}

function getCurrentState(): HookState {
  if (!currentState) {
    throw new Error('React hook shim was used outside a component render.');
  }

  return currentState;
}

function readEntry<T>(factory: () => T): [HookEntry, T] {
  const state = getCurrentState();
  const index = state.cursor++;
  const existing = state.entries[index];

  if (existing) {
    return [existing, existing.value as T];
  }

  const value = factory();
  const entry: HookEntry = {
    deps: undefined,
    value,
    cleanup: undefined,
  };

  state.entries[index] = entry;

  return [entry, value];
}

export function createElement(
  type: unknown,
  props?: Record<string, unknown> | null,
  ...children: unknown[]
) {
  return {
    type,
    key: null,
    props: {
      ...(props ?? {}),
      ...(children.length > 0 ? { children } : {}),
    },
  };
}

export function forwardRef<T, P = Record<string, unknown>>(
  render: (props: P, ref: { current: T | null } | ((instance: T | null) => void) | null) => unknown,
) {
  function wrapped(props: P & { ref?: { current: T | null } | ((instance: T | null) => void) | null }) {
    const state = hookStates.get(wrapped) ?? {
      entries: [],
      cursor: 0,
    };

    hookStates.set(wrapped, state);
    state.cursor = 0;
    currentState = state;

    try {
      return render(props, props.ref ?? null);
    } finally {
      currentState = undefined;
    }
  }

  return wrapped;
}

export function memo<T>(component: T): T {
  return component;
}

export function useEffect(
  effect: () => void | Cleanup,
  deps?: ReadonlyArray<unknown>,
): void {
  const [entry] = readEntry(() => ({}));

  if (areDepsEqual(entry.deps, deps)) {
    return;
  }

  entry.cleanup?.();
  entry.deps = deps;
  const cleanup = effect();

  entry.cleanup = typeof cleanup === 'function' ? cleanup : undefined;
}

export function useImperativeHandle<T, R extends T>(
  ref: { current: T | null } | ((instance: T | null) => void) | null | undefined,
  create: () => R,
  deps?: ReadonlyArray<unknown>,
): void {
  const value = useMemo(create, deps);

  if (!ref) {
    return;
  }

  if (typeof ref === 'function') {
    ref(value);

    return;
  }

  ref.current = value;
}

export function useMemo<T>(
  factory: () => T,
  deps?: ReadonlyArray<unknown>,
): T {
  const [entry, currentValue] = readEntry(factory);

  if (!areDepsEqual(entry.deps, deps)) {
    const nextValue = factory();

    entry.value = nextValue;
    entry.deps = deps;

    return nextValue;
  }

  return currentValue;
}

export function useRef<T>(initialValue: T): { current: T } {
  const [, value] = readEntry(() => ({ current: initialValue }));

  return value as { current: T };
}

export function __unmount(component: Function): void {
  const state = hookStates.get(component);

  if (!state) {
    return;
  }

  state.entries.forEach((entry) => {
    entry.cleanup?.();
  });
  hookStates.delete(component);
}
