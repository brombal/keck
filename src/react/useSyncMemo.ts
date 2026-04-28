import { useRef } from 'react';

export function useSyncMemo<T>(factory: (previous: T | undefined) => T, deps: unknown[]): T {
  const ref = useRef<T>(undefined);
  const depsRef = useRef<unknown[]>(undefined);

  const hasChanged =
    !depsRef.current ||
    deps.length !== depsRef.current.length ||
    deps.some((dep, i) => !Object.is(dep, depsRef.current![i]));

  if (hasChanged) {
    ref.current = factory(ref.current);
    depsRef.current = deps;
  }

  return ref.current as T;
}
