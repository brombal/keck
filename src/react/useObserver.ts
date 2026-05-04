import { type DeriveEqualFn, focus, type ObserverCallbackContext, observe, unobserve } from 'keck';
import { useSyncMemo } from 'keck/react/useSyncMemo';
import * as React from 'react';
import {
  useCallback,
  useInsertionEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from 'react';

// In production this assignment is: () => undefined, making the real implementation dead code.
const getComponentName: () => string | undefined =
  process.env.NODE_ENV !== 'production'
    ? () => {
        try {
          // React 18: fiber is available via ReactCurrentOwner
          const fiber = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
            ?.ReactCurrentOwner?.current;
          /* istanbul ignore next -- React 18 path, unreachable on React 19+ */
          if (fiber) return fiber.type?.displayName || fiber.type?.name || undefined;

          // React 19+: captureOwnerStack() is a public dev API that returns the component stack as a string.
          // The first entry is the currently-rendering component.
          const captureOwnerStack = (React as any).captureOwnerStack;
          /* istanbul ignore else -- React 19+ always has captureOwnerStack */
          if (typeof captureOwnerStack === 'function') {
            const stack: string | null = captureOwnerStack();
            const match = stack?.match(/^\n\s+at (\w+)\s/);
            /* istanbul ignore else -- only anonymous/unnamed components produce no match */
            if (match?.[1]) {
              return match[1];
            }
          }
        } catch /* istanbul ignore next */ {
          return undefined;
        }
      }
    : /* istanbul ignore next */ () => undefined;

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
  cb: (context: ObserverCallbackContext) => void,
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
    onChange: (derived: TDerived, context: ObserverCallbackContext) => void;
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

  const componentName = getComponentName();

  const cbRef = useRef(cb);
  const deriveFnRef = useRef(deriveFn);
  const isEqualRef = useRef(isEqual);
  cbRef.current = cb;
  deriveFnRef.current = deriveFn;
  isEqualRef.current = isEqual;

  // Side-effect observer (callback/derive modes only; no-op for render mode)
  const sideEffectProxy = useSyncMemo(
    (previous) => {
      if (mode === 'render') return data;
      if (previous) unobserve(previous);
      if (mode === 'callback') {
        return observe(data, (ctx) =>
          (cbRef.current as ((ctx: ObserverCallbackContext) => void) | undefined)?.(ctx),
        );
      }
      return observe(data, {
        derive: (s) => deriveFnRef.current!(s),
        onChange: (derived, ctx) =>
          (cbRef.current as ((d: any, ctx: ObserverCallbackContext) => void) | undefined)?.(
            derived,
            ctx,
          ),
        isEqual: isEqualRef.current ? (a, b) => isEqualRef.current!(a, b) : undefined,
      });
    },
    [...(deps || []), mode],
  );
  const sideEffectProxyRef = useRef<any>(sideEffectProxy);
  sideEffectProxyRef.current = sideEffectProxy;

  const renderValidRef = useRef(false);

  // versionRef is a monotonically increasing counter that acts as the snapshot for
  // useSyncExternalStore. It increments each time an observed property changes, which causes
  // React to detect the change and schedule a synchronous re-render — preventing tearing in
  // concurrent mode (transitions, Suspense) where sibling components may render at different times.
  const versionRef = useRef(0);
  const notifyRef = useRef<(() => void) | null>(null);

  useSyncExternalStore(
    useCallback((notify) => {
      notifyRef.current = notify;
      return () => {
        notifyRef.current = null;
      };
    }, []),
    useCallback(() => versionRef.current, []),
  );

  // Render observer: tracks property reads during render and triggers re-renders on change.
  const state = useSyncMemo<any>((previous) => {
    if (previous) unobserve(previous);
    const value = observe(data, {
      name: componentName,
      focusable: true,
      onChange: () => {
        const rerender = () => {
          // Re-check renderValidRef inside the deferred closure: if this component unmounted between
          // when the callback fired and when the layout effect drains renderRequests, skip the call.
          if (renderValidRef.current) {
            versionRef.current++;
            notifyRef.current?.();
          }
        };

        if (isRendering) {
          renderRequests.add(rerender); // Other components — defer
        } else {
          rerender(); // Current component or not in render phase — safe to re-render immediately
        }
      },
    });
    return value;
  }, deps || []);

  const stateRef = useRef<any>(state);
  stateRef.current = state;

  // Begin a capture session for this render. Reads go into the session's pending Set and cannot
  // trigger callbacks. Any prior abandoned session for this observer is settled first.
  // The session auto-discards via microtask if the render is abandoned (Suspense, bail-out,
  // interrupted transition) and commit is never called.
  const tx = focus(state);

  // Commit when React confirms the render. Promotes pending reads to _validObservations and
  // re-enables the observer. isRendering is cleared here so that subsequent writes from sibling
  // renders in the same pass are not incorrectly deferred.
  useInsertionEffect(() => {
    isRendering = false;
    renderValidRef.current = true;
    tx.commit();
  });

  // Reset isRendering for abandoned renders where useInsertionEffect never fires. The capture
  // session handles its own discard via the microtask queued inside capture().
  queueMicrotask(() => {
    isRendering = false;
  });

  useInsertionEffect(() => {
    return () => {
      // Prevents the observer callback from scheduling a re-render after unmount (or during
      // Strict Mode's simulated unmount/remount). Any in-flight transaction auto-discards via
      // its own microtask, so no explicit discard is needed here.
      renderValidRef.current = false;
      unobserve(stateRef.current);
      if (mode !== 'render') unobserve(sideEffectProxyRef.current);
    };
  }, [mode]);

  // Process any deferred render requests
  useLayoutEffect(() => {
    for (const rerender of renderRequests) {
      rerender();
    }
    renderRequests.clear();
  });

  return state;
}
