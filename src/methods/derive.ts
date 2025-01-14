import { unwrap } from 'keck/methods/unwrap';
import { PathMap } from 'keck/util/PathMap';

export type DeriveFn<T> = () => T;
export type DeriveEqualFn<T> = (prevResult: T, nextResult: T) => boolean;
export type DeriveContext<T> = { fn: DeriveFn<T>; isEqual?: DeriveEqualFn<T>; prevResult: any };

export let activeDeriveCtx: DeriveContext<any> | undefined;

const deriveCtxs = new PathMap<DeriveContext<any>>({ weak: true });

export function derive<T>(fn: DeriveFn<T>, isEqual?: DeriveEqualFn<T>) {
  let thisSetCallback = false;
  if (!activeDeriveCtx) {
    activeDeriveCtx = deriveCtxs.get([fn, isEqual]);
    if (!activeDeriveCtx) {
      activeDeriveCtx = { fn, isEqual, prevResult: undefined };
      deriveCtxs.set([fn, isEqual], activeDeriveCtx);
    }
    thisSetCallback = true;
  }
  try {
    return (activeDeriveCtx.prevResult = unwrap(fn()));
  } finally {
    if (thisSetCallback) {
      activeDeriveCtx = undefined;
    }
  }
}

/**
 * Invokes the derive function of the given context, while setting it as the activeDeriveCtx.
 * This allows any observations made during the derive function to continue being derived observations.
 */
export function invokeDeriveCtx(ctx: DeriveContext<any>) {
  let thisSetCallback = false;
  if (!activeDeriveCtx) {
    activeDeriveCtx = ctx;
    thisSetCallback = true;
  }
  try {
    return (activeDeriveCtx.prevResult = activeDeriveCtx.fn());
  } finally {
    if (thisSetCallback) {
      activeDeriveCtx = undefined;
    }
  }
}
