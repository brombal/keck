import { type MutableRefObject, useRef } from 'react';

export function useRefWithDeps<T>(
  factory: (previous: T | undefined) => T,
  deps: unknown[],
): MutableRefObject<T> {
  const ref = useRef<T>();
  const depsRef = useRef<unknown[]>();

  const hasChanged =
    !depsRef.current ||
    deps.length !== depsRef.current.length ||
    deps.some((dep, i) => !Object.is(dep, depsRef.current![i]));

  if (hasChanged) {
    ref.current = factory(ref.current);
    depsRef.current = deps;
  }

  return ref as MutableRefObject<T>;
}
