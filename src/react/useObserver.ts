import {
  beginTransaction,
  commitTransaction,
  type DeriveEqualFn,
  discardTransaction,
  observe,
  reset,
} from 'keck';
import { useSyncMemo } from 'keck/react/useSyncMemo';
import { useInsertionEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * `isRendering` informally tracks whether react is currently in a render phase. This is set to true directly inside useObserver,
 * and then immediately set to false when useInsertionEffect is invoked. Any keck state updates
 * made while `isRendering` is true will defer the rerender to a useLayoutEffect callback,
 * in order to prevent updating the state of other components during a render.
 *
 * It's highly discouraged to make state updates during a render, but since React allows this in some instances, Keck
 * tries to honor that behavior.
 */
let isRendering = false;

function registerObservableFinalizer(state: object) {
  (globalThis as any)?.keckFinalizationRegistry?.register(state, 'Keck observable released');
}

const renderRequests = new Set<() => void>();

/**
 * Creates an observable for `data` that re-renders the component when its observed properties
 * change. Returns an observable object that you can read during the component's render and modify
 * in effects or event handlers.
 *
 * e.g.
 *
 * In your component's render:
 *
 * ```tsx
 * const data = { count: 0 };
 * const state = useObserver(data);
 * ```
 *
 * Render a property:
 *
 * ```tsx
 * return <>{state.count}</>;
 * ```
 *
 * Modify a property (e.g. in an effect or event callback):
 *
 * ```tsx
 * <button onClick={() => state.count += 1}>Increment</button>
 * ```
 *
 * @param data The data to observe. This can be a plain object or an existing observable proxy.
 * @param deps Optional dependency array to refresh the callback, in case it references values from the component scope.
 */
export function useObserver<TData extends object>(data: TData, deps?: unknown[]): TData;

/**
 * Registers a callback that is invoked synchronously when any property of the underlying data is
 * modified (through any observable in your app created from the same data object). The callback is
 * only active while the component is mounted.
 *
 * The callback fires inside the proxy's set trap, synchronously with the mutation that triggered
 * it — unlike `useEffect`, which runs after React commits and may coalesce intermediate states.
 *
 * The returned state object behaves identically to the single-argument overload: reads during
 * render subscribe the component to re-render when those properties change. The callback is an
 * orthogonal side-effect channel.
 *
 * @param data The data to observe. This can be a plain object or an existing observable proxy.
 * @param cb The callback to invoke when any property changes.
 * @param deps Optional dependency array to refresh the callback, in case it references values from the component scope.
 */
export function useObserver<TData extends object>(
  data: TData,
  cb: () => void,
  deps?: unknown[],
): TData;

/**
 * Registers a callback that is invoked synchronously when the result of `config.derive` changes.
 * The callback is only active while the component is mounted.
 *
 * The callback fires inside the proxy's set trap, synchronously with the mutation that triggered
 * it — unlike `useEffect`, which runs after React commits and may coalesce intermediate states.
 *
 * The returned state object behaves identically to the single-argument overload: reads during
 * render subscribe the component to re-render when those properties change. The derived callback
 * is an orthogonal side-effect channel.
 *
 * @param data The data to observe. This can be a plain object or an existing observable proxy.
 * @param config.derive A function that derives a value from the observed data.
 * @param config.onChange The callback to invoke when the derived value changes.
 * @param config.isEqual Optional equality function. Defaults to strict equality.
 * @param deps Optional dependency array to recreate the observer when dependencies change.
 */
export function useObserver<TData extends object, TDerived>(
  data: TData,
  config: {
    derive: (state: TData) => TDerived;
    onChange: (derived: TDerived) => void;
    isEqual?: DeriveEqualFn<TDerived>;
  },
  deps?: unknown[],
): TData;

/**
 * @internal This is the function implementation that handles all the overloads.
 */
export function useObserver(...args: any[]): any {
  const data = args.shift();
  const hasDeps = Array.isArray(args[args.length - 1]);
  const deps = hasDeps ? (args.pop() as any[]) : undefined;

  const firstArg = args[0];
  const mode: 'render' | 'callback' | 'derive' =
    args.length === 0 ? 'render' : typeof firstArg === 'function' ? 'callback' : 'derive';

  const config =
    mode === 'derive'
      ? (firstArg as {
          derive: (s: any) => any;
          onChange: (d: any) => void;
          isEqual?: DeriveEqualFn<any>;
        })
      : undefined;
  const deriveFn = config?.derive;
  const cb =
    mode === 'derive'
      ? config?.onChange
      : mode === 'callback'
        ? (firstArg as () => void)
        : undefined;
  const isEqual = config?.isEqual;

  isRendering = true;

  const cbRef = useRef(cb);
  const deriveFnRef = useRef(deriveFn);
  const isEqualRef = useRef(isEqual);
  cbRef.current = cb;
  deriveFnRef.current = deriveFn;
  isEqualRef.current = isEqual;

  // Side-effect observer (callback/derive modes only; no-op for render mode)
  useSyncMemo(
    (previous) => {
      if (mode === 'render') return data;
      if (previous) reset(previous);
      if (mode === 'callback') {
        const state = observe(data, () => (cbRef.current as (() => void) | undefined)?.());
        registerObservableFinalizer(state);
        return state;
      }
      const state = observe(data, {
        derive: (s) => deriveFnRef.current!(s),
        onChange: (derived) => (cbRef.current as ((d: any) => void) | undefined)?.(derived),
        isEqual: isEqualRef.current ? (a, b) => isEqualRef.current!(a, b) : undefined,
      });
      registerObservableFinalizer(state);
      return state;
    },
    [...(deps || []), mode],
  );

  const renderValidRef = useRef(false);
  const [, forceRerender] = useState({});

  // Render observer: tracks property reads during render and triggers re-renders on change.
  // forceRerender is stable (React guarantee) so no cbRef is needed here.
  const state = useSyncMemo<any>((previous) => {
    if (previous) reset(previous);
    const value = observe(data, () => {
      // React may abandon the render for Suspense, etc. In that case, we should not attempt to re-render.
      if (!renderValidRef.current) return;

      const rerender = () => {
        // Re-check renderValidRef inside the deferred closure: if this component unmounted between
        // when the callback fired and when the layout effect drains renderRequests, skip the call.
        if (renderValidRef.current) forceRerender({});
      };

      if (isRendering) {
        renderRequests.add(rerender); // Other components — defer
      } else {
        rerender(); // Current component or not in render phase — safe to re-render immediately
      }
    });
    registerObservableFinalizer(value);
    return value;
  }, deps || []);

  // Begin transaction: reads during this render go into a pending staging area and cannot trigger
  // callbacks. If a prior abandoned render left uncommitted observations, the old pending Set is
  // discarded implicitly when beginTransaction() replaces it.
  beginTransaction(state);

  // Commit the transaction when the render is confirmed by React. This promotes pending reads to
  // _validObservations, making them live. isRendering is cleared here so that subsequent writes
  // (from sibling renders in the same pass) are not incorrectly deferred.
  useInsertionEffect(() => {
    isRendering = false;
    renderValidRef.current = true;
    commitTransaction(state);
  });

  // queueMicrotask is only needed to release isRendering when a render is abandoned (Suspense,
  // interrupted transition) and useInsertionEffect never fires. Pending observations from
  // abandoned renders are structurally inert — they are never in _validObservations — so no
  // cleanup of observations is necessary here.
  queueMicrotask(() => {
    isRendering = false;
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: just used for unmounting cleanup
  useInsertionEffect(() => {
    return () => {
      // Setting renderValidRef to false prevents the observer callback from scheduling a re-render
      // after this component unmounts (or during React Strict Mode's simulated unmount/remount).
      // discardTransaction releases the pending Set without destroying _validObservations, which
      // must be preserved so Strict Mode's remount can continue observing without a new render.
      renderValidRef.current = false;
      discardTransaction(state);
    };
  }, []);

  // Process any deferred render requests
  useLayoutEffect(() => {
    for (const rerender of renderRequests) {
      rerender();
    }
    renderRequests.clear();
  });

  return state;
}
