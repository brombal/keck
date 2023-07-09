/**
 * This interface is used to create observable objects. To create an observable for a class,
 * implement this interface and add it to `observableFactories` using the class as the key.
 */
interface ObservableFactory<TValue extends object, TIdentifier = unknown> {
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
export const observableFactories: Map<new (...args: any[]) => any, ObservableFactory<any, any>>;
export function ref<T>(value: T): T;
declare const rootIdentifier: unique symbol;
type Identifier = unknown | typeof rootIdentifier;
/**
 * An Observable is an object that stands in place of another value and can be observed for changes.
 * It is a Proxy or other custom object that wraps the original object and forwards all operations to it,
 * and is produced by an ObservableFactory registered with `observableFactories`.
 * Internally, we don't know the type, but it must always be an object. To the user, the type is always the same
 * as the object that it represents.
 */
type Observable = object;
type Callback = (value: object, identifier: Identifier) => void;
/**
 * Represents a node in an observable tree. Nodes are shared by all Observers of the same object.
 * Although a SharedNode is associated with a user object, it would be more accurate to say that
 * a SharedNode represents whatever is associated with a particular child identifier on an object
 * (i.e. when `a.b = someNewValue` happens, the same SharedNode now represents `someNewValue`).
 */
declare class SharedNode {
    parent: SharedNode | undefined;
    identifier: Identifier;
    value: object;
    children: Map<unknown, SharedNode>;
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
    readonly observersForChild: Map<unknown, Map<Observer, Set<Derivative>>>;
    /**
     * Used to determine whether an ObserverNode for this SharedNode is still valid.
     */
    validContexts: WeakSet<ObservableContext<object>>;
    constructor(parent: SharedNode | undefined, identifier: Identifier, value: object);
    factory(): import("/src/observableFactories").ObservableFactory<any, any>;
}
/**
 * An Observer represents a callback that is called when a change occurs to the selected properties of its value.
 */
declare class Observer {
    callback: Callback | undefined;
    readonly disposers: Set<() => void>;
    config: KeckConfiguration;
    rootContext: ObservableContext;
    contexts: WeakMap<SharedNode, ObservableContext<object>>;
    constructor(value: object, callback: Callback | undefined, sharedNode: SharedNode | undefined);
    reset(): void;
}
/**
 * An ObserverNode is a wrapper object that contains an observable and additional information about it.
 * Since an Observable is just a proxy for a user value, and has an unknown opaque type, additional data about it
 * is stored in this wrapper object. Every Observer has an ObserverNode object for each SharedNode that it
 * observes.
 */
export class ObservableContext<T extends object = object> {
    observer: Observer;
    observable: Observable;
    sharedNode: SharedNode;
    constructor(observer: Observer, value: T, parent: ObservableContext | undefined, identifier: Identifier, sharedNode: SharedNode | undefined);
    get value(): T;
    createObservation(identifier: Identifier): void;
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
    observeIdentifier<T = unknown>(identifier: Identifier, childValue: T, observeIntermediate?: boolean): T;
    modifyIdentifier(childIdentifier: Identifier, value?: unknown, source?: [SharedNode, Identifier]): void;
    get parent(): ObservableContext<object> | undefined;
}
export function createObserver<TData extends object>(value: TData, cb: Callback): TData;
export function createObserver<TData extends object, TDerivedResult>(data: TData, deriveFn: (data: TData) => TDerivedResult, action: (derivedValue: TDerivedResult, value: TData, identifier: Identifier) => void, compare?: EqualityComparer<TDerivedResult>): TData;
type EqualityComparer<T> = (a: T, b: T) => boolean;
interface Derivative {
    lastValue?: any;
    deriveFn: () => any;
    isEqual?: EqualityComparer<any>;
}
export function derive<TDeriveResult>(deriveFn: () => TDeriveResult, isEqual?: EqualityComparer<TDeriveResult>): TDeriveResult;
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
export function configure(observable: object, options: Partial<KeckConfiguration>): void;
export function reset(observable: object): void;
/**
 * "Unwraps" a value to give you the original object instead of the observable proxy. If `observable` is
 * not actually an observable, it will simply be returned as-is.
 */
export function unwrap<T>(observable: T): T;
/**
 * Creates an observation on an intermediate property.
 */
export function observe<T>(observable: T): T;
export const objectFactory: ObservableFactory<Record<string | symbol, unknown>, string | symbol>;
export function useObserver<TData extends object>(data: TData): TData;
export function useObserveSelector<TData extends object, TSelectorResult>(data: TData, selector: (state: TData) => TSelectorResult, action?: (result: TSelectorResult) => void): [TSelectorResult, TData];

//# sourceMappingURL=types.d.ts.map
