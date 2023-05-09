interface SharedRef {
    identifier: Identifier;
    value: object;
    factory: ObservableFactory;
    parent: SharedRef | undefined;
    children: Map<Identifier, SharedRef>;
    observersForId: Map<Identifier, Set<Observer>>;
    contextForObserver: Map<Observer, ObservableContext>;
}
interface Observer {
    isObserving: boolean;
    callback: Callback | undefined;
    disposers: Set<() => void>;
}
declare const rootIdentifier: unique symbol;
type Identifier = unknown | typeof rootIdentifier;
export interface ObservableContext<TValue = any, TMeta = any> {
    readonly value: TValue;
    observeIdentifier<T = unknown>(identifier: Identifier, childValue?: T, observeIntermediate?: boolean): T;
    modifyIdentifier(childIdentifier: Identifier): void;
}
export interface ObservableContext<TValue = any, TMeta = any> extends ObservableContext<TValue, TMeta> {
    sharedRef: SharedRef;
    observer: Observer;
    readonly observable: Observable;
    invalidateObservable(): void;
}
type Observable = {
    [getContext](): ObservableContext;
};
type Callback = (value: any, identifier: any) => void;
/**
 * The set of supported observable factories. Implement an `ObservableFactory` and add it to this map to add support
 * for custom classes.
 */
export const observableFactories: Map<new (...args: any[]) => any, ObservableFactory<any, any>>;
declare const getContext: unique symbol;
/**
 * This interface is used to create observable objects. To create an observable for a class, implement this interface
 * and add it to `observableFactories` using the class as the key.
 */
interface ObservableFactory<TValue = unknown, TIdentifier = unknown> {
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
export function createObserver<T extends object>(data: T, callback: Callback): {
    store: T;
    observe(): void;
    unobserve(): void;
    reset(): void;
    disable(): void;
    enable(): void;
};
export function unwrap<T>(observable: T, observe?: boolean): T;
export const objectAndArrayObservableFactory: ObservableFactory<Record<string | symbol, unknown>, string | symbol>;
export function useObservable<T extends object>(data: T): {
    store: T;
    observe: () => void;
    unobserve: () => void;
};

//# sourceMappingURL=types.d.ts.map
