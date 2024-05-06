import { type FactoryObservableContext } from "#keck/core/ObservableContext";

/**
 * The map of object prototypes to their observable factories.
 */
export const observableFactories = new Map<Function, ObservableFactory<any>>();

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

export function getObservableFactory(constructor: Function) {
  return observableFactories.get(constructor);
}
