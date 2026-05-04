import { RefObject } from 'react';
import { ObserverCallbackContext, DeriveEqualFn } from 'keck';

/**
 * Creates a "ref" object compatible with React refs. You can use this within a Keck observable to store DOM elements.
 *
 * e.g.
 *
 * ```ts
 * const state = useObserver({
 *   myElementRef: reactRef<HTMLElement>(),
 * });
 *
 * <div ref={state.myElementRef}>
 * ```
 *
 * access it by using the ref's `.current` property:
 *
 * ```
 * const el = state.myElementRef.current;
 * ```
 */
declare function reactRef<T>(): RefObject<T>;

/**
 * Creates an observable for `data` that re-renders the component when its observed properties
 * change. Returns an observable object that you can read during the component's render and modify
 * in effects or event handlers.
 *
 * e.g.
 *
 * In your component's render:
 *
 * ```tsx
 * const data = { count: 0 };
 * const state = useObserver(data);
 * ```
 *
 * Render a property:
 *
 * ```tsx
 * return <>{state.count}</>;
 * ```
 *
 * Modify a property (e.g. in an effect or event callback):
 *
 * ```tsx
 * <button onClick={() => state.count += 1}>Increment</button>
 * ```
 *
 * @param data The data to observe. This can be a plain object or an existing observable proxy.
 * @param deps Optional dependency array to refresh the callback, in case it references values from the component scope.
 */
declare function useObserver<TData extends object>(data: TData, deps?: unknown[]): TData;
/**
 * Registers a callback that is invoked synchronously when any property of the underlying data is
 * modified (through any observable in your app created from the same data object). The callback is
 * only active while the component is mounted.
 *
 * The callback fires inside the proxy's set trap, synchronously with the mutation that triggered
 * it — unlike `useEffect`, which runs after React commits and may coalesce intermediate states.
 *
 * The returned state object behaves identically to the single-argument overload: reads during
 * render subscribe the component to re-render when those properties change. The callback is an
 * orthogonal side-effect channel.
 *
 * @param data The data to observe. This can be a plain object or an existing observable proxy.
 * @param cb The callback to invoke when any property changes.
 * @param deps Optional dependency array to refresh the callback, in case it references values from the component scope.
 */
declare function useObserver<TData extends object>(data: TData, cb: (context: ObserverCallbackContext) => void, deps?: unknown[]): TData;
/**
 * Registers a callback that is invoked synchronously when the result of `config.derive` changes.
 * The callback is only active while the component is mounted.
 *
 * The callback fires inside the proxy's set trap, synchronously with the mutation that triggered
 * it — unlike `useEffect`, which runs after React commits and may coalesce intermediate states.
 *
 * The returned state object behaves identically to the single-argument overload: reads during
 * render subscribe the component to re-render when those properties change. The derived callback
 * is an orthogonal side-effect channel.
 *
 * @param data The data to observe. This can be a plain object or an existing observable proxy.
 * @param config.derive A function that derives a value from the observed data.
 * @param config.onChange The callback to invoke when the derived value changes.
 * @param config.isEqual Optional equality function. Defaults to strict equality.
 * @param deps Optional dependency array to recreate the observer when dependencies change.
 */
declare function useObserver<TData extends object, TDerived>(data: TData, config: {
    derive: (state: TData) => TDerived;
    onChange: (derived: TDerived, context: ObserverCallbackContext) => void;
    isEqual?: DeriveEqualFn<TDerived>;
}, deps?: unknown[]): TData;

export { reactRef, useObserver };
