import { observe, focus, reset, disable, unwrap } from 'keck';
import { useState, useRef, useLayoutEffect, useEffect } from 'react';

function useObserver(data) {
    const [, forceRerender] = useState({});
    const ref = useRef();
    if (!ref.current) {
        ref.current = observe(data, () => forceRerender({}));
        focus(ref.current);
    }
    const state = ref.current;
    // Begin observing on render
    reset(state, true);
    // Stop observing as soon as component finishes rendering
    useLayoutEffect(() => {
        focus(state, false);
    });
    // Disable callback when component unmounts
    useEffect(() => {
        return () => {
            reset(state, true);
            disable(state);
        };
    }, [state]);
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
    }
    useEffect(() => {
        return () => disable(ref.current);
    }, []);
    return unwrap(deriveResultRef.current);
}

export { useDerived, useObserver };
//# sourceMappingURL=react.js.map
