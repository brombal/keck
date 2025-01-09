import type { Observation } from 'keck/core/Observer';
import { triggerObservations } from 'keck/core/triggerObservations';

export let atomicObservations: Set<Observation> | undefined;

export function atomic<T>(
  fn: (...args: unknown[]) => unknown,
  args?: unknown[],
  thisArg?: unknown,
): T;

export function atomic<T, TArgs extends unknown[]>(
  fn: (...args: TArgs) => T,
  args: TArgs,
  thisArg?: unknown,
): T;

export function atomic<TReturn, TArgs extends any[]>(
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
    return fn.apply(thisArg, args as TArgs);
  } finally {
    if (thisSetCallback) {
      triggerObservations(atomicObservations);
      atomicObservations = undefined;
    }
  }
}
