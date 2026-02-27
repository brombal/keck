import { RefObject } from 'react';

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
 * return <>{state.count}<>;
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
 * Registers a callback that is invoked when any properties of the observer are modified. The
 * callback will be invoked on changes to ANY observable throughout your app created from the same
 * data object. The callback will only be active while the component is mounted.
 *
 * > Note: DO NOT use the returned state object in the component's render, as changes to its
 * > properties will not trigger re-renders. However, you may read and modify properties in effects
 * > or event handlers.
 *
 * e.g.
 *
 * In your component's render:
 *
 * ```tsx
 * const state = useObserver(
 *   { count: 0 },
 *   () => console.log('data changed')
 * );
 * ```
 *
 * Modify a property (e.g. in an effect or event callback):
 *
 * ```tsx
 * <button onClick={() => state.count += 1}>Increment</button>
 * ```
 *
 * @param data The data to observe. This can be a plain object or an existing observable proxy.
 * @param cb The callback to invoke when the derived value changes.
 * @param deps Optional dependency array to refresh the callback, in case it references values from the component scope.
 */
declare function useObserver<TData extends object>(data: TData, cb: () => void, deps?: unknown[]): TData;
/**
 * Registers a callback that is invoked when the result of the derive function changes. The callback
 * will be invoked on changes to ANY observable throughout your app created from the same data
 * object (if they affect the derived value). The callback will only be active while the component
 * is mounted.
 *
 * > Note: DO NOT use the returned state object in the component's render, as changes to its properties will not trigger re-renders.
 * > However, you may read and modify properties in effects or event handlers.
 *
 * e.g.
 *
 * In your component's render:
 *
 * ```tsx
 * const state = useObserver(
 *   { count: 0 },
 *   (state) => state.count % 2 === 0,
 *   (isEven) => console.log('is count even:', isEven, state.count)
 * );
 * ```
 *
 * Modify a property (e.g. in an effect or event callback):
 *
 * ```tsx
 * <button onClick={() => state.count += 1}>Increment</button>
 * ```
 *
 * @param data The data to observe. This can be a plain object or an existing observable proxy.
 * @param deriveFn A function that derives a value from the observed data. The function receives the observable
 *   proxy of `data`, from which you can derive a value.
 * @param cb The callback to invoke when the derived value changes.
 * @param deps Optional dependency array to refresh the callback, in case it references values from the component scope.
 */
declare function useObserver<TData extends object, TDerived>(data: TData, deriveFn: (data: TData) => TDerived, cb: (derived: TDerived) => void, deps?: unknown[]): TData;

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

export { reactRef, useObserver };
