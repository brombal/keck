import { reset, observe, focus, derive } from 'keck';
import { useRef, useInsertionEffect, useState, useLayoutEffect } from 'react';

function useRefWithDeps(factory, deps) {
    const ref = useRef();
    const depsRef = useRef();
    const hasChanged = !depsRef.current ||
        deps.length !== depsRef.current.length ||
        deps.some((dep, i) => !Object.is(dep, depsRef.current[i]));
    if (hasChanged) {
        ref.current = factory(ref.current);
        depsRef.current = deps;
    }
    return ref;
}

/**
 * Returns an observable proxy for `data` that invokes the provided callback when `data` is
 * modified. The observable is unfocused, so it will invoke the callback for any changes.
 * The callback is only active while the component is mounted.
 *
 * The observable proxy is memoized based on the `deps` array. To re-initialize the data, provide
 * a dependency array that includes values that would indicate when to reset the state.
 *
 * @internal Internal use only. This is exported as the overloaded method `useObserver()`.
 * @param data The data to observe.
 * @param cb The callback to invoke when any observed property changes.
 * @param deps Optional dependency array to refresh the observable proxy reference.
 */
function useObserverCallback(data, cb, deps) {
    return useRefWithDeps((previous) => {
        if (previous)
            reset(previous);
        const value = observe(data, cb);
        globalThis?.keckFinalizationRegistry?.register(value, 'Keck observable released');
        return value;
    }, deps || []).current;
}

function useObserverDeriveCallback(data, deriveFn, cb, deps) {
    const state = useObserverCallback(data, () => cb(deriveFn(state)), deps);
    focus(state);
    reset(state);
    derive(() => deriveFn(state));
    // Stop observing specific properties as soon as component finishes rendering
    useInsertionEffect(() => {
        focus(state, false);
    });
    // biome-ignore lint/correctness/useExhaustiveDependencies: just used for unmounting cleanup
    useInsertionEffect(() => {
        return () => reset(state);
    }, []);
    return state;
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
 * Returns an observable proxy for `data` that will cause the component to re-render when any of
 * its observed properties change. Properties are only observed while the component is rendering.
 * After render, only changes to observed properties will cause re-renders.
 *
 * `data` is memoized based on the `deps` array.
 * - For local, inline state objects, this allows the same state object to persist between renders.
 *   You can think of the `data` parameter as the "initial value" for the observable state. If you
 *   want to reinitialize the state object, you can provide a dependency array that includes values
 *   that would indicate when to reset the state.
 * - For shared state objects that might change reference between renders (e.g. from props, context,
 *   etc), you should include the object in the dependency array to ensure that an observable proxy
 *   for the new object is returned. If you never expect the `data` object to change (e.g. global
 *   or module-level variables), you can omit the `deps` array.
 *
 * @param data The data to observe.
 * @param deps Optional dependency array to refresh the observable proxy reference.
 * @return The observable proxy of `data`.
 */
function useObserverRenderer(data, deps) {
    isRendering = true;
    let renderValid = false;
    const [, forceRerender] = useState({});
    const state = useObserverCallback(data, () => {
        // React may abandon the render for Suspense, etc. In that case, we should not attempt to re-render.
        if (!renderValid)
            return;
        const rerender = () => {
            forceRerender({});
        };
        if (isRendering) {
            renderRequests.add(rerender); // Other components — defer
        }
        else {
            rerender(); // Current component or not in render phase — safe to re-render immediately
        }
    }, deps);
    // Begin observing on render
    focus(state);
    reset(state);
    // Disable isRendering and stop observing specific properties as soon as component finishes rendering
    useInsertionEffect(() => {
        isRendering = false;
        renderValid = true;
        focus(state, false);
    });
    // If the render is abandoned by React, effects won't run, so we also clear isRendering in a microtask just in case.
    // TODO It's possible this would be better handled by a deferral mechanism that allows registering observations
    //  but not "committing" them until later, e.g.:
    //  const commit = defer(state);
    //  useLayoutEffect(() => commit());
    queueMicrotask(() => {
        isRendering = false;
        focus(state, false);
    });
    // biome-ignore lint/correctness/useExhaustiveDependencies: just used for unmounting cleanup
    useInsertionEffect(() => {
        return () => {
            reset(state);
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

/**
 * @internal This is the function implementation that handles all the overloads.
 */
function useObserver(...args) {
    const data = args.shift();
    const hasDeps = Array.isArray(args[args.length - 1]);
    const deps = hasDeps ? args.pop() : undefined;
    if (!args.length) {
        return useObserverRenderer(data, deps);
    }
    if (args.length === 1) {
        const cb = args[0];
        return useObserverCallback(data, cb, deps);
    }
    if (args.length === 2) {
        const deriveFn = args[0];
        const cb = args[1];
        return useObserverDeriveCallback(data, deriveFn, cb, deps);
    }
}

export { useObserver };
//# sourceMappingURL=react.js.map
