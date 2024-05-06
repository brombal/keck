import { objectFactory } from "#keck/factories/object";

import { type ObservableFactory, observableFactories } from "./observableFactories";

/**
 * Registers a class that can be observed. You can provide a custom factory that produces observable
 * instances of the class. If no factory is provided, the default object factory will be used.
 * @param constructor The class to register.
 * @param factory The factory to use to create observable instances of the class.
 */
export function registerClass(constructor: Function, factory?: ObservableFactory<any>) {
  observableFactories.set(constructor, factory || objectFactory);
}
