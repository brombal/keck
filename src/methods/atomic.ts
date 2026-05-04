import type { Observation, ObserverCallbackContext } from 'keck/core/Observer';
import { triggerObservations } from 'keck/core/triggerObservations';

export let atomicObservations: Set<Observation> | undefined;

// Source name for the current atomic batch. Set by the first write in the batch;
// reset to undefined if writes from different-named sources occur in the same batch.
let atomicSourceName: string | undefined;
let atomicSourceNameSet = false;

// Action name for the current atomic batch. Set by the named atomic() overload.
let atomicActionName: string | undefined;

// Called by RootNode.modifyPath when a write occurs inside an atomic batch.
export function recordAtomicSource(name: string | undefined) {
  if (!atomicSourceNameSet) {
    atomicSourceName = name;
    atomicSourceNameSet = true;
  } else if (atomicSourceName !== name) {
    atomicSourceName = undefined; // multiple different sources — ambiguous
  }
}

export function atomic<TReturn, TArgs extends unknown[]>(
  name: string,
  fn: (...args: TArgs) => TReturn,
  args?: TArgs,
  thisArg?: unknown,
): TReturn;

export function atomic<TReturn, TArgs extends unknown[]>(
  fn: (...args: TArgs) => TReturn,
  args?: TArgs,
  thisArg?: unknown,
): TReturn;

export function atomic<TReturn, TArgs extends unknown[]>(
  nameOrFn: string | ((...args: TArgs) => TReturn),
  fnOrArgs?: ((...args: TArgs) => TReturn) | TArgs,
  argsOrThis?: TArgs | unknown,
  thisArg?: unknown,
): TReturn {
  let name: string | undefined;
  let fn: (...args: TArgs) => TReturn;
  let args: TArgs | undefined;
  let _thisArg: unknown;

  if (typeof nameOrFn === 'string') {
    name = nameOrFn;
    fn = fnOrArgs as (...args: TArgs) => TReturn;
    args = argsOrThis as TArgs | undefined;
    _thisArg = thisArg;
  } else {
    fn = nameOrFn;
    args = fnOrArgs as TArgs | undefined;
    _thisArg = argsOrThis;
  }

  const result = atomicAllowPromise(fn, args, _thisArg, name);
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
  name?: string,
): TReturn {
  let thisSetCallback = false;
  if (!atomicObservations) {
    atomicObservations = new Set();
    atomicSourceName = undefined;
    atomicSourceNameSet = false;
    atomicActionName = name;
    thisSetCallback = true;
  }
  try {
    return fn.apply(thisArg, (args ?? []) as TArgs);
  } finally {
    if (thisSetCallback) {
      const ctx: ObserverCallbackContext = { sourceName: atomicSourceName };
      if (atomicActionName !== undefined) ctx.actionName = atomicActionName;
      atomicSourceName = undefined;
      atomicSourceNameSet = false;
      atomicActionName = undefined;
      triggerObservations(atomicObservations, ctx);
      atomicObservations = undefined;
    }
  }
}
