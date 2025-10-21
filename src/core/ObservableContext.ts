import { getObservableFactory } from 'keck/factories/observableFactories';

import type { Observer } from './Observer';
import type { Observable, Path, RootNode, Value } from './RootNode';

/**
 * The public interface to an ObservableContext that is made available to Observable factories.
 */
export interface FactoryObservableContext<TValue extends object> {
  value: TValue;

  observeIdentifier<TValue = unknown>(identifier: any, childValue: TValue): TValue;
  observeIdentifier(identifier: any): void;

  modifyIdentifier(identifier: any): void;
}

const contextForObservable = new WeakMap<Observable, ObservableContext<any>>();

/**
 * An ObservableContext is used to manage additional data associated with an observable proxy
 * wrapper. Because observable proxies
 * have to be behaviorally identical to the value they represent, additional data about them has
 * to be stored in this separate object.
 *
 * ObservableContexts are ephemeral objects that are created
 * internally when a property is accessed, and only exist within the scope of the proxy — they are
 * garbage collected with the proxy. They also only exist until a descendant property is modified,
 * which invalidates it and its associated proxy. This invalidation is what allows references
 * to compare as unequal when the underlying value changes.
 *
 * ObservableContext objects are not accessible externally. They only exist while their associated
 * Observable proxy is in scope somewhere (because their factory maintains a reference to it in the
 * proxy or subclass it produces). When the original value is garbage collected, so is the
 * ObservableContext.
 */
export class ObservableContext<TValue extends object> {
  public observable: Observable;

  static getForObservable<TValue extends object>(
    observable: Observable,
    throwIfMissing?: true,
  ): ObservableContext<TValue>;
  static getForObservable<TValue extends object>(
    observable: Observable,
    throwIfMissing: false,
  ): ObservableContext<TValue> | undefined;

  static getForObservable<TValue extends object>(
    observable: Observable,
    throwIfMissing = true,
  ): ObservableContext<TValue> | undefined {
    const ctx = contextForObservable.get(observable);
    if (!ctx && throwIfMissing) {
      throw new Error('Value is not observable');
    }
    return ctx;
  }

  constructor(
    public rootNode: RootNode,
    public observer: Observer,
    public value: TValue,
    public path: Path,
  ) {
    this.observable = getObservableFactory(value.constructor as any)?.makeObservable(this);
    if (!this.observable) throw new Error(`Keck: value ${value} is not observable`);
    contextForObservable.set(this.observable, this);
  }

  observeIdentifier(identifier: any, childValue?: unknown): unknown {
    return this.rootNode.observePath(
      this.observer,
      [...this.path, identifier],
      childValue as Value,
    );
  }

  /**
   * Call this method when the value of an identifier has changed. This will notify any observers
   * to trigger their callbacks, if necessary.
   *
   * @param identifier The identifier that has changed.
   */
  modifyIdentifier(identifier: any): void {
    this.rootNode.modifyPath([...this.path, identifier]);
  }
}
