export function ref<T extends object>(value: T): T;
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
    validContexts: WeakSet<ObservableContext<object>>;
}
interface Observer<T extends object> {
    config: KeckConfiguration;
    callback: Callback | undefined;
    disposers: Set<() => void>;
    contextForNode: WeakMap<DataNode, ObservableContext<object>>;
}
declare const rootIdentifier: unique symbol;
type Identifier = unknown | typeof rootIdentifier;
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
    observeIdentifier<T = unknown>(identifier: Identifier, childValue?: T, observeIntermediate?: boolean): T;
    modifyIdentifier(childIdentifier: Identifier, source?: [DataNode, Identifier]): void;
}
type Observable = object;
type Callback = (value: object, identifier: Identifier) => void;
/**
 * The map of object prototypes to their observable factories. Implement an `ObservableFactory` and
 * add it to this map to add support for custom classes.
 */
export const observableFactories: Map<new (...args: any[]) => any, ObservableFactory<any, any>>;
/**
 * This interface is used to create observable objects. To create an observable for a class,
 * implement this interface and add it to `observableFactories` using the class as the key.
 */
interface ObservableFactory<TValue extends object, TIdentifier = unknown> {
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
export function observe<TData extends object>(value: TData, cb: Callback): TData;
export function observe<TData extends object, TSelectorResult>(data: TData, selectorFn: (data: TData) => TSelectorResult, action: (selectedValue: TSelectorResult, value: TData, identifier: Identifier) => void, compare?: EqualityComparer<TSelectorResult>): TData;
type EqualityComparer<T> = (a: T, b: T) => boolean;
interface Selector {
    lastValue?: any;
    selectorFn: () => any;
    isEqual?: EqualityComparer<any>;
}
export function select<TSelectorResult>(selectorFn: () => TSelectorResult, isEqual?: EqualityComparer<TSelectorResult>): TSelectorResult;
interface KeckConfiguration {
    observe: boolean;
    clone: boolean;
    intermediates: boolean;
    enabled: boolean;
}
export function configure(observable: object, options: Partial<KeckConfiguration>): void;
export function reset(observable: object): void;
/**
 * "Unwraps" a value to give you the original object instead of the observable proxy or subclass. If `observable` is
 * not actually an observable, it will simply be returned as-is.
 */
export function unwrap<T>(observable: T, observe?: boolean): T;
export const objectAndArrayObservableFactory: ObservableFactory<Record<string | symbol, unknown>, string | symbol>;
export function useObserver<TData extends object>(data: TData): TData;
export function useObserveSelector<TData extends object, TSelectorResult>(data: TData, selector: (state: TData) => TSelectorResult, action?: (result: TSelectorResult) => void): [TSelectorResult, TData];

//# sourceMappingURL=types.d.ts.map
