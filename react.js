import { ref, unobserve, observe, focus } from 'keck';
import * as React from 'react';
import { useRef, useSyncExternalStore, useCallback, useInsertionEffect, useLayoutEffect } from 'react';

/**
 * Creates a "ref" object compatible with React refs. You can use this within a Keck observable to store DOM elements.
 *
 * e.g.
 *
 * ```ts
 * const state = useObserver({
 *   myElementRef: reactRef<HTMLElement>(),
 * });
 *
 * <div ref={state.myElementRef}>
 * ```
 *
 * access it by using the ref's `.current` property:
 *
 * ```
 * const el = state.myElementRef.current;
 * ```
 */
function reactRef() {
    let current = null;
    return {
        get current() {
            return current;
        },
        set current(value) {
            current = ref(value);
        },
    };
}

function useSyncMemo(factory, deps) {
    const ref = useRef(undefined);
    const depsRef = useRef(undefined);
    const hasChanged = !depsRef.current ||
        deps.length !== depsRef.current.length ||
        deps.some((dep, i) => !Object.is(dep, depsRef.current[i]));
    if (hasChanged) {
        ref.current = factory(ref.current);
        depsRef.current = deps;
    }
    return ref.current;
}

// In production this assignment is: () => undefined, making the real implementation dead code.
const getComponentName = process.env.NODE_ENV !== 'production'
    ? () => {
        try {
            // React 18: fiber is available via ReactCurrentOwner
            const fiber = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
                ?.ReactCurrentOwner?.current;
            /* istanbul ignore next -- React 18 path, unreachable on React 19+ */
            if (fiber)
                return fiber.type?.displayName || fiber.type?.name || undefined;
            // React 19+: captureOwnerStack() is a public dev API that returns the component stack as a string.
            // The first entry is the currently-rendering component.
            const captureOwnerStack = React.captureOwnerStack;
            /* istanbul ignore else -- React 19+ always has captureOwnerStack */
            if (typeof captureOwnerStack === 'function') {
                const stack = captureOwnerStack();
                const match = stack?.match(/^\n\s+at (\w+)\s/);
                /* istanbul ignore else -- only anonymous/unnamed components produce no match */
                if (match?.[1]) {
                    return match[1];
                }
            }
        }
        catch /* istanbul ignore next */ {
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
const renderRequests = new Set();
/**
 * @internal This is the function implementation that handles all the overloads.
 */
function useObserver(...args) {
    const data = args.shift();
    const hasDeps = Array.isArray(args[args.length - 1]);
    const deps = hasDeps ? args.pop() : undefined;
    const firstArg = args[0];
    const mode = args.length === 0 ? 'render' : typeof firstArg === 'function' ? 'callback' : 'derive';
    const config = mode === 'derive'
        ? firstArg
        : undefined;
    const deriveFn = config?.derive;
    const cb = mode === 'derive'
        ? config?.onChange
        : mode === 'callback'
            ? firstArg
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
    const sideEffectProxy = useSyncMemo((previous) => {
        if (mode === 'render')
            return data;
        if (previous)
            unobserve(previous);
        if (mode === 'callback') {
            return observe(data, (ctx) => cbRef.current?.(ctx));
        }
        return observe(data, {
            derive: (s) => deriveFnRef.current(s),
            onChange: (derived, ctx) => cbRef.current?.(derived, ctx),
            isEqual: isEqualRef.current ? (a, b) => isEqualRef.current(a, b) : undefined,
        });
    }, [...(deps || []), mode]);
    const sideEffectProxyRef = useRef(sideEffectProxy);
    sideEffectProxyRef.current = sideEffectProxy;
    const renderValidRef = useRef(false);
    // versionRef is a monotonically increasing counter that acts as the snapshot for
    // useSyncExternalStore. It increments each time an observed property changes, which causes
    // React to detect the change and schedule a synchronous re-render — preventing tearing in
    // concurrent mode (transitions, Suspense) where sibling components may render at different times.
    const versionRef = useRef(0);
    const notifyRef = useRef(null);
    useSyncExternalStore(useCallback((notify) => {
        notifyRef.current = notify;
        return () => {
            notifyRef.current = null;
        };
    }, []), useCallback(() => versionRef.current, []));
    // Render observer: tracks property reads during render and triggers re-renders on change.
    const state = useSyncMemo((previous) => {
        if (previous)
            unobserve(previous);
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
                }
                else {
                    rerender(); // Current component or not in render phase — safe to re-render immediately
                }
            },
        });
        return value;
    }, deps || []);
    const stateRef = useRef(state);
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
            if (mode !== 'render')
                unobserve(sideEffectProxyRef.current);
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

export { reactRef, useObserver };
//# sourceMappingURL=react.js.map
