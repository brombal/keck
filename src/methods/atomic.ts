import type { Observation } from 'keck/core/Observer';
import { triggerObservations } from 'keck/core/triggerObservations';

export let atomicObservations: Set<Observation> | undefined;

export function atomic<TReturn, TArgs extends unknown[]>(
  fn: (...args: TArgs) => TReturn,
  args?: TArgs,
  thisArg?: unknown,
): TReturn {
  const result = atomicAllowPromise(fn, args, thisArg);
  if (result instanceof Promise) {
    throw new Error(
      'atomic() does not support async functions. Only the synchronous portion before the first await would be batched; writes after each await would notify observers individually. Restructure the work so the awaits happen outside atomic(), then call atomic() on the synchronous portion that applies the results.',
    );
  }
  return result;
}

export function atomicAllowPromise<TReturn, TArgs extends unknown[]>(
  fn: (...args: TArgs) => TReturn,
  args?: TArgs,
  thisArg?: unknown,
): TReturn {
  let thisSetCallback = false;
  if (!atomicObservations) {
    atomicObservations = new Set();
    thisSetCallback = true;
  }
  try {
    return fn.apply(thisArg, (args ?? []) as TArgs);
  } finally {
    if (thisSetCallback) {
      triggerObservations(atomicObservations);
      atomicObservations = undefined;
    }
  }
}
