import { ref, reset, observe, beginTransaction } from 'keck';
import { useRef, useState, useInsertionEffect, useLayoutEffect } from 'react';

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
    const cbRef = useRef(cb);
    const deriveFnRef = useRef(deriveFn);
    const isEqualRef = useRef(isEqual);
    cbRef.current = cb;
    deriveFnRef.current = deriveFn;
    isEqualRef.current = isEqual;
    // Side-effect observer (callback/derive modes only; no-op for render mode)
    useSyncMemo((previous) => {
        if (mode === 'render')
            return data;
        if (previous)
            reset(previous);
        if (mode === 'callback') {
            return observe(data, () => cbRef.current?.());
        }
        return observe(data, {
            derive: (s) => deriveFnRef.current(s),
            onChange: (derived) => cbRef.current?.(derived),
            isEqual: isEqualRef.current ? (a, b) => isEqualRef.current(a, b) : undefined,
        });
    }, [...(deps || []), mode]);
    const renderValidRef = useRef(false);
    const [, forceRerender] = useState({});
    // Render observer: tracks property reads during render and triggers re-renders on change.
    // forceRerender is stable (React guarantee) so no cbRef is needed here.
    const state = useSyncMemo((previous) => {
        if (previous)
            reset(previous);
        const value = observe(data, () => {
            // React may abandon the render for Suspense, etc. In that case, we should not attempt to re-render.
            if (!renderValidRef.current)
                return;
            const rerender = () => {
                // Re-check renderValidRef inside the deferred closure: if this component unmounted between
                // when the callback fired and when the layout effect drains renderRequests, skip the call.
                if (renderValidRef.current)
                    forceRerender({});
            };
            if (isRendering) {
                renderRequests.add(rerender); // Other components — defer
            }
            else {
                rerender(); // Current component or not in render phase — safe to re-render immediately
            }
        });
        return value;
    }, deps || []);
    // Begin a transaction for this render. Reads go into the transaction's pending Set and cannot
    // trigger callbacks. Any prior abandoned transaction for this observer is settled first.
    // The transaction auto-discards via microtask if the render is abandoned (Suspense, bail-out,
    // interrupted transition) and commit is never called.
    const tx = beginTransaction(state);
    // Commit when React confirms the render. Promotes pending reads to _validObservations and
    // re-enables the observer. isRendering is cleared here so that subsequent writes from sibling
    // renders in the same pass are not incorrectly deferred.
    useInsertionEffect(() => {
        isRendering = false;
        renderValidRef.current = true;
        tx.commit();
    });
    // Reset isRendering for abandoned renders where useInsertionEffect never fires. The transaction
    // handles its own discard via the microtask queued inside beginTransaction.
    queueMicrotask(() => {
        isRendering = false;
    });
    // biome-ignore lint/correctness/useExhaustiveDependencies: just used for unmounting cleanup
    useInsertionEffect(() => {
        return () => {
            // Prevents the observer callback from scheduling a re-render after unmount (or during
            // Strict Mode's simulated unmount/remount). Any in-flight transaction auto-discards via
            // its own microtask, so no explicit discard is needed here.
            renderValidRef.current = false;
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

export { reactRef, useObserver };
//# sourceMappingURL=react.js.map
