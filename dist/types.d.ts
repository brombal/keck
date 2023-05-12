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
    observersForChild: Map<Identifier, Set<Observer<object>>>;
    allContexts: WeakSet<ObservableContext<object>>;
}
interface Observer<T extends object> {
    isObserving: boolean;
    observeIntermediates: boolean;
    callback: Callback | undefined;
    disposers: Set<() => void>;
    contextForNode: WeakMap<DataNode, ObservableContext<object>>;
    actions: ObserverActions;
}
declare const rootIdentifier: unique symbol;
type Identifier = unknown | typeof rootIdentifier;
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
    observeIdentifier<T = unknown>(identifier: Identifier, childValue?: T, observeIntermediate?: boolean): T;
    modifyIdentifier(childIdentifier: Identifier): void;
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
export interface ObserverActions {
    /**
     * Begins listening to property access. This is called automatically when the observer is created,
     * but may be called again to re-enable the observer after it has been disabled.
     */
    start(observeIntermediates?: boolean): void;
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
type ObserveResponse<TData> = [TData, ObserverActions];
export function observe<TData extends object>(value: TData, cb: Callback): ObserveResponse<TData>;
export function observe<TData extends object, TSelectorResult>(data: TData, selector: (data: TData) => TSelectorResult, action: (selectorResult: TSelectorResult, value: TData) => void, compare?: (a: TSelectorResult, b: TSelectorResult) => boolean): ObserveResponse<TData>;
/**
 * "Unwraps" a value to give you the original object instead of the observable proxy or subclass. If `observable` is
 * not actually an observable, it will simply be returned as-is.
 */
export function unwrap<T>(observable: T, observe?: boolean): T;
/**
 * Gets the ObserverActions for an observable. If `observable` is not actually an observable, it will return `undefined`.
 */
export function observerActions(observable: any): ObserverActions | undefined;
export const objectAndArrayObservableFactory: ObservableFactory<Record<string | symbol, unknown>, string | symbol>;
export function useObserver<TData extends object>(data: TData): TData;
export function useObserveSelector<TData extends object, TSelectorResult>(data: TData, selector: (state: TData) => TSelectorResult, action?: (result: TSelectorResult) => void): [TSelectorResult, TData];

//# sourceMappingURL=types.d.ts.map
