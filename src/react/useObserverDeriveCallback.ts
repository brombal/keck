import { derive, focus, reset } from 'keck';
import { useInsertionEffect } from 'react';
import { useObserverCallback } from './useObserverCallback';

export function useObserverDeriveCallback<TData extends object, TDerived>(
  data: TData,
  deriveFn: (data: TData) => TDerived,
  cb: (derived: TDerived) => void,
  deps?: unknown[],
): TData {
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
