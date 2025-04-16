import { ObservableContext } from 'keck/core/ObservableContext';
import type { Observable, Value } from 'keck/core/RootNode';
import { getObservableFactory } from 'keck/factories/observableFactories';

/**
 * Ensures that any changes to deep properties within the given value (which should be an observable type) will trigger
 * its observer's callback (in React, this ensures that the component is re-rendered on deep property changes).
 *
 * If `observable` is not an observable type (e.g. a primitive or null), it will be returned as-is. If `observer`
 * is an observable type, but is not an observable proxy, an error will be thrown.
 *
 * This only applies when the observable is focused (in unfocused mode, all changes trigger the callback). In React,
 * observers are always focused.
 *
 * e.g.
 * ```ts
 * const state = observe({ object1: { value1: 'value1' } }, callback);
 * deep(state.object1);
 * state.object1.value1 = 'new-value1';
 * // callback will be triggered
 * ```
 */
export function deep<T>(observable: T): T {
  const ctx = ObservableContext.getForObservable(observable as any as Observable, false);
  if (ctx) {
    return ctx.observer.rootNode.observePath(ctx.observer, ctx.path, ctx.value as Value, true) as T;
  }

  // It's okay if `observable` is not actually an observable type, just return it as-is
  const f =
    observable && typeof observable === 'object'
      ? getObservableFactory(observable.constructor as any)
      : null;
  if (!f) return observable;

  // However, if it's an observable type but not actually an observable proxy, throw an error
  throw new Error('Keck: deep: value is not observable');
}
