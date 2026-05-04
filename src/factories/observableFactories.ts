import type { FactoryObservableContext } from 'keck/core/ObservableContext';
import type { AnyConstructor } from 'keck/util/types';

// Use a globalThis-keyed singleton so all installed copies of keck share the same
// registry. This lets libraries like keck-forms call registerObservableClass against
// their bundled keck copy and have it visible to the user's keck copy.
const REGISTRY_KEY = Symbol.for('keck:observableFactories');
if (!(globalThis as any)[REGISTRY_KEY]) {
  (globalThis as any)[REGISTRY_KEY] = new Map<AnyConstructor, ObservableFactory<any>>();
}

/**
 * The map of object prototypes to their observable factories.
 */
export const observableFactories: Map<AnyConstructor, ObservableFactory<any>> = (globalThis as any)[
  REGISTRY_KEY
];

/**
 * This interface is used to create observable objects. To create an observable for a class,
 * implement this interface and add it to `observableFactories` using the class as the key.
 */
export interface ObservableFactory<TValue extends object> {
  /**
   * Must return an observable wrapper around the given value.
   */
  makeObservable: (observableNode: FactoryObservableContext<TValue>) => TValue;
}

export function getObservableFactory(
  classConstructor: AnyConstructor,
): ObservableFactory<any> | undefined {
  return observableFactories.get(classConstructor);
}
