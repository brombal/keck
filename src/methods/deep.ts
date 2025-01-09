import { ObservableContext } from 'keck/core/ObservableContext';
import type { Observable, Value } from 'keck/core/RootNode';

export function deep<T extends object>(observable: T): T {
  const ctx = ObservableContext.getForObservable(observable as Observable);
  return ctx.observer.rootNode.observePath(ctx.observer, ctx.path, ctx.value as Value, true) as T;
}
