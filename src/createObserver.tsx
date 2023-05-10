/**
 * DataNodes
 *
 * A given data object to be observed is represented in Keck by a tree of DataNode object. Each
 * DataNode represents a single object in the tree, and contains a reference to the object's value,
 * as well as a reference to the parent DataNode and a map of child DataNodes. The root DataNode
 * represents the root of the tree, and is shared by all Observers of the same object. All existing
 * root DataNodes are stored in a WeakMap, so that they can be garbage collected when their corresponding
 * data value is no longer referenced.
 *
 * DataNode children are created lazily when an Observer accesses a property of the object. Child
 * DataNodes are identified by any uniquely-identifying value. For example, if the object is a plain
 * object, the Identifier is the property name. If the object is an array, the Identifier is the
 * index of the array. If the object is a Map, the Identifier is the key of the Map. If the object
 * is a Set, the Identifier is the value itself.
 *
 * Observers
 *
 * Observers are the instances that are returned by `createObserver`. Each Observer represents a
 * a single callback to be triggered when its observed DataNodes are modified.
 *
 * A DataNode contains a Map of child Identifier keys, each with a Set of Observers that are
 * observing that child. When a child value
 * is modified, the Set is iterated over and each Observer's callback is triggered. Since child Identifiers
 * can be primitive values, and the Set needs to be iterated, they cannot be "weak" versions. Instead, the Observers are each stored in a WeakRef. When an Observer is garbage
 * collected, its WeakRef is removed from the Set the next time the Set is iterated (when the child is modified).
 *
 * ObservableFactory
 *
 * An ObservableFactory is an object with methods that Keck uses to create observable versions of data values.
 * The factory defines how to create an observable version of a given data value, and how to modify and clone it.
 * External libraries can provide support for custom data types by implementing their own ObservableFactory.
 *
 * ObservableContext
 *
 * An ObservableContext
 *
 *
 *
 *
 *
 *
 *
 */

/**
 * Represents a node in an observable tree. Nodes are shared by all Observers of the same object.
 */
interface DataNode {
  identifier: Identifier;
  value: object;
  factory: ObservableFactory;
  parent: DataNode | undefined;
  children: Map<Identifier, DataNode>;
  observersForChild: Map<Identifier, Set<WeakRef<Observer<unknown>>>>;
  contextForObserver: Map<Observer<unknown>, ObservableContext>;
}

/**
 * The root node of the observable tree.
 */
interface RootSharedRef extends DataNode {
  __root: true;
}

interface Observer<T> {
  [isObserving]: boolean;
  [callback]: Callback<any> | undefined;
  [disposers]: Set<() => void>;

  store: T;

  /**
   * Begins listening to property access. This is called automatically when the observer is created, but may be called
   * again to re-enable the observer after it has been disabled.
   */
  start(): void;

  /**
   * Stops listening to property access.
   */
  stop(): void;

  /**
   * Un-registers all observations.
   */
  reset(): void;

  disable(): void;

  enable(): void;
}

const rootIdentifier = Symbol("root");
type Identifier = unknown | typeof rootIdentifier;

export interface PublicObservableContext<TValue extends object = any> {
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

interface ObservableContext<TValue extends object = any> extends PublicObservableContext<TValue> {
  sharedRef: DataNode;
  observer: Observer<TValue>;
  readonly observable: Observable;
  invalidateObservable(): void;
}

export const getContext = Symbol("getContext");

export type Observable = {
  [getContext](): PublicObservableContext;
};

type Callback<T> = (value: T, identifier: Identifier) => void;

/**
 * The set of supported observable factories. Implement an `ObservableFactory` and add it to this map to add support
 * for custom classes.
 */
export const observableFactories = new Map<
  new (...args: any[]) => any,
  ObservableFactory<any, any>
>();

/**
 * This interface is used to create observable objects. To create an observable for a class, implement this interface
 * and add it to `observableFactories` using the class as the key.
 */
export interface ObservableFactory<TValue extends object = object, TIdentifier = unknown> {
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

const rootSharedRefs = new WeakMap<object, RootSharedRef>();

function getSharedRef(
  identifier: Exclude<Identifier, typeof rootIdentifier>,
  value: object,
  parent: DataNode
): DataNode | undefined;
function getSharedRef(identifier: typeof rootIdentifier, value: object): RootSharedRef | undefined;
function getSharedRef(
  identifier: Identifier,
  value: object,
  parent?: DataNode
): DataNode | undefined {
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
    observersForChild: new Map(),
    contextForObserver: new Map(),
  };
  if (parent) parent.children.set(identifier, sharedRef);
  else {
    (sharedRef as RootSharedRef).__root = true;
    rootSharedRefs.set(value, sharedRef as RootSharedRef);
  }
  return sharedRef;
}

function getObservableContext(observer: Observer<unknown>, sharedRef: DataNode): ObservableContext {
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
        if (!observer[isObserving]) return;
        let observers = sharedRef.observersForChild.get(identifier);
        if (!observers) sharedRef.observersForChild.set(identifier, (observers = new Set()));
        const observerWeakRef = new WeakRef(observer);
        observers.add(observerWeakRef);
        observer[disposers].add(() => observers!.delete(observerWeakRef));
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
      sharedRef.observersForChild.get(childIdentifier)?.forEach((observer) => {
        const ref = observer.deref();
        if (!ref) sharedRef.observersForChild.get(childIdentifier)!.delete(observer);
        else ref[callback]?.(sharedRef.value, childIdentifier);
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

const isObserving = Symbol("isObserving");
const callback = Symbol("callback");
const disposers = Symbol("disposers");

export function createObserver<T extends object>(data: T, cb: Callback<T>): Observer<T> {
  data = unwrap(data, false);
  const rootSharedRef = getSharedRef(rootIdentifier, data);
  if (!rootSharedRef) throw new Error(`Cannot observe value ${data}`);

  const observer: Observer<T> = {
    [isObserving]: true,
    [callback]: cb,
    [disposers]: new Set(),

    store: null!,
    start() {
      observer[isObserving] = true;
    },
    stop() {
      observer[isObserving] = false;
    },
    disable() {
      observer[callback] = undefined;
    },
    enable() {
      observer[callback] = cb;
    },
    reset() {
      observer[disposers].forEach((disposer) => disposer());
      observer[disposers].clear();
    },
  };
  observer.store = getObservableContext(observer, rootSharedRef).observable as T;
  return observer;
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
