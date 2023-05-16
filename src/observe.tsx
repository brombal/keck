/**
 * Represents a node in an observable tree. Nodes are shared by all Observers of the same object.
 */
interface DataNode {
  identifier: Identifier;
  value: object;
  factory: ObservableFactory<object>;
  parent: DataNode | undefined;
  children: Map<Identifier, DataNode>;

  /**
   * Used to iterate over observers to trigger callbacks.
   * Keys are child identifiers being observed.
   * Each value is a Map; keys are the observers and the value is a Set of Selectors.
   * An empty set indicates that the child is being observed without a selector function, and the
   * observer's callback should be called for any change.
   * A populated Set indicates that the child is being observed with selectors and the observer's
   * callback should only be called if at least one of the selectors returns a value different from
   * its previous invocation.
   */
  observersForChild: Map<Identifier, Map<Observer<object>, Set<Selector>>>;

  // Used to determine whether an ObservableContext is still valid
  validContexts: WeakSet<ObservableContext<object>>;
}

interface Observer<T extends object> {
  config: KeckConfiguration;
  callback: Callback | undefined;
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
  root: boolean;
  dataNode: DataNode;
  observer: Observer<TValue>;
  observable: Observable;

  readonly value: TValue;

  /**
   * Observe a child identifier. Call this to indicate that a user has accessed a property of the observed value. It
   * will only create an observation if the observer is currently configured to observe.
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

  modifyIdentifier(childIdentifier: Identifier, source?: [DataNode, Identifier]): void;
}

type Observable = object;

type Callback = (value: object, identifier: Identifier) => void;

/**
 * The map of object prototypes to their observable factories. Implement an `ObservableFactory` and
 * add it to this map to add support for custom classes.
 */
export const observableFactories = new Map<
  new (...args: any[]) => any,
  ObservableFactory<any, any>
>();

/**
 * This interface is used to create observable objects. To create an observable for a class,
 * implement this interface and add it to `observableFactories` using the class as the key.
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

const allDataNodes = new WeakMap<object, DataNode>();

function getDataNode(
  identifier: Identifier,
  value: object,
  parent?: DataNode
): DataNode | undefined {
  let dataNode = parent ? parent.children.get(identifier) : allDataNodes.get(value);
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
    validContexts: new WeakSet(),
  };
  if (parent) parent.children.set(identifier, dataNode);
  allDataNodes.set(value, dataNode);
  return dataNode;
}

function createObservation(identifier: Identifier, dataNode: DataNode, observer: Observer<object>) {
  let observations = dataNode.observersForChild.get(identifier);
  if (!observations) dataNode.observersForChild.set(identifier, (observations = new Map()));

  let selectors = observations.get(observer);
  // A non-selector observation is represented by an empty set
  const hasNonSelectorObservation = selectors && selectors.size === 0;
  if (!selectors) observations.set(observer, (selectors = new Set()));

  /**
   * Since non-selector observations override selector observations (i.e. they would always
   * cause the callback to be invoked), we don't need to track any additional selectors.
   * If attempting to add a selector observation, there must not be any existing non-selector
   * observations.
   */
  if (activeSelector) {
    if (!hasNonSelectorObservation) selectors.add(activeSelector);
  } else {
    selectors.clear();
  }

  observer.disposers.add(() => observations!.delete(observer));
}

function getObservableContext(
  observer: Observer<object>,
  dataNode: DataNode
): ObservableContext<object> {
  let ctx = observer.contextForNode.get(dataNode);

  // Check that the context is still valid
  if (ctx && !dataNode.validContexts.has(ctx)) {
    ctx = undefined;
    observer.contextForNode.delete(dataNode);
  }
  if (ctx) return ctx;

  ctx = {
    root: false,
    dataNode,
    observer,
    observable: null!,
    get value() {
      return this.dataNode.value;
    },
    observeIdentifier(identifier, childValue, observeIntermediate = false) {
      // If the value is a function, just bind it to its parent and return
      if (typeof childValue === "function") return childValue.bind(this.observable);

      // If the property is something we know how to observe, return the observable value
      const childNode = childValue && getDataNode(identifier, childValue, dataNode);
      if (childNode) {
        if (
          observer.config.observe &&
          (activeSelector || observer.config.intermediates || observeIntermediate)
        )
          createObservation(identifier, dataNode, observer);
        return getObservableContext(observer, childNode).observable;
      }

      // If it's a non-observable (i.e. a primitive or unknown object type), just observe and return
      if (observer.config.observe) createObservation(identifier, dataNode, observer);
      return childValue;
    },
    modifyIdentifier(childIdentifier: Identifier, source?: [DataNode, Identifier]) {
      // Clone the value if not the root
      if (observer.config.clone && dataNode.parent)
        dataNode.value = dataNode.factory.createClone(dataNode.value);

      // Invalidate Observables for all ObservableContexts of the child Identifier
      // The presence of `source` indicates that this is a recursive call, so we should not
      // invalidate unless we are cloning
      if ((observer.config.clone || !source) && dataNode.children.get(childIdentifier))
        dataNode.children.get(childIdentifier)!.validContexts = new Set();

      // Trigger all Observer callbacks for the child Identifier
      dataNode.observersForChild.get(childIdentifier)?.forEach((selectors, observer) => {
        let isAnyDifferent: boolean | undefined = undefined;
        if (selectors.size) {
          isAnyDifferent = false;
          for (const selector of selectors) {
            activeSelector = selector;
            const newValue = selector.selectorFn();
            isAnyDifferent =
              isAnyDifferent || !(selector.isEqual || Object.is)(newValue, selector.lastValue);
            selector.lastValue = newValue;
            activeSelector = undefined;
          }
        }
        if (observer.config.enabled && (isAnyDifferent === true || isAnyDifferent === undefined))
          observer.callback?.(source?.[0].value || dataNode.value, source?.[1] || childIdentifier);
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
          dataNode.identifier,
          source || [dataNode, childIdentifier]
        );
    },
  };
  ctx.observable = dataNode.factory.makeObservable(ctx);
  observer.contextForNode.set(dataNode, ctx);
  contextForObservable.set(ctx.observable, ctx);
  dataNode.validContexts.add(ctx);
  return ctx;
}

export function observe<TData extends object>(value: TData, cb: Callback): TData;

export function observe<TData extends object, TSelectorResult>(
  data: TData,
  selectorFn: (data: TData) => TSelectorResult,
  action: (selectedValue: TSelectorResult, value: TData, identifier: Identifier) => void,
  compare?: EqualityComparer<TSelectorResult>
): TData;

export function observe(...args: any) {
  if (args.length === 2) return createObserver(args[0], args[1]);
  else return createSelectorObserver(args[0], args[1], args[2]);
}

export function createObserver<TData extends object>(data: TData, cb: Callback): TData {
  // Get an existing DataNode, if possible. This happens when an observable from another tree is
  // passed to observe().
  const rootNode = contextForObservable.get(data)?.dataNode || getDataNode(rootIdentifier, data);
  if (!rootNode) throw new Error(`Cannot observe value ${data}`);

  const observer: Observer<TData> = {
    callback: cb,
    disposers: new Set(),
    contextForNode: new WeakMap(),
    config: defaultConfig(),
  };
  const ctx = getObservableContext(observer, rootNode);
  ctx.root = true;

  return ctx.observable as TData;
}

export function createSelectorObserver<TData extends object, TSelectedResult>(
  data: TData,
  selectorFn: (data: TData) => TSelectedResult,
  action: (selectedResult: TSelectedResult, value: object, identifier: Identifier) => void,
  compare: EqualityComparer<TSelectedResult> = Object.is
): TData {
  const state: TData = observe(data, (value, childIdentifier) =>
    action(selectorFn(state), value, childIdentifier)
  );
  select(() => selectorFn(state), compare);
  configure(state, { observe: false });
  return state;
}

type EqualityComparer<T> = (a: T, b: T) => boolean;

interface Selector {
  lastValue?: any;
  selectorFn: () => any;
  isEqual?: EqualityComparer<any>;
}

let activeSelector: Selector | undefined;

export function select<TSelectorResult>(
  selectorFn: () => TSelectorResult,
  isEqual?: EqualityComparer<TSelectorResult>
): TSelectorResult {
  if (activeSelector) throw new Error("Cannot nest select() calls");
  activeSelector = { selectorFn, isEqual };
  const value = (activeSelector.lastValue = selectorFn());
  activeSelector = undefined;
  return value;
}

interface KeckConfiguration {
  observe: boolean;
  clone: boolean;
  intermediates: boolean;
  enabled: boolean;
}

const defaultConfig = (): KeckConfiguration => ({
  observe: true,
  clone: false,
  intermediates: false,
  enabled: true,
});

export function configure(observable: object, options: Partial<KeckConfiguration>) {
  const ctx = contextForObservable.get(observable);
  if (!ctx?.root) throw new Error(`Cannot configure non-observable ${observable}`);
  Object.assign(ctx.observer.config, options);
}

export function reset(observable: object) {
  const ctx = contextForObservable.get(observable);
  if (!ctx?.root) throw new Error(`Cannot reset non-observable ${observable}`);
  Object.assign(ctx.observer.config, defaultConfig());
  ctx.observer.disposers.forEach((disposer) => disposer());
  ctx.observer.disposers.clear();
}

/**
 * "Unwraps" a value to give you the original object instead of the observable proxy or subclass. If `observable` is
 * not actually an observable, it will simply be returned as-is.
 */
export function unwrap<T>(observable: T, observe = true): T {
  const ctx = contextForObservable.get(observable as Observable);
  if (!ctx) return observable;
  // Unwrapping can only create a observation in select mode
  if (observe && ctx.observer.config.observe) {
    getObservableContext(ctx.observer, ctx.dataNode.parent || ctx.dataNode)?.observeIdentifier(
      ctx.dataNode.identifier,
      ctx.value,
      true
    );
  }
  return ctx.dataNode.value as T;
}
