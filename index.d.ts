type DeriveFn<T> = () => T;
type DeriveEqualFn<T> = (prevResult: T, nextResult: T) => boolean;
declare function derive<T>(fn: DeriveFn<T>, isEqual?: DeriveEqualFn<T>): T;

interface ObserverCallbackContext {
    sourceName?: string;
    actionName?: string;
}

/**
 * The public interface to an ObservableContext that is made available to Observable factories.
 */
interface FactoryObservableContext<TValue extends object> {
    value: TValue;
    observeIdentifier<TValue = unknown>(identifier: any, childValue: TValue): TValue;
    observeIdentifier(identifier: any): void;
    modifyIdentifier(identifier: any): void;
}

type KeckConfig = {
    onError?: (error: unknown) => void;
};
declare function configure(options: Partial<KeckConfig>): void;
declare function resetConfiguration(): void;

type AnyConstructor = Function;

/**
 * This interface is used to create observable objects. To create an observable for a class,
 * implement this interface and add it to `observableFactories` using the class as the key.
 */
interface ObservableFactory<TValue extends object> {
    /**
     * Must return an observable wrapper around the given value.
     */
    makeObservable: (observableNode: FactoryObservableContext<TValue>) => TValue;
}

/**
 * Registers a class that can be observed. You can provide a custom factory that produces observable
 * instances of the class. If no factory is provided, the default object factory will be used.
 * @param classConstructor The class to register.
 * @param factory The factory to use to create observable instances of the class.
 */
declare function registerObservableClass(classConstructor: AnyConstructor, factory?: ObservableFactory<any>): void;

declare function atomic<TReturn, TArgs extends unknown[]>(name: string, fn: (...args: TArgs) => TReturn, args?: TArgs, thisArg?: unknown): TReturn;
declare function atomic<TReturn, TArgs extends unknown[]>(fn: (...args: TArgs) => TReturn, args?: TArgs, thisArg?: unknown): TReturn;

/**
 * Ensures that any changes to deep properties within the given value (which should be an observable type) will trigger
 * its observer's callback (in React, this ensures that the component is re-rendered on deep property changes).
 *
 * If `observable` is not an observable type (e.g. a primitive or null), it will be returned as-is. If `observer`
 * is an observable type, but is not an observable proxy, an error will be thrown.
 *
 * This only applies when the observable is focused (in unfocused mode, all changes trigger the callback). In React,
 * observers are always focused.
 *
 * e.g.
 * ```ts
 * const state = observe({ object1: { value1: 'value1' } }, callback);
 * deep(state.object1);
 * state.object1.value1 = 'new-value1';
 * // callback will be triggered
 * ```
 */
declare function deep<T>(observable: T): T;

interface DevToolsOptions {
    name?: string;
}
declare function connectDevTools<T extends object>(store: T, options?: DevToolsOptions): () => void;

/**
 * Disables an observer, preventing it from triggering its callback when its
 * observed properties are modified.
 * @param observable The observable to disable.
 */
declare function disable(observable: object): void;
/**
 * Enables an observer, allowing it to trigger its callback when its observed
 * properties are modified.
 * @param observable The observable to enable.
 */
declare function enable(observable: object): void;

interface FocusTransaction {
    commit: () => void;
    discard: () => void;
}
/**
 * Begins a focus session on a focusable observable. Returns `{ commit, discard }` that are
 * idempotent and close over their own pending observation Set.
 *
 * During the session, property reads on the observable are recorded. On `commit()`, those
 * observations become active and will trigger the observer's callback when modified. On
 * `discard()`, the session is abandoned and prior observations are restored.
 *
 * Writes made by *other* observers during the session to properties the session (or, for
 * discard, a prior committed session) has observed are not lost: they are recorded as stale and
 * the observer's callback is triggered when the session settles.
 *
 * A microtask is queued to auto-discard if neither `commit` nor `discard` is called before
 * the end of the current event cycle — covering abandoned renders (Suspense, concurrent
 * bail-outs) without requiring the caller to handle cleanup explicitly.
 *
 * If a prior session for the same observer is still active when this is called, it is
 * discarded before the new session begins.
 *
 * Throws if called on a non-focusable observer.
 */
declare function focus(observable: object): FocusTransaction;

type NamedConfig = {
    name: string;
};
type DeriveConfig<TValue, TDerived> = {
    name?: string;
    derive: (state: TValue) => TDerived;
    onChange: (derived: TDerived, context: ObserverCallbackContext) => void;
    isEqual?: DeriveEqualFn<TDerived>;
};
type FocusableConfig = {
    name?: string;
    focusable: true;
    onChange: (context: ObserverCallbackContext) => void;
};
declare function observe<TValue extends object>(value: TValue, cb?: (context: ObserverCallbackContext) => void): TValue;
declare function observe<TValue extends object>(value: TValue, config: NamedConfig): TValue;
declare function observe<TValue extends object>(value: TValue, config: FocusableConfig): TValue;
declare function observe<TValue extends object, TDerived>(value: TValue, config: DeriveConfig<TValue, TDerived>): TValue;

declare function peek<T>(fn: () => T): T;

declare function ref<T>(value: T): T;
declare function isRef(value: any): boolean;

declare function reset(observable: any): void;

/**
 * Use `silent` to execute a block of code without triggering any observer callbacks when modifications are made.
 * @param callback The block of code to execute.
 */
declare function silent(callback: () => void): void;

/**
 * Releases the callback registered for the given observable proxy, stopping future invocations.
 * The proxy itself remains valid for reads and writes.
 *
 * Must be called to clean up any observer created with a callback (via `observe(value, cb)` or
 * `observe(value, { focusable, onChange })`) when it is no longer needed, since those observers
 * are held strongly by the library and will not be garbage collected on their own.
 */
declare function unobserve(state: object): void;

/**
 * Returns the original object of an observable wrapper. If `observable` is
 * not actually an observable, the value will be returned as-is.
 */
declare function unwrap<T>(observable: T): T;

declare const fromSnapshot: unique symbol;

declare function initGarbageCollectionObservation(cb: (heldValue: any) => void): () => void;

/**
 * Compares two objects for shallow equality. This is provided as a convenience utility for `derive()`.
 *
 * @param a The value to compare
 * @param b The value to compare against
 */
declare function shallowCompare<T>(a: T, b: T): boolean;

declare function transformInPlace<TSource>(target: unknown, source: TSource): TSource;

export { atomic, configure, connectDevTools, deep, derive, disable, enable, focus, fromSnapshot, initGarbageCollectionObservation, isRef, observe, peek, ref, registerObservableClass, reset, resetConfiguration, shallowCompare, silent, transformInPlace, unobserve, unwrap };
export type { DeriveEqualFn, DeriveFn, DevToolsOptions, FocusTransaction, ObserverCallbackContext };
