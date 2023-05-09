import { Root } from "react-dom/client";

interface SharedRef {
  identifier: Identifier;
  value: object;
  factory: ObservableFactory;
  parent: SharedRef | undefined;
  children: Map<Identifier, SharedRef>;
  observersForId: Map<Identifier, Set<Observer>>;
  contextForObserver: Map<Observer, ObservableContext>;
}

interface RootSharedRef extends SharedRef {
  __root: true;
}

interface Observer {
  isObserving: boolean;
  callback: Callback | undefined;
  disposers: Set<() => void>;
}

const rootIdentifier = Symbol("root");
type Identifier = unknown | typeof rootIdentifier;

export interface PublicObservableContext<TValue = any, TMeta = any> {
  readonly value: TValue;

  /**
   * Observe a child identifier. Call this to indicate that a user has accessed a property of the observed value. It
   * will only be observed if the observer is currently enabled.
   *
   * `childValue` is mapped to its observable version and returned. It is only necessary to pass it if its type is
   * unknown and could be an observable value; if you know it's a primitive or otherwise un-observable value, you may
   * omit it or pass `undefined`.
   *
   * `observeIntermediate` is primarily for internal usage. You may pass `true` if you always want to observe the
   * identifier, regardless of whether it is an intermediate value. Primitives will always be observed, regardless of this value.
   */
  observeIdentifier<T = unknown>(
    identifier: Identifier,
    childValue?: T,
    observeIntermediate?: boolean
  ): T;
  modifyIdentifier(childIdentifier: Identifier): void;
}

interface ObservableContext<TValue = any, TMeta = any>
  extends PublicObservableContext<TValue, TMeta> {
  sharedRef: SharedRef;
  observer: Observer;
  readonly observable: Observable;
  invalidateObservable(): void;
}

export type Observable = {
  [getContext](): PublicObservableContext;
};

type Callback = (value: any, identifier: any) => void;

/**
 * The set of supported observable factories. Implement an `ObservableFactory` and add it to this map to add support
 * for custom classes.
 */
export const observableFactories = new Map<
  new (...args: any[]) => any,
  ObservableFactory<any, any>
>();

export const getContext = Symbol("getContext");

/**
 * This interface is used to create observable objects. To create an observable for a class, implement this interface
 * and add it to `observableFactories` using the class as the key.
 */
export interface ObservableFactory<TValue = unknown, TIdentifier = unknown> {
  /**
   * Returns an object that stands in place of the original value, and can be observed.
   */
  makeObservable: (context: ObservableContext<TValue>) => Observable;

  /**
   * Applies a change to `value` for the given `identifier`.
   * An example of a change for a plain object would be `value[identifier] = newValue`.
   */
  handleChange(value: TValue, identifier: TIdentifier, newValue: unknown): void;

  /**
   * Returns a clone of `value`.
   */
  createClone(value: TValue): object;
}

const rootSharedRefs = new Map<unknown, RootSharedRef>();

function getSharedRef(
  identifier: Exclude<Identifier, typeof rootIdentifier>,
  value: object,
  parent: SharedRef
): SharedRef | undefined;
function getSharedRef(identifier: typeof rootIdentifier, value: object): RootSharedRef | undefined;
function getSharedRef(
  identifier: Identifier,
  value: object,
  parent?: SharedRef
): SharedRef | undefined {
  let sharedRef = parent ? parent.children.get(identifier) : rootSharedRefs.get(value);
  if (sharedRef) {
    sharedRef.value = value;
    return sharedRef;
  }

  const factory = observableFactories.get(value.constructor as any);
  if (!factory) return undefined;

  sharedRef = {
    identifier,
    value,
    children: new Map(),
    parent,
    factory,
    observersForId: new Map(),
    contextForObserver: new Map(),
  };
  if (parent) parent.children.set(identifier, sharedRef);
  else {
    (sharedRef as RootSharedRef).__root = true;
    rootSharedRefs.set(value, sharedRef as RootSharedRef);
  }
  return sharedRef;
}

function getObservableContext(observer: Observer, sharedRef: SharedRef): ObservableContext {
  let ctx = sharedRef.contextForObserver.get(observer);
  if (ctx) return ctx;

  let observable: Observable | undefined;
  ctx = {
    sharedRef,
    observer,
    get value() {
      return this.sharedRef.value;
    },
    get observable() {
      return observable || (observable = this.sharedRef.factory.makeObservable(this));
    },
    invalidateObservable() {
      observable = undefined;
    },
    observeIdentifier(identifier, childValue, observeIntermediate = false) {
      // If the value is a function, bind it to its parent
      if (typeof childValue === "function") {
        return childValue.bind(this.observable);
      }

      function addObserver() {
        if (!observer.isObserving) return;
        let observers = sharedRef.observersForId.get(identifier);
        if (!observers) sharedRef.observersForId.set(identifier, (observers = new Set()));
        observers.add(observer);
        observer.disposers.add(() => observers!.delete(observer));
      }

      if (childValue) {
        // If the property is something we know how to observe, return the observable value
        const childSharedRef = getSharedRef(identifier, childValue, sharedRef); // TODO: sharedRef.getChildSharedRef(identifier, childValue); ?
        if (childSharedRef) {
          if (observeIntermediate) addObserver();
          return getObservableContext(observer, childSharedRef).observable;
        }
      }

      // If it's a non-observable (i.e. a primitive or unknown object type), just observe and return
      addObserver();
      return childValue;
    },
    modifyIdentifier(childIdentifier) {
      if (sharedRef.parent) {
        // Get the factory for the new value
        sharedRef.factory = observableFactories.get(sharedRef.value.constructor as any)!;
        // Clone the value
        sharedRef.value = sharedRef.factory.createClone(sharedRef.value);
      }

      // Invalidate Observables for all ObservableContexts of the child Identifier
      sharedRef.children
        .get(childIdentifier)
        ?.contextForObserver.forEach((ctx) => ctx.invalidateObservable());

      // Trigger all Observer callbacks for the child Identifier
      sharedRef.observersForId.get(childIdentifier)?.forEach((observer) => {
        observer.callback?.(sharedRef.value, childIdentifier);
      });

      // Let the parent Observable update itself with the cloned child
      sharedRef.parent?.factory.handleChange(
        sharedRef.parent!.value,
        sharedRef.identifier,
        sharedRef.value
      );

      // Call modifyIdentifier on the parent/root ObservableContext
      if (sharedRef.parent)
        sharedRef.parent?.contextForObserver.get(observer)!.modifyIdentifier(sharedRef.identifier);
      else if (childIdentifier !== rootIdentifier)
        sharedRef.contextForObserver.get(observer)!.modifyIdentifier(rootIdentifier);
    },
  } as ObservableContext;
  sharedRef.contextForObserver.set(observer, ctx);
  return ctx;
}

export function createObserver<T extends object>(data: T, callback: Callback) {
  data = unwrap(data, false);
  const rootSharedRef = getSharedRef(rootIdentifier, data);
  if (!rootSharedRef) throw new Error(`Cannot observe value ${data}`);

  const observer: Observer = {
    isObserving: true,
    callback,
    disposers: new Set(),
  };

  return {
    store: getObservableContext(observer, rootSharedRef).observable as T,
    observe() {
      observer.isObserving = true;
    },
    unobserve() {
      observer.isObserving = false;
    },
    reset() {
      observer.disposers.forEach((disposer) => disposer());
      observer.disposers.clear();
    },
    disable() {
      observer.isObserving = false;
      observer.callback = undefined;
    },
    enable() {
      observer.callback = callback;
    },
  };
}

export function unwrap<T>(observable: T, observe = true): T {
  const ctx = (observable as Observable)?.[getContext]?.() as ObservableContext;
  if (!ctx) return observable;
  if (observe) {
    if (ctx.sharedRef.parent) {
      ctx.sharedRef.parent.contextForObserver
        .get(ctx.observer)
        ?.observeIdentifier(ctx.sharedRef.identifier, ctx.sharedRef.value, true);
    } else {
      ctx.sharedRef.contextForObserver
        .get(ctx.observer)
        ?.observeIdentifier(rootIdentifier, observable);
    }
  }
  return ctx.sharedRef.value as T;
}

/**
 * When an identifier is modified, I need to get all the observers that are observing that identifier, and trigger each callback.
 * I don't want to iterate every existing observer.
 * 1. Get the context's shared ref
 * 2. Use the identifier being modified to get its Set of observers
 * 3. Call each observer's callback
 *
 * When an observation is created:
 * 1. Get the context's shared ref
 * 2. Use the identifier being observed to get its Set of observers
 * 3. Add the observer to the Set
 * 4. Add a cleanup function to the observer that will remove it from the Set on reset
 *
 * When an observer is reset, I need to clear out all of the observers that are observing that identifier for each shared ref.
 * 1. Get the observer
 * 2. Run all the cleanup functions
 *
 * An observable instance needs to compare equal to itself when its underlying value hasn't changed (for things like React's useEffect dependencies)
 *
 */
