import { type Observable, type ObservableContext } from "./createObserver";

/**
 * This interface is used to create observable objects. To create an observable for a class,
 * implement this interface and add it to `observableFactories` using the class as the key.
 */
export interface ObservableFactory<TValue extends object, TIdentifier = unknown> {
  /**
   * Return an Observable object that stands in place of the original value.
   */
  makeObservable: (context: ObservableContext<TValue>) => Observable;

  /**
   * Update the `value` object with the change specified by `identifier` and `newValue`.
   * An example of a change for a plain object would be `value[identifier] = newValue`.
   */
  handleChange(value: TValue, identifier: TIdentifier, newValue: unknown): void;

  /**
   * Return a shallow clone of `value`.
   */
  createClone(value: TValue): object;
}

/**
 * The map of object prototypes to their observable factories. Implement an `ObservableFactory` and
 * add it to this map to add support for custom classes.
 */
export const observableFactories = new Map<
  new (...args: any[]) => any,
  ObservableFactory<any, any>
>();
