import { ref } from 'keck';
import type { RefObject } from 'react';

/**
 * Creates a "ref" object compatible with React refs. You can use this within a Keck observable to store DOM elements.
 *
 * e.g.
 *
 * ```ts
 * const state = useObserver({
 *   myElementRef: reactRef<HTMLElement>(),
 * });
 *
 * <div ref={state.myElementRef}>
 * ```
 *
 * access it by using the ref's `.current` property:
 *
 * ```
 * const el = state.myElementRef.current;
 * ```
 */

export function reactRef<T>() {
  let current: T | null = null;
  return {
    get current() {
      return current;
    },
    set current(value: T | null) {
      current = ref(value);
    },
  } as RefObject<T>;
}
