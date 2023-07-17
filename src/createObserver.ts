import { isRef } from "./ref";
import { observableFactories } from "./observableFactories";

// let debugCounter = 0;

/**
 * Used to look up the SharedNode for a value that is not part of any observable tree.
 */
const rootDataNodes = new WeakMap<object, SharedNode>();

const rootIdentifier = Symbol("root");

type Identifier = unknown | typeof rootIdentifier;

/**
 * Used to look up an ObserverNode for an Observable, to unwrap an Observable.
 */
const contextForObservable = new WeakMap<Observable, ObservableContext>();

/**
 * An Observable is an object that stands in place of another value and can be observed for changes.
 * It is a Proxy or other custom object that wraps the original object and forwards all operations to it,
 * and is produced by an ObservableFactory registered with `observableFactories`.
 * Internally, we don't know the type, but it must always be an object. To the user, the type is always the same
 * as the object that it represents.
 */
export type Observable = object;

type Callback = (value: object, identifier: Identifier) => void;

/**
 * Represents a node in an observable tree. Nodes are shared by all Observers of the same object.
 * Although a SharedNode is associated with a user object, it would be more accurate to say that
 * a SharedNode represents whatever is associated with a particular child identifier on an object
 * (i.e. when `a.b = someNewValue` happens, the same SharedNode now represents `someNewValue`).
 */
class SharedNode {
  // debug = debugCounter++;

  public children = new Map<Identifier, SharedNode>();

  /**
   * Used to iterate over observers to trigger callbacks.
   * Keys are child identifiers being observed.
   * Each value is a Map; keys are the observers and the value is a Set of Derivatives.
   * An empty set indicates that the child is being observed without a derive function, and the
   * observer's callback should be called for any change.
   * A populated Set indicates that the child is being observed with derivatives, and the observer's
   * callback should only be called if at least one of the derivatives returns a value different from
   * its previous invocation.
   */
  public readonly observersForChild = new Map<Identifier, Map<Observer, Set<Derivative>>>();

  /**
   * Used to determine whether an ObserverNode for this SharedNode is still valid.
   */
  public validContexts = new WeakSet<ObservableContext>();

  constructor(
    public parent: SharedNode | undefined,
    public identifier: Identifier,
    public value: object
  ) {
    if (!observableFactories.has(value.constructor as any))
      throw new Error(`Value "${value}" is not observable`);

    if (!parent) rootDataNodes.set(value, this);
    else parent.children.set(identifier, this);
  }

  public factory() {
    return observableFactories.get(this.value.constructor as any)!;
  }
}

/**
 * An Observer represents a callback that is called when a change occurs to the selected properties of its value.
 */
class Observer {
  // debug = debugCounter++;

  public readonly disposers = new Set<() => void>();
  public config = defaultConfig();

  public rootContext: ObservableContext;

  contexts = new WeakMap<SharedNode, ObservableContext>();

  constructor(
    value: object,
    public callback: Callback | undefined,
    sharedNode: SharedNode | undefined
  ) {
    this.rootContext = new ObservableContext(this, value, undefined, rootIdentifier, sharedNode);
    this.contexts.set(this.rootContext.sharedNode, this.rootContext);
  }

  reset() {
    this.config = defaultConfig();
    this.disposers.forEach((disposer) => disposer());
    this.disposers.clear();
  }
}

/**
 * An ObserverNode is a wrapper object that contains an observable and additional information about it.
 * Since an Observable is just a proxy for a user value, and has an unknown opaque type, additional data about it
 * is stored in this wrapper object. Every Observer has an ObserverNode object for each SharedNode that it
 * observes.
 */
export class ObservableContext<T extends object = object> {
  // debug = debugCounter++;

  public observable: Observable;

  public sharedNode: SharedNode;

  constructor(
    public observer: Observer,
    value: T,
    parent: ObservableContext | undefined,
    identifier: Identifier,
    sharedNode: SharedNode | undefined
  ) {
    this.sharedNode =
      sharedNode ||
      parent?.sharedNode.children.get(identifier) ||
      rootDataNodes.get(value) ||
      new SharedNode(parent?.sharedNode, identifier, value);

    this.observable = this.sharedNode.factory().makeObservable(this);
    contextForObservable.set(this.observable, this);
    this.sharedNode.validContexts.add(this);
  }

  get value(): T {
    return this.sharedNode.value as T;
  }

  createObservation(identifier: Identifier) {
    const sharedNode = this.sharedNode;
    const observer = this.observer;

    let observations = sharedNode.observersForChild.get(identifier);
    if (!observations) sharedNode.observersForChild.set(identifier, (observations = new Map()));

    let derivatives = observations.get(observer);
    // An unconditional observation (an observation with no derivatives) is represented by an empty set
    const hasUnconditionalObservation = derivatives?.size === 0;
    if (!derivatives) observations.set(observer, (derivatives = new Set()));

    /**
     * Since non-derived observations override derived observations (i.e. they always
     * cause the callback to be invoked), we don't need to track any derivatives if there is already
     * a non-derived observation.
     */
    if (activeDerivative) {
      if (!hasUnconditionalObservation) derivatives.add(activeDerivative);
    } else {
      /**
       * If this observation is unconditional (i.e. no derivative), clear any existing derivatives,
       * because they are no longer needed.
       */
      derivatives.clear();
    }

    observer.disposers.add(() => observations!.delete(observer));
  }

  /**
   * Called by observable proxies to observe a child identifier.
   * Call this to indicate that a user has accessed a property of the observed value.
   * It will only create an observation if the observer is currently selecting properties to observe.
   *
   * `childValue` is used to return the child value's Observable proxy. It is only necessary to pass it if its type is
   * unknown and could be an observable value; if you know it's a primitive or otherwise un-observable value, you may
   * omit it or pass `undefined`.
   *
   * `observeIntermediate` is primarily for internal usage. You may pass `true` if you always want to observe the
   * identifier, regardless of whether it is an intermediate value. Primitives will always be observed, regardless of this value.
   */
  observeIdentifier(identifier: Identifier): undefined;
  observeIdentifier<T = unknown>(
    identifier: Identifier,
    childValue: T,
    observeIntermediate?: boolean
  ): T;

  observeIdentifier<T = unknown>(
    identifier: Identifier,
    childValue?: T,
    observeIntermediate?: boolean
  ): T | undefined {
    // If the value is a function, just bind it to its parent and return
    if (typeof childValue === "function") return childValue.bind(this.observable);

    const observer = this.observer;

    // If the value is something we know how to observe, return the observable for it
    if (
      childValue &&
      !isRef(childValue) &&
      observableFactories.has(childValue.constructor as any)
    ) {
      let childCtx =
        identifier === rootIdentifier
          ? this
          : this.observer.contexts.get(this.sharedNode.children.get(identifier)!); // this.children.get(identifier);
      // Check that the childCtx is present in validContexts
      if (childCtx && !childCtx.sharedNode.validContexts.has(childCtx)) childCtx = undefined;
      if (!childCtx) {
        childCtx = new ObservableContext(this.observer, childValue, this, identifier, undefined);
        this.observer.contexts.set(childCtx.sharedNode, childCtx);
      }

      if (
        observer.config.select &&
        (activeDerivative || observer.config.intermediates || observeIntermediate)
      )
        this.createObservation(identifier);

      return childCtx.observable as T;
    }

    // If it's a non-observable (i.e. a primitive or unknown object type), just observe and return
    if (observer.config.select) this.createObservation(identifier);
    return childValue;
  }

  modifyIdentifier(
    childIdentifier: Identifier,
    value?: unknown,
    source?: [SharedNode, Identifier]
  ) {
    const observer = this.observer;
    const sharedNode = this.sharedNode;

    // Invalidate any existing contexts for this identifier
    const childDataNode = sharedNode.children.get(childIdentifier);
    if (childDataNode) {
      if (!value || typeof value !== "object") {
        // A SharedNode exists for childIdentifier, but the value is being deleted or replaced with a primitive;
        // remove the child SharedNode from the tree.
        childDataNode.parent?.children.delete(childIdentifier);
      } else if (childDataNode.value !== value) {
        // A SharedNode exists for childIdentifier, but the value is being replaced with a new object;
        // update the child SharedNode's value and invalidate all contexts for it.
        childDataNode.value = value;
        childDataNode.validContexts = new WeakSet();
        childDataNode.children.clear();
      }
    }

    // Clone the value if enabled and not the root
    if (observer.config.clone && sharedNode.parent) {
      sharedNode.value = sharedNode.factory().createClone(sharedNode.value);
      sharedNode.validContexts = new WeakSet();
    }

    // Trigger all Observer callbacks for the child Identifier
    sharedNode.observersForChild.get(childIdentifier)?.forEach((derivatives, observer) => {
      let isAnyDifferent = true;
      if (derivatives.size) {
        isAnyDifferent = false;
        for (const derivative of derivatives) {
          activeDerivative = derivative;
          const newValue = derivative.deriveFn();
          isAnyDifferent =
            isAnyDifferent || !(derivative.isEqual || Object.is)(newValue, derivative.lastValue);
          derivative.lastValue = newValue;
          activeDerivative = undefined;
        }
      }
      if (observer.config.enabled && isAnyDifferent)
        observer.callback?.(source?.[0].value || sharedNode.value, source?.[1] || childIdentifier);
    });

    // Update the parent Observable with the cloned child
    sharedNode.parent
      ?.factory()
      .handleChange(sharedNode.parent.value, sharedNode.identifier, sharedNode.value);

    // Call modifyIdentifier on the parent/root ObserverNode
    if (this.parent)
      this.parent.modifyIdentifier(
        sharedNode.identifier,
        sharedNode.value,
        source || [sharedNode, childIdentifier]
      );
    else if (childIdentifier !== rootIdentifier)
      this.modifyIdentifier(
        rootIdentifier,
        sharedNode.value,
        source || [sharedNode, childIdentifier]
      );
  }

  get parent() {
    return this.observer.contexts.get(this.sharedNode.parent!);
  }
}

export function createObserver<TData extends object>(value: TData, cb: Callback): TData;

export function createObserver<TData extends object, TDerivedResult>(
  data: TData,
  deriveFn: (data: TData) => TDerivedResult,
  action: (derivedValue: TDerivedResult, value: TData, identifier: Identifier) => void,
  compare?: EqualityComparer<TDerivedResult>
): TData;

export function createObserver(...args: any) {
  if (args.length === 2) return createSimpleObserver(args[0], args[1]);
  else return createdDerivedObserver(args[0], args[1], args[2]);
}

function createSimpleObserver<TData extends object>(data: TData, cb: Callback): TData {
  // Get an existing context and SharedNode, if possible. This happens when an observable from another tree is
  // passed to observe(). Otherwise, it will create a new root SharedNode.
  const ctx = contextForObservable.get(data);
  const observer = new Observer(unwrap(data), cb, ctx?.sharedNode);
  return observer.rootContext.observable as TData;
}

function createdDerivedObserver<TData extends object, TDerivedResult>(
  data: TData,
  deriveFn: (data: TData) => TDerivedResult,
  action: (derivedResult: TDerivedResult, value: object, identifier: Identifier) => void,
  compare: EqualityComparer<TDerivedResult> = Object.is
): TData {
  const state: TData = createSimpleObserver(data, (value, childIdentifier) =>
    action(deriveFn(state), value, childIdentifier)
  );
  derive(() => deriveFn(state), compare);
  configure(state, { select: false });
  return state;
}

type EqualityComparer<T> = (a: T, b: T) => boolean;

interface Derivative {
  lastValue?: any;
  deriveFn: () => any;
  isEqual?: EqualityComparer<any>;
}

let activeDerivative: Derivative | undefined;

export function derive<TDeriveResult>(
  deriveFn: () => TDeriveResult,
  isEqual?: EqualityComparer<TDeriveResult>
): TDeriveResult {
  if (activeDerivative) return deriveFn();
  activeDerivative = { deriveFn: deriveFn, isEqual };
  const value = (activeDerivative.lastValue = deriveFn());
  activeDerivative = undefined;
  return value;
}

interface KeckConfiguration {
  /**
   * When true, any accessed properties will create observations on those properties.
   * Default is true.
   */
  select: boolean;

  /**
   * Indicates whether to clone ancestor values when a child value is modified. Default is false.
   */
  clone: boolean;

  /**
   * Indicates whether accessing intermediate properties should create an observation.
   * Default is false.
   */
  intermediates: boolean;

  /**
   * Indicates whether the observer callback should be called on modifications to selected properties.
   * Default is true.
   */
  enabled: boolean;
}

const defaultConfig = (): KeckConfiguration => ({
  select: true,
  clone: false,
  intermediates: false,
  enabled: true,
});

export function configure(observable: object, options: Partial<KeckConfiguration>) {
  const ctx = contextForObservable.get(observable);
  if (!ctx || ctx?.observer.rootContext !== ctx)
    throw new Error(`Cannot configure non-observable ${observable}`);
  Object.assign(ctx.observer.config, options);
}

export function reset(observable: object) {
  const ctx = contextForObservable.get(observable);
  if (!ctx || ctx?.observer.rootContext !== ctx)
    throw new Error(`Cannot reset non-observable ${observable}`);
  ctx.observer.reset();
}

function getObservableContext(observable: unknown) {
  const ctx = contextForObservable.get(observable as Observable);
  if (!ctx) return null;

  if (ctx.sharedNode && !ctx.sharedNode.validContexts.has(ctx))
    throw new Error(`You are using a stale reference to an observable value.`);

  return ctx;
}

/**
 * "Unwraps" a value to give you the original object instead of the observable proxy. If `observable` is
 * not actually an observable, it will simply be returned as-is.
 */
export function unwrap<T>(observable: T): T {
  const ctx = getObservableContext(observable);
  return ctx ? (ctx.sharedNode.value as T) : observable;
}

/**
 * Creates an observation on an intermediate property.
 */
export function observe<T>(observable: T): T {
  const ctx = getObservableContext(observable);
  if (!ctx) return observable;

  // Unwrapping can only create an observation in select mode
  if (ctx.observer.config.select) {
    (ctx.parent || ctx).observeIdentifier(ctx.sharedNode.identifier, ctx.value, true);
  }
  return ctx.sharedNode.value as T;
}
