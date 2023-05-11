/**
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
  factory: ObservableFactory<object>;
  parent: DataNode | undefined;
  children: Map<Identifier, DataNode>;

  // Used to iterate over observers to trigger callbacks
  observersForChild: Map<Identifier, Set<Observer<object>>>;

  // Used to determine whether an ObservableContext is still valid
  allContexts: WeakSet<ObservableContext<object>>;
}

interface Observer<T extends object> {
  isObserving: boolean;
  callback: Callback<any> | undefined;
  disposers: Set<() => void>;

  // Used to look up existing ObservableContext for a given DataNode (necessary for maintaining ref equality of observables)
  contextForNode: WeakMap<DataNode, ObservableContext<object>>;
}

const rootIdentifier = Symbol("root");

type Identifier = unknown | typeof rootIdentifier;

/**
 * Allows looking up an Observable's ObservableContext, so that it can be unwrapped
 */
const contextForObservable = new WeakMap<Observable, ObservableContext<object>>();

export interface ObservableContext<TValue extends object> {
  dataNode: DataNode;
  observer: Observer<TValue>;
  observable: Observable;

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

type Observable = object;

type Callback<T> = (value: T, identifier: Identifier) => void;

/**
 * The map of object prototypes to their observable factories. Implement an `ObservableFactory` and add it to this map to add support
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
export interface ObservableFactory<TValue extends object, TIdentifier = unknown> {
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

const rootDataNodes = new WeakMap<object, DataNode>();

function getDataNode(
  identifier: Identifier,
  value: object,
  parent?: DataNode
): DataNode | undefined {
  let dataNode = parent ? parent.children.get(identifier) : rootDataNodes.get(value);
  if (dataNode) {
    dataNode.value = value;
    return dataNode;
  }

  const factory = observableFactories.get(value.constructor as any);
  if (!factory) return undefined;

  dataNode = {
    identifier,
    value,
    children: new Map(),
    parent,
    factory,
    observersForChild: new Map(),
    allContexts: new WeakSet(),
  };
  if (parent) parent.children.set(identifier, dataNode);
  else rootDataNodes.set(value, dataNode);
  return dataNode;
}

function getObservableContext(
  observer: Observer<object>,
  dataNode: DataNode
): ObservableContext<object> {
  let ctx = observer.contextForNode.get(dataNode);

  // Check that the context was not previously invalidated
  if (ctx && !dataNode.allContexts.has(ctx)) {
    ctx = undefined;
    observer.contextForNode.delete(dataNode);
  }
  if (ctx) return ctx;

  ctx = {
    dataNode: dataNode,
    observer: observer,
    observable: null!,
    get value() {
      return this.dataNode.value;
    },
    observeIdentifier(identifier, childValue, observeIntermediate = false) {
      // If the value is a function, bind it to its parent
      if (typeof childValue === "function") {
        return childValue.bind(this.observable);
      }

      function addObserver() {
        if (!observer.isObserving) return;
        let observers = dataNode.observersForChild.get(identifier);
        if (!observers) dataNode.observersForChild.set(identifier, (observers = new Set()));
        // const observerWeakRef = new WeakRef(observer);
        observers.add(observer);
        observer.disposers.add(() => observers!.delete(observer));
      }

      if (childValue) {
        // If the property is something we know how to observe, return the observable value
        const childNode = getDataNode(identifier, childValue, dataNode);
        if (childNode) {
          if (observeIntermediate) addObserver();
          return getObservableContext(observer, childNode).observable;
        }
      }

      // If it's a non-observable (i.e. a primitive or unknown object type), just observe and return
      addObserver();
      return childValue;
    },
    modifyIdentifier(childIdentifier) {
      if (dataNode.parent) {
        // Get the factory for the new value
        dataNode.factory = observableFactories.get(dataNode.value.constructor as any)!;
        // Clone the value
        dataNode.value = dataNode.factory.createClone(dataNode.value);
      }

      // Invalidate Observables for all ObservableContexts of the child Identifier
      if (dataNode.children.get(childIdentifier))
        dataNode.children.get(childIdentifier)!.allContexts = new Set();

      // Trigger all Observer callbacks for the child Identifier
      dataNode.observersForChild.get(childIdentifier)?.forEach((observer) => {
        observer.callback?.(dataNode.value, childIdentifier);
      });

      // Let the parent Observable update itself with the cloned child
      dataNode.parent?.factory.handleChange(
        dataNode.parent!.value,
        dataNode.identifier,
        dataNode.value
      );

      // Call modifyIdentifier on the parent/root ObservableContext
      if (childIdentifier !== rootIdentifier)
        getObservableContext(observer, dataNode.parent || dataNode)?.modifyIdentifier(
          dataNode.identifier
        );
    },
  };
  ctx.observable = dataNode.factory.makeObservable(ctx);
  observer.contextForNode.set(dataNode, ctx);
  contextForObservable.set(ctx.observable, ctx);
  dataNode.allContexts.add(ctx);
  return ctx;
}

type ObserveResponse<T> = [
  T,
  {
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
     * Disables the callback from being invoked on property writes.
     */
    disable(): void;

    /**
     * Enables the callback to be invoked on property writes.
     */
    enable(): void;

    /**
     * Removes all existing observations.
     */
    reset(): void;
  }
];

export function observe<TValue extends object>(
  value: TValue,
  cb: Callback<TValue>
): ObserveResponse<TValue>;
export function observe<TData extends object, TSelectorResult>(
  data: TData,
  selector: (data: TData) => TSelectorResult,
  action: (selectorResult: TSelectorResult, value: TData) => void
): [TData, () => void];

export function observe(...args: any) {
  if (args.length === 2) return createObserver(args[0], args[1]);
  else return createObserverSelector(args[0], args[1], args[2]);
}

export function createObserver<TData extends object>(
  data: TData,
  cb: Callback<TData>
): ObserveResponse<TData> {
  // Get an existing context, if possible. This happens when an observable from another tree is passed to observe().
  const ctx = contextForObservable.get(data);
  const rootNode = ctx?.dataNode || getDataNode(rootIdentifier, data);
  if (!rootNode) throw new Error(`Cannot observe value ${data}`);

  const observer: Observer<TData> = {
    isObserving: true,
    callback: cb,
    disposers: new Set(),
    contextForNode: new WeakMap(),
  };

  const store = getObservableContext(observer, rootNode).observable as TData;
  return [
    store,
    {
      start() {
        observer.isObserving = true;
      },
      stop() {
        observer.isObserving = false;
      },
      disable() {
        observer.callback = undefined;
      },
      enable() {
        observer.callback = cb;
      },
      reset() {
        observer.disposers.forEach((disposer) => disposer());
        observer.disposers.clear();
      },
    },
  ];
}

/**
 * Creates an observer and immediately observes the result of the selector function. The selector function is called
 * whenever the value of the observable changes, and the action callback is called whenever the result of the selector
 * function changes.
 *
 * The if the selector function returns a plain array (observables that represent arrays will work normally), it will be
 * shallow compared with the previous value to determine if the observer callback should be called.
 */
export function createObserverSelector<TData extends object, TSelectorResult>(
  data: TData,
  selector: (data: TData) => TSelectorResult,
  action: (selectorResult: TSelectorResult, value: TData) => void
): [TData, () => void] {
  const [state, actions] = observe(data, () => {
    const newSelectorResult = selector(state);
    let isEqual = false;

    let newResult: any;
    if (Array.isArray(newSelectorResult) && !contextForObservable.has(newSelectorResult)) {
      newResult = newSelectorResult.map((v) => unwrap(v, false));
      isEqual =
        prevResult.length === newResult.length &&
        newResult.every((v: any, i: number) => prevResult[i] === v);
    } else {
      newResult = unwrap(newSelectorResult, false);
      isEqual = newResult === prevResult;
    }

    if (!isEqual) action(newResult, data);
    prevResult = newResult;
  });
  const selectorResult = selector(state);
  let prevResult: any;

  // If the selector returns a new, non-observable array, unwrap each element to observe it individually.
  if (Array.isArray(selectorResult) && !contextForObservable.has(selectorResult)) {
    prevResult = selectorResult.map((v) => unwrap(v));
  } else {
    prevResult = unwrap(selectorResult);
  }

  return [
    state,
    () => {
      actions.stop();
      actions.disable();
      actions.reset();
    },
  ];
}

export function unwrap<T>(observable: T, observe = true): T {
  const ctx = contextForObservable.get(observable as Observable);
  if (!ctx) return observable;
  if (observe) {
    getObservableContext(ctx.observer, ctx.dataNode.parent || ctx.dataNode)?.observeIdentifier(
      ctx.dataNode.identifier,
      ctx.value,
      true
    );
  }
  return ctx.dataNode.value as T;
}
