import { focus, reset, observe, unwrap } from 'keck';
import { useRef, useState, useLayoutEffect } from 'react';

let finalizationRegistry;
if (window.FinalizationRegistry && window.KECK_OBSERVE_GC && !finalizationRegistry) {
    console.log("keck/react: initializing FinalizationRegistry");
    finalizationRegistry = new FinalizationRegistry((...args) => console.log("keck/react: FinalizationRegistry callback invoked", args));
}
const renderStack = new Set();
function useObserver(data, depsOrCallback, callback) {
    let deps = typeof depsOrCallback === "function" ? [] : (depsOrCallback || []);
    callback = typeof depsOrCallback === "function" ? depsOrCallback : callback;
    const id = renderStack.size + 1;
    renderStack.add(id);
    const mounted = useRef(true);
    const [, forceRerender] = useState({});
    const ref = useRefWithDeps(() => {
        const value = observe(data, () => {
            if (!mounted.current)
                return;
            const rerender = () => {
                callback?.();
                forceRerender({});
            };
            if (renderStack.has(id) || !renderStack.size) {
                rerender(); // Current component or not in render phase — safe to re-render immediately
            }
            else {
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
function useDerived(data, deriveFn, isEqual) {
    const [, forceRerender] = useState({});
    const deriveResultRef = useRef();
    const ref = useRef();
    if (!ref.current) {
        ref.current = observe(data, () => forceRerender({}), (data) => {
            return (deriveResultRef.current = deriveFn(data));
        }, isEqual);
        finalizationRegistry?.register(ref.current, "Keck derived observable released");
    }
    return unwrap(deriveResultRef.current);
}
function useRefWithDeps(factory, deps) {
    const ref = useRef();
    const depsRef = useRef();
    const hasChanged = !depsRef.current ||
        deps.length !== depsRef.current.length ||
        deps.some((dep, i) => !Object.is(dep, depsRef.current[i]));
    if (hasChanged) {
        ref.current = factory();
        depsRef.current = deps;
    }
    return ref;
}

export { useDerived, useObserver };
//# sourceMappingURL=react.js.map
