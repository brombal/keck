import { ObservableContext } from 'keck/core/ObservableContext';
import type { Observable } from 'keck/core/RootNode';
import { fireGcCallbacks } from 'keck/util/garbageCollection';

/**
 * Releases the callback registered for the given observable proxy, stopping future invocations.
 * The proxy itself remains valid for reads and writes.
 *
 * Must be called to clean up any observer created with a callback (via `observe(value, cb)` or
 * `observe(value, { focusable, onChange })`) when it is no longer needed, since those observers
 * are held strongly by the library and will not be garbage collected on their own.
 */
export function unobserve(state: object): void {
  const ctx = ObservableContext.getForObservable(state as Observable, false);
  if (!ctx) return;
  const { observer } = ctx;
  observer.rootNode.callbackObservers.delete(observer);
  observer.reset();
  fireGcCallbacks('Keck observable released');
}
