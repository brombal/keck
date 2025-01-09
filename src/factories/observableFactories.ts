import type { FactoryObservableContext } from 'keck/core/ObservableContext';
import type { AnyConstructor } from 'keck/util/types';

/**
 * The map of object prototypes to their observable factories.
 */
export const observableFactories = new Map<AnyConstructor, ObservableFactory<any>>();

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
