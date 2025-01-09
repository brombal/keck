import { type DeriveEqualFn, disable, focus, observe, reset, unwrap } from 'keck';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export function useObserver<TData extends object>(data: TData): TData {
  const [, forceRerender] = useState({});
  const ref = useRef<TData>();
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
export function useDerived<TData extends object, TDerived>(
  data: TData,
  deriveFn: (state: TData) => TDerived,
  isEqual?: DeriveEqualFn<TDerived>,
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
      isEqual,
    );
  }

  useEffect(() => {
    return () => disable(ref.current!);
  }, []);

  return unwrap(deriveResultRef.current!);
}
