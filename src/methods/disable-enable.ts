import { ObservableContext } from 'keck/core/ObservableContext';
import type { Observable } from 'keck/core/RootNode';

/**
 * Disables an observer, preventing it from triggering its callback when its
 * observed properties are modified.
 * @param observable The observable to disable.
 */
export function disable(observable: object) {
  ObservableContext.getForObservable(observable as Observable).observer.disable();
}

/**
 * Enables an observer, allowing it to trigger its callback when its observed
 * properties are modified.
 * @param observable The observable to enable.
 */
export function enable(observable: object) {
  ObservableContext.getForObservable(observable as Observable).observer.enable();
}
