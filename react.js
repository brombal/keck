import { disable, focus, observe, reset, unwrap } from 'keck';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

function useObserver(data) {
  const [, forceRerender] = useState({});
  const ref = useRef();
  if (!ref.current) {
    ref.current = observe(data, () => forceRerender({}));
  }
  const state = ref.current;
  // Begin observing on render
  focus(state);
  reset(state);
  // Stop observing as soon as component finishes rendering
  useLayoutEffect(() => {
    focus(state, false);
  });
  // Disable callback when component unmounts
  useEffect(() => {
    return () => {
      reset(state);
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
    ref.current = observe(
      data,
      () => forceRerender({}),
      (data) => {
        return (deriveResultRef.current = deriveFn(data));
      },
      isEqual,
    );
  }
  useEffect(() => {
    return () => disable(ref.current);
  }, []);
  return unwrap(deriveResultRef.current);
}

export { useDerived, useObserver };
//# sourceMappingURL=react.js.map
