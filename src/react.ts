import { type DeriveEqualFn, focus, observe, reset, unwrap } from 'keck';
import { useLayoutEffect, useRef, useState } from 'react';

let finalizationRegistry: FinalizationRegistry<any> | undefined;

export function useObserver<TData extends object>(data: TData, callback?: () => void): TData {
  if (window.FinalizationRegistry && (window as any).KECK_OBSERVE_GC && !finalizationRegistry) {
    console.log('keck/react: initializing FinalizationRegistry');
    finalizationRegistry = new FinalizationRegistry((...args) =>
      console.log('keck/react: FinalizationRegistry callback invoked', args),
    );
  }

  const mounted = useRef(true);
  const [, forceRerender] = useState({});
  const ref = useRef<TData>();
  if (!ref.current) {
    ref.current = observe(data, () => {
      if (!mounted.current) return;
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
    finalizationRegistry?.register(ref.current, 'Keck derived observable released');
  }

  return unwrap(deriveResultRef.current!);
}
