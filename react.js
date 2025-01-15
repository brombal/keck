import { observe, focus, reset, unwrap } from 'keck';
import { useRef, useState, useLayoutEffect } from 'react';

let finalizationRegistry;
if (window.FinalizationRegistry && window.KECK_OBSERVE_GC && !finalizationRegistry) {
    console.log('keck/react: initializing FinalizationRegistry');
    finalizationRegistry = new FinalizationRegistry((...args) => console.log('keck/react: FinalizationRegistry callback invoked', args));
}
function useObserver(data, callback) {
    const mounted = useRef(true);
    const [, forceRerender] = useState({});
    const ref = useRef();
    if (!ref.current) {
        ref.current = observe(data, () => {
            if (!mounted.current)
                return;
            callback?.();
            forceRerender({});
        });
        finalizationRegistry?.register(ref.current, 'Keck observable released');
    }
    const state = ref.current;
    // Begin observing on render
    focus(state);
    reset(state);
    // Stop observing as soon as component finishes rendering
    useLayoutEffect(() => {
        focus(state, false);
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
        finalizationRegistry?.register(ref.current, 'Keck derived observable released');
    }
    return unwrap(deriveResultRef.current);
}

export { useDerived, useObserver };
//# sourceMappingURL=react.js.map
