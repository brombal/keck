type DeriveFn<T> = () => T;
type DeriveEqualFn<T> = (prevResult: T, nextResult: T) => boolean;
declare function derive<T>(fn: DeriveFn<T>, isEqual?: DeriveEqualFn<T>): T;

/**
 * The public interface to an ObservableContext that is made available to Observable factories.
 */
interface FactoryObservableContext<TValue extends object> {
    value: TValue;
    observeIdentifier<TValue = unknown>(identifier: any, childValue: TValue): TValue;
    observeIdentifier(identifier: any): void;
    modifyIdentifier(identifier: any): void;
}

declare function atomic<T>(fn: (...args: unknown[]) => unknown, args?: unknown[], thisArg?: unknown): T;
declare function atomic<T, TArgs extends unknown[]>(fn: (...args: TArgs) => T, args: TArgs, thisArg?: unknown): T;

declare function deep<T extends object>(observable: T): T;

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

declare function focus(observable: any, enableFocus?: boolean): void;

type ObserverDeriveFn<TValue, TDerived> = (state: TValue) => TDerived;
declare function observe<TValue extends object, TDerive>(value: TValue, cb?: () => void, deriveFn?: ObserverDeriveFn<TValue, TDerive>, isEqual?: DeriveEqualFn<TDerive>): TValue;

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
 * Returns the original object of an observable wrapper. If `observable` is
 * not actually an observable, the value will be returned as-is.
 */
declare function unwrap<T>(observable: T, deepObserve?: boolean): T;

/**
 * Compares two objects for shallow equality. This is provided as a convenience utility for the k.derive()
 * method.
 *
 * @param a The value to compare
 * @param b The value to compare against
 */
declare function shallowCompare<T>(a: T, b: T): boolean;

type AnyConstructor = new (...args: any[]) => any;

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

/**
 * Recursively transforms `target` into the shape of `source`, in place.
 *
 * - Both `target` and `source` must be arrays or plain objects;
 *   otherwise `source` is returned.
 * - If both `target` and `source` have the same structure type (array <-> array,
 *   object <-> object), then we recurse.
 * - Any mismatch in structure means we directly replace the `target` value with
 *   the `source` value.
 * - Any primitive or "complex object" (Date, Set, Map, etc.) in `source`
 *   directly replaces the value in `target`.
 * - Any properties in `target` not in `source` are deleted.
 *
 * @param target The object/array to transform *in-place*.
 * @param source The source object/array to match shape.
 * @returns The same `target` reference, now transformed to match `source`.
 * @throws If top-level `target` or `source` is not an array or plain object.
 */
declare function transformInPlace<TSource>(target: unknown, source: TSource): TSource;

export { type DeriveEqualFn, type DeriveFn, atomic, deep, derive, disable, enable, focus, isRef, observe, peek, ref, registerObservableClass, reset, shallowCompare, silent, transformInPlace, unwrap };
