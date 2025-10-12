import { ObservableContext } from 'keck/core/ObservableContext';
import type { Observable } from 'keck/core/RootNode';

/**
 * Returns the original object of an observable wrapper. If `observable` is
 * not actually an observable, the value will be returned as-is.
 */
export function unwrap<T>(observable: T): T {
  const ctx = ObservableContext.getForObservable(observable as Observable, false);
  if (ctx) {
    return ctx.value as T;
  }
  return observable;
}
