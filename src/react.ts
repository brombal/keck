import { type DeriveEqualFn, focus, observe, reset, unwrap } from "keck";
import { type MutableRefObject, useId, useLayoutEffect, useRef, useState } from "react";

let finalizationRegistry: FinalizationRegistry<any> | undefined;

if (window.FinalizationRegistry && (window as any).KECK_OBSERVE_GC && !finalizationRegistry) {
  console.log("keck/react: initializing FinalizationRegistry");
  finalizationRegistry = new FinalizationRegistry((...args) =>
    console.log("keck/react: FinalizationRegistry callback invoked", args)
  );
}

const renderStack = new Set<number>();

export function useObserver<TData extends object>(data: TData, deps?: unknown[]): TData;
export function useObserver<TData extends object>(data: TData, callback: () => void): TData;
export function useObserver<TData extends object>(data: TData, deps: unknown[], callback: () => void): TData;

export function useObserver<TData extends object>(data: TData, depsOrCallback?: unknown[] | (() => void), callback?: () => void): TData {
  let deps = typeof depsOrCallback === "function" ? [] : (depsOrCallback || []);
  callback = typeof depsOrCallback === "function" ? depsOrCallback : callback;

  const id = renderStack.size + 1;
  renderStack.add(id);

  const mounted = useRef(true);
  const [, forceRerender] = useState({});

  const ref = useRefWithDeps<TData>(() => {
    const value = observe(data, () => {
      if (!mounted.current) return;

      const rerender = () => {
        callback?.();
        forceRerender({});
      };

      if (renderStack.has(id) || !renderStack.size) {
        rerender(); // Current component or not in render phase — safe to re-render immediately
      } else {
        queueMicrotask(rerender); // Other components — defer
      }
    });
    finalizationRegistry?.register(value, "Keck observable released");
    return value;
  }, deps);

  const state = ref.current;

  // Begin observing on render
  focus(state);
  reset(state);

  useLayoutEffect(() => {
    focus(state, false);
    renderStack.delete(id);
  });

  // Stop observing as soon as component finishes rendering
  queueMicrotask(() => {
    focus(state, false);
    renderStack.delete(id);
  });

  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  return state;
}

/**
 * Hook that will observe `data`, and only re-render the component when the result of `deriveFn` changes.
 * Returns the result of `deriveFn`.
 */
export function useDerived<TData extends object, TDerived>(
  data: TData,
  deriveFn: (state: TData) => TDerived,
  isEqual?: DeriveEqualFn<TDerived>
): TDerived {
  const [, forceRerender] = useState({});

  const deriveResultRef = useRef<TDerived>();

  const ref = useRef<TData>();
  if (!ref.current) {
    ref.current = observe(
      data,
      () => forceRerender({}),
      (data): TDerived => {
        return (deriveResultRef.current = deriveFn(data));
      },
      isEqual
    );
    finalizationRegistry?.register(ref.current, "Keck derived observable released");
  }

  return unwrap(deriveResultRef.current!);
}


function useRefWithDeps<T>(factory: () => T, deps: unknown[]): MutableRefObject<T> {
  const ref = useRef<T>();
  const depsRef = useRef<unknown[]>();

  const hasChanged =
    !depsRef.current ||
    deps.length !== depsRef.current.length ||
    deps.some((dep, i) => !Object.is(dep, depsRef.current![i]));

  if (hasChanged) {
    ref.current = factory();
    depsRef.current = deps;
  }

  return ref as MutableRefObject<T>;
}
