import { Observation } from "#keck/core/Observer";
import { RootNode } from "#keck/core/RootNode";

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

export function atomic<T>(fn: Function, args?: unknown[], thisArg?: unknown): T {
  let thisSetCallback = false;
  if (!atomicObservations) {
    atomicObservations = new Set();
    thisSetCallback = true;
  }
  try {
    return fn.apply(thisArg, args);
  } finally {
    if (thisSetCallback) {
      RootNode.triggerObservations(atomicObservations);
      atomicObservations = undefined;
    }
  }
}
